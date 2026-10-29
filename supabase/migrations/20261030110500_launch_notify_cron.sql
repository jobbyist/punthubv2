-- Run every 10 minutes from 06:00 to 08:50 UTC (08:00 to 10:50 in Johannesburg) so a large wave that does not
-- finish in one call carries on. The route returns straight away unless today is a wave date, and every send
-- is logged, so repeated calls never email anyone twice.
select cron.schedule('launch-notify', '*/10 6-8 * * *', $$select public.invoke_cron('/api/cron/launch-notify')$$);

-- A failed send is retried at most once an hour, so a bad address is not hammered.
create or replace function public.launch_recipients(p_wave integer)
returns table (recipient_email text, recipient_name text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select lower(e.email), e.name
  from public.early_access e
  where (p_wave = 1 or e.marketing_consent)
    and not exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(e.email)
    )
    and not exists (select 1 from public.waitlist_unsubscribes w where w.email = lower(e.email))
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(e.email))
    and not exists (
      select 1 from public.launch_email_sends s
      where s.email = lower(e.email) and s.wave = p_wave
        and (s.status = 'sent' or s.sent_at > now() - interval '1 hour')
    );
$$;
