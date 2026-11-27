-- Replace the December premiere cron with the 5 January 2027 SAST schedule.
select cron.unschedule(jobid)
from cron.job
where jobname = 'good-sport-premiere';

select cron.schedule(
  'good-sport-premiere',
  '0 7-11 5 1 *',
  $$select public.invoke_cron('/api/cron/podcast-premiere')$$
);
