-- Process one standings competition per HTTP request to avoid 55-second route timeouts.
-- Cron uses GMT; these windows are 04:00-05:50 and 16:00-17:50 SAST.
select cron.schedule(
  'sync-tables',
  '0,10,20,30,40,50 2 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);
select cron.schedule(
  'sync-tables-late',
  '0,10,20,30,40,50 3 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);
select cron.schedule(
  'sync-tables-evening',
  '0,10,20,30,40,50 14 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);
select cron.schedule(
  'sync-tables-evening-late',
  '0,10,20,30,40,50 15 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);
