-- Owner decision (15 Nov 2026): drop the Parallel monthly budget from US$25 to US$5 on 7 Dec 2026, when the
-- prepaid balance expires and only the free monthly credit remains (docs/PARALLEL_ARCHITECTURE.md).
-- One-shot pg_cron job at 00:05 SAST on 7 Dec (22:05 UTC on 6 Dec). It removes itself after running, so it does
-- not fire again next year.
select cron.unschedule('parallel-budget-dec') where exists (select 1 from cron.job where jobname = 'parallel-budget-dec');
select cron.schedule('parallel-budget-dec', '5 22 6 12 *', $job$
  update public.api_budgets
     set monthly_usd = 5.00,
         note = 'Free monthly Parallel credit only (prepaid balance expired 7 Dec 2026). Set by the scheduled job.',
         updated_at = now()
   where family = 'parallel';
  select cron.unschedule('parallel-budget-dec');
$job$);
