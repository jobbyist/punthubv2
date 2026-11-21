-- PFIE live standings refresh windows (22 Nov 2026).
-- Reconfigure the morning window to process three jobs per invocation, then add a second daily window so priority
-- leagues refresh every 12 hours and all other configured tables refresh daily.
select cron.unschedule('sync-tables')
where exists (select 1 from cron.job where jobname = 'sync-tables');
select cron.schedule(
  'sync-tables',
  '10,20,30,40,50 2 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=3')$$
);

select cron.unschedule('sync-tables-late')
where exists (select 1 from cron.job where jobname = 'sync-tables-late');
select cron.schedule(
  'sync-tables-late',
  '0,10,20,30,40,50 3 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=3')$$
);

select cron.unschedule('sync-tables-evening')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening');
select cron.schedule(
  'sync-tables-evening',
  '10,20,30,40,50 14 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=3')$$
);

select cron.unschedule('sync-tables-evening-late')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening-late');
select cron.schedule(
  'sync-tables-evening-late',
  '0,10,20,30,40,50 15 * * *',
  $select public.invoke_cron('/api/cron/sync-tables?job=standings&max=3')$
);
