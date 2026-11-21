-- PFIE standings jobs are single-competition requests because each competition may use four Parallel extracts
-- and up to eight source-specific Gemini calls (four first pass + four bounded retries).
-- More frequent small invocations keep the HTTP request comfortably below the 55-second pg_net timeout.

select cron.unschedule('sync-tables')
where exists (select 1 from cron.job where jobname = 'sync-tables');
select cron.schedule(
  'sync-tables',
  '0,5,10,15,20,25,30,35,40,45,50,55 2 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);

select cron.unschedule('sync-tables-late')
where exists (select 1 from cron.job where jobname = 'sync-tables-late');
select cron.schedule(
  'sync-tables-late',
  '0,5,10,15,20,25,30,35,40,45,50,55 3 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?max=1')$$
);

select cron.unschedule('sync-tables-evening')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening');
select cron.schedule(
  'sync-tables-evening',
  '0,10,20,30,40,50 14 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);

select cron.unschedule('sync-tables-evening-late')
where exists (select 1 from cron.job where jobname = 'sync-tables-evening-late');
select cron.schedule(
  'sync-tables-evening-late',
  '0,10,20,30,40,50 15 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=standings&max=1')$$
);
