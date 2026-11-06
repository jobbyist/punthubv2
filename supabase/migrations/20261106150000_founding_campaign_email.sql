-- One-off Founding Member campaign email (Annual Pass upsell). Marketing email: consented recipients only,
-- one send per address per campaign, unsubscribes and privacy requests respected.
create table if not exists public.founding_campaign_sends (
  email text not null,
  campaign text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz not null default now(),
  primary key (email, campaign)
);
alter table public.founding_campaign_sends enable row level security;
drop policy if exists founding_campaign_sends_admin on public.founding_campaign_sends;
create policy founding_campaign_sends_admin on public.founding_campaign_sends
  for select to authenticated using (public.is_admin());

create or replace function public.founding_campaign_recipients(p_campaign text)
returns table (recipient_email text, recipient_name text, is_member boolean)
language sql stable security definer set search_path = public, auth, pg_temp as $$
  with c as (
    select lower(u.email) as email, coalesce(nullif(p.display_name, ''), p.username) as name, true as is_member
    from public.profiles p join auth.users u on u.id = p.id
    where p.role <> 'admin' and p.marketing_opt_in
    union
    select lower(e.email), e.name, false
    from public.early_access e
    where e.marketing_consent
      and not exists (select 1 from auth.users u join public.profiles p on p.id = u.id where lower(u.email) = lower(e.email))
  )
  select c.email, c.name, c.is_member from c
  where c.email is not null
    and not exists (select 1 from public.waitlist_unsubscribes w where w.email = c.email)
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = c.email)
    and not exists (select 1 from public.founding_campaign_sends s where s.email = c.email and s.campaign = p_campaign and s.status = 'sent');
$$;
revoke all on function public.founding_campaign_recipients(text) from public, anon, authenticated;
grant execute on function public.founding_campaign_recipients(text) to service_role;

-- 12:00 SAST = 10:00 UTC on 6 Nov 2026, then every 10 minutes until 13:00 SAST to retry failures. Idempotent.
select cron.unschedule('founding-campaign-pass') where exists (select 1 from cron.job where jobname = 'founding-campaign-pass');
select cron.schedule('founding-campaign-pass', '0,10,20,30,40,50 10-10 6 11 *', $$select public.invoke_cron('/api/cron/founding-campaign')$$);
