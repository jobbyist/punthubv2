-- PFIE safe cron throughput (22 Nov 2026).
-- A standings refresh can require five Parallel Extract calls and up to ten bounded Gemini calls.
-- Keep one competition per HTTP request to avoid the 55-second pg_net timeout.
-- Supabase Postgres cron runs in UTC; these windows are 04:10-05:55 and 16:10-17:55 SAST.

select cron.unschedule(jobid)
from cron.job
where jobname in (
  'sync-tables',
  'sync-tables-late',
  'sync-tables-evening',
  'sync-tables-evening-late'
);

select cron.schedule(
  'sync-tables',
  '10,15,20,25,30,35,40,45,50,55 2 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);

select cron.schedule(
  'sync-tables-late',
  '0,5,10,15,20,25,30,35,40,45,50,55 3 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);

select cron.schedule(
  'sync-tables-evening',
  '10,15,20,25,30,35,40,45,50,55 14 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);

select cron.schedule(
  'sync-tables-evening-late',
  '0,5,10,15,20,25,30,35,40,45,50,55 15 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);
