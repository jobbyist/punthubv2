-- Annual Pass: one reminder, before an unpaid 48-hour hold lapses.
-- Transactional email about a reservation the member made themselves (no marketing consent needed), sent once per
-- hold (a fresh reservation after an expiry gets its own reminder). The ledger is founding_campaign_sends with the
-- campaign id 'annual-pass-reminder-<hold expiry as unix seconds>'.

create or replace function public.annual_pass_reminder_recipients(p_within interval default interval '24 hours')
returns table (user_id uuid, recipient_email text, recipient_name text, hold_expires_at timestamptz, campaign text)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select c.user_id,
         lower(u.email),
         coalesce(nullif(p.display_name, ''), p.username),
         c.hold_expires_at,
         'annual-pass-reminder-' || extract(epoch from c.hold_expires_at)::bigint
  from public.annual_pass_claims c
  join auth.users u on u.id = c.user_id
  join public.profiles p on p.id = c.user_id
  where c.status = 'pending'
    and c.hold_expires_at > now()
    and c.hold_expires_at <= now() + p_within
    and u.email is not null
    and u.email_confirmed_at is not null
    and p.role <> 'admin'
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(u.email))
    and not exists (
      select 1 from public.founding_campaign_sends s
      where s.email = lower(u.email)
        and s.campaign = 'annual-pass-reminder-' || extract(epoch from c.hold_expires_at)::bigint
        and s.status = 'sent'
    );
$$;
revoke all on function public.annual_pass_reminder_recipients(interval) from public, anon, authenticated;
grant execute on function public.annual_pass_reminder_recipients(interval) to service_role;

-- Every 30 minutes between 07:00 and 19:59 SAST (05:00-17:59 UTC), so nobody is emailed in the middle of the night.
-- Idempotent.
select cron.unschedule('annual-pass-reminder') where exists (select 1 from cron.job where jobname = 'annual-pass-reminder');
select cron.schedule('annual-pass-reminder', '*/30 5-17 * * *', $$select public.invoke_cron('/api/cron/annual-pass-reminder')$$);
