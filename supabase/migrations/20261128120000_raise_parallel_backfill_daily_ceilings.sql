-- Temporary daily call ceilings for the bounded 3-season UCL/UECL/CAF history backfill.
-- Monthly family budgets and the shared $280 cumulative Parallel ceiling remain unchanged.
update public.api_quota_limits
set daily_cap = 700,
    note = 'Temporary historical backfill ceiling through MVP launch: 700 calls/day, 7,500/month; subject to the $50 monthly core Parallel family cap and shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel';

update public.api_quota_limits
set daily_cap = 1500,
    note = 'Temporary historical backfill ceiling through MVP launch: 1,500 calls/day, 6,000/month; subject to the $50 monthly core Parallel family cap and shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-extract';