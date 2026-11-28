-- Allow the three scheduled Newsroom slots to run while retaining the $50 monthly family spend guard.
-- 18 calls/day covers up to six Parallel Medium requests per slot (breaking/editorial/intelligence).
-- The $50 parallel-newsroom budget remains the binding financial ceiling at the configured $0.05/call price.
update public.api_quota_limits
set daily_cap = 18,
    monthly_cap = 1000,
    note = 'Parallel Responses Medium for the three Newsroom slots; 18 calls/day (up to 6 per slot), 1,000 monthly call ceiling; the separate $50 monthly family budget is the hard spend guard.',
    updated_at = now()
where provider = 'parallel-chat:medium';
