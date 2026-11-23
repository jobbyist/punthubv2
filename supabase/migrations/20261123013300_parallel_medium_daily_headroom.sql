-- Increase daily headroom for the three-slot Newsroom while preserving the monthly cap.
update public.api_quota_limits
set daily_cap = 30,
    monthly_cap = 450,
    note = 'Newsroom Parallel Responses Medium writer, revision and reviewer allowance; 30 calls/day, 450/month, within the shared $35 monthly Parallel budget.'
where provider = 'parallel-chat:medium';
