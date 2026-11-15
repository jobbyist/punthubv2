-- Season backfill now reads 7-day windows (about 55 per league), so the nightly job runs for two hours
-- (04:00-05:50 UTC, 12 calls of 3 windows) instead of one. Stays inside the Parallel caps (150 extracts a day).
select cron.alter_job((select jobid from cron.job where jobname = 'sync-season'),
  schedule := '0,10,20,30,40,50 4,5 * * *');
