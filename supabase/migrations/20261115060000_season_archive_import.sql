-- Season archive import (src/lib/pfie/archive.ts): whole seasons from FBref + Wikipedia, compared in code.
-- 1. sync_status accepts the new job name.
alter table public.sync_status drop constraint if exists sync_status_job_check;
alter table public.sync_status add constraint sync_status_job_check
  check (job = any (array['standings', 'history', 'season', 'odds', 'archive']));

-- 2. Daily runs at 02:10, 02:25, 02:40 and 02:55 SAST, three competition seasons a call (two page reads each,
--    about US$0.006 a call). Finished seasons import once; the current season refreshes daily.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'sync-archive') then
    perform cron.unschedule('sync-archive');
  end if;
  perform cron.schedule('sync-archive', '10,25,40,55 0 * * *',
    $cmd$select public.invoke_cron('/api/cron/sync-tables?job=archive&max=3')$cmd$);
end;
$$;
