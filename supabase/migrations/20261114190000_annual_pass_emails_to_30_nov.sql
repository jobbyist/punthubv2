-- Owner decision (14 Nov 2026): the Annual Pass offer now closes 30 Nov, so the Annual Pass campaign email keeps
-- going to 30 Nov (07:00 UTC daily from 10 Nov). Each address still receives it once (founding_campaign_sends).
select cron.alter_job(
  (select jobid from cron.job where jobname = 'founding-campaign-pass'),
  schedule := '0 7 10-30 11 *'
);
