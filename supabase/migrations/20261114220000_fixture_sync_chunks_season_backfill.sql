-- 14 Nov 2026: (1) fixture sync in chunks, (2) season results backfill.
--
-- (1) The 04:00 SAST fixture sync ran all 21 competitions in one serverless call and wrote nothing until the end;
-- the call hit its time limit first, so verified fixtures from 14 Nov never reached public.fixtures. The route now
-- writes each competition as it finishes and takes the competitions not synced in the last 12 hours. It is called
-- every 6 minutes from 03:00 to 03:42 SAST (before the 04:10 tables jobs); calls after the work is done are no-ops.
select cron.unschedule('sync-fixtures') where exists (select 1 from cron.job where jobname = 'sync-fixtures');
select cron.schedule('sync-fixtures', '0,6,12,18,24,30,36,42 1 * * *',
  $$select public.invoke_cron('/api/cron/sync-fixtures')$$);

-- (2) Season backfill: past results in 21-day windows (current season first, then last season), recorded in
-- sync_status as job 'season', scope '<competition>:<window start>'. Each result is kept only when the
-- competition's own site or two different sites give the same score (verifyHistory). Two windows per call, every
-- 10 minutes from 06:00 to 06:50 SAST, after the daily standings/form jobs.
alter table public.sync_status drop constraint if exists sync_status_job_check;
alter table public.sync_status add constraint sync_status_job_check check (job in ('standings', 'history', 'season'));

select cron.unschedule('sync-season') where exists (select 1 from cron.job where jobname = 'sync-season');
select cron.schedule('sync-season', '0,10,20,30,40,50 4 * * *',
  $$select public.invoke_cron('/api/cron/sync-tables?job=season&max=2')$$);
