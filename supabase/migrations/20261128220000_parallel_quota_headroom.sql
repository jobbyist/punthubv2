-- Increase shared Parallel endpoint ceilings so PFIE backfills, standings refreshes and team-badge resolution
-- can coexist without hitting the application's provider-wide call ceilings.
-- Monthly USD family budgets and the cumulative Parallel spend guard remain the financial source of truth.
update public.api_quota_limits
set daily_cap = 1200,
    monthly_cap = 12000,
    note = 'Parallel Search shared by PFIE, team-badge discovery and research workflows; core monthly USD budget remains the hard spend guard.',
    updated_at = now()
where provider = 'parallel';

update public.api_quota_limits
set daily_cap = 2500,
    monthly_cap = 10000,
    note = 'Parallel Extract shared by PFIE fixtures/results/standings/history and official team-badge page extraction; core monthly USD budget remains the hard spend guard.',
    updated_at = now()
where provider = 'parallel-extract';

update public.api_quota_limits
set daily_cap = 500,
    monthly_cap = 12000,
    note = 'Parallel Responses low for PFIE structured observations plus PUNT AI and synthetic consumers; family budgets ($50 core, $35 auxiliary, $50 synthetic) remain enforced.',
    updated_at = now()
where provider = 'parallel-chat:low';
