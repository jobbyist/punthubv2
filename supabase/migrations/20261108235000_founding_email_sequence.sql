-- Founding Member email sequence, 9 to 14 Nov 2026 (SAST). Every address gets each email once (send ledgers), and
-- every job is capped, so repeat runs only pick up whoever is left. Nothing sends unless LAUNCH_EMAILS_ENABLED=true.
--
--   Welcome       08:00-19:59 daily, every 10 min (new members and anyone who has not had one yet)
--   Mon  9 Nov    09:00  claim your number (early-access sign-ups with no account yet)
--   Tue 10 Nov    09:00  Annual Pass offer, daily to 15 Nov (offer closes 16 Nov)
--   Wed 11 Nov    09:00  launch checklist (members)
--   Thu 12 Nov    09:00  referral (members)
--   Fri 13 Nov    14:00  founding survey, links to /feedback (members)
--   Sat 14 Nov    09:00  launch countdown (everyone)
-- Cron runs in UTC; SAST is UTC+2.

-- The welcome used to skip members who signed up before 6 Nov 04:00. Send it to anyone opted in who has not had it.
create or replace function public.founding_welcome_recipients()
returns table(recipient_email text, recipient_name text)
language sql stable security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  select lower(u.email), coalesce(nullif(p.display_name, ''), p.username::text)
  from public.profiles p join auth.users u on u.id = p.id
  where p.role <> 'admin'
    and p.marketing_opt_in
    and u.email is not null
    and not exists (select 1 from public.waitlist_unsubscribes w where w.email = lower(u.email))
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(u.email))
    and not exists (select 1 from public.founding_welcome_sends s where s.email = lower(u.email) and s.status = 'sent');
$$;

select cron.unschedule(jobname) from cron.job
  where jobname in ('founding-welcome', 'founding-campaign-pass', 'founding-survey', 'founding-claim',
                    'founding-checklist', 'founding-referral', 'founding-countdown');

select cron.schedule('founding-welcome', '*/10 6-17 * * *', $$select public.invoke_cron('/api/cron/founding-welcome')$$);
select cron.schedule('founding-claim', '0 7 9 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-claim-1&limit=45')$$);
select cron.schedule('founding-campaign-pass', '0 7 10-15 11 *', $$select public.invoke_cron('/api/cron/founding-campaign?limit=45')$$);
select cron.schedule('founding-checklist', '0 7 11 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-checklist-1&limit=45')$$);
select cron.schedule('founding-referral', '0 7 12 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-referral-1&limit=45')$$);
select cron.schedule('founding-survey', '0 12 13 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-survey-1&limit=45')$$);
select cron.schedule('founding-countdown', '0 7 14 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-countdown-1&limit=45')$$);
