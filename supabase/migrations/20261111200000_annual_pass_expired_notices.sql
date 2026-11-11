-- Annual Pass: one notice, after an unpaid 48-hour hold has expired and the place has been released.
-- Transactional email about a reservation the member made themselves (no marketing consent needed), sent once per
-- expired hold (a fresh reservation that also lapses gets its own notice). Waits one hour after expiry so a payment
-- that is still being confirmed by PayFast is not mistaken for a lapse. The ledger is founding_campaign_sends with the
-- campaign id 'annual-pass-expired-<hold expiry as unix seconds>'.

create or replace function public.annual_pass_expired_recipients(p_grace interval default interval '1 hour')
returns table (user_id uuid, recipient_email text, recipient_name text, hold_expires_at timestamptz, campaign text)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  select c.user_id,
         lower(u.email),
         coalesce(nullif(p.display_name, ''), p.username),
         c.hold_expires_at,
         'annual-pass-expired-' || extract(epoch from c.hold_expires_at)::bigint
  from public.annual_pass_claims c
  join auth.users u on u.id = c.user_id
  join public.profiles p on p.id = c.user_id
  where c.status = 'pending'
    and c.hold_expires_at <= now() - p_grace
    and u.email is not null
    and u.email_confirmed_at is not null
    and p.role <> 'admin'
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(u.email))
    and not exists (
      select 1 from public.founding_campaign_sends s
      where s.email = lower(u.email)
        and s.campaign = 'annual-pass-expired-' || extract(epoch from c.hold_expires_at)::bigint
        and s.status = 'sent'
    );
$$;
revoke all on function public.annual_pass_expired_recipients(interval) from public, anon, authenticated;
grant execute on function public.annual_pass_expired_recipients(interval) to service_role;

-- Every 30 minutes at :15 and :45 between 07:00 and 19:59 SAST (05:00-17:59 UTC), offset from the reminder job so the
-- two never run in the same minute. Idempotent.
select cron.unschedule('annual-pass-expired') where exists (select 1 from cron.job where jobname = 'annual-pass-expired');
select cron.schedule('annual-pass-expired', '15,45 5-17 * * *', $$select public.invoke_cron('/api/cron/annual-pass-expired')$$);
