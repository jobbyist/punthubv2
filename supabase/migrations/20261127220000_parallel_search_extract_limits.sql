-- Bound the high-volume Parallel Search and Extract quotas to observed launch usage.
-- Current 14-day averages were approximately 156 Search calls/day and 118 Extract calls/day.
-- These limits preserve headroom while preventing runaway request volume; dollar budgets remain the hard spend controls.
update public.api_quota_limits
set daily_cap = 250,
    monthly_cap = 7500,
    note = 'Launch usage guard: 250 calls/day and 7,500/month; subject to $50 internal monthly Parallel family budget and $200 cumulative Q1 2027 allowance.'
where provider = 'parallel';

update public.api_quota_limits
set daily_cap = 200,
    monthly_cap = 6000,
    note = 'Launch usage guard: 200 calls/day and 6,000/month; subject to $50 internal monthly Parallel family budget and $200 cumulative Q1 2027 allowance.'
where provider = 'parallel-extract';
