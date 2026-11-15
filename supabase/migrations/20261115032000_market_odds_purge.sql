-- Reference prices are only looked up for 36 hours (the posting trigger), and each pick keeps its own copy of the
-- reference it was checked against, so older market_odds rows serve no purpose. Keep 14 days for audit, then purge.
-- Daily at 03:20 SAST.
select cron.unschedule('market-odds-purge') where exists (select 1 from cron.job where jobname = 'market-odds-purge');
select cron.schedule('market-odds-purge', '20 1 * * *',
  $$delete from public.market_odds where captured_at < now() - interval '14 days'$$);
