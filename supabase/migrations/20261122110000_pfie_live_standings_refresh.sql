-- PFIE live standings refresh windows (22 Nov 2026).
-- The morning window already exists. Add a second daily window so priority leagues refresh every 12 hours
-- and all other configured tables can refresh daily. Each invocation processes at most two due jobs.
select cron.unschedule('sync-tables-evening')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening');
select cron.schedule(
  'sync-tables-evening',
  '10,20,30,40,50 14 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings')$$
);

select cron.unschedule('sync-tables-evening-late')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening-late');
select cron.schedule(
  'sync-tables-evening-late',
  '0,10,20,30,40,50 15 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings')$$
);
