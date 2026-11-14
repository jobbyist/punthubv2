-- Owner decision 14 Nov 2026 (20:17 SAST): raise the Parallel limits so fixtures, tables and the season backfill
-- all fit each night. Search: 180 a day / 4,000 a month (about $20 a month at most at $0.005 a search).
-- Extract: 150 a day / 3,000 a month (about $3 a month at most). The season backfill takes three windows a call.
update public.api_quota_limits
set daily_cap = 180, monthly_cap = 4000, updated_at = now(),
    note = 'paid from the prepaid balance; about $20 a month at most (raised 14 Nov for the season backfill)'
where provider = 'parallel';
update public.api_quota_limits
set daily_cap = 150, monthly_cap = 3000, updated_at = now(),
    note = 'paid from the prepaid balance; about $3 a month at most (raised 14 Nov)'
where provider = 'parallel-extract';
select cron.alter_job((select jobid from cron.job where jobname = 'sync-season'),
  command := $$select public.invoke_cron('/api/cron/sync-tables?job=season&max=3')$$);
