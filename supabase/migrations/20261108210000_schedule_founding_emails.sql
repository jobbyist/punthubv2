-- Schedules the rewritten Founding Member emails to start on 9 Nov 2026, after Resend's daily quota resets
-- (23:59:59 UTC, i.e. 01:59 SAST). Resend's free plan allows 100 emails a day, so each run sends at most 45.
-- Nothing is sent unless LAUNCH_EMAILS_ENABLED=true in Vercel. Each address gets each campaign once, so daily
-- repeat runs only pick up whoever is left. Idempotent.
--
--   Annual Pass offer  09:00 SAST (07:00 UTC) daily 9 to 15 Nov (offer closes 16 Nov)
--   Founding survey    14:00 SAST (12:00 UTC) daily 9 to 11 Nov
select cron.unschedule('founding-campaign-pass') where exists (select 1 from cron.job where jobname = 'founding-campaign-pass');
select cron.schedule('founding-campaign-pass', '0 7 9-15 11 *', $$select public.invoke_cron('/api/cron/founding-campaign?limit=45')$$);

select cron.unschedule('founding-survey') where exists (select 1 from cron.job where jobname = 'founding-survey');
select cron.schedule('founding-survey', '0 12 9-11 11 *', $$select public.invoke_cron('/api/cron/founding-sequence?campaign=founding-survey-1&limit=45')$$);
