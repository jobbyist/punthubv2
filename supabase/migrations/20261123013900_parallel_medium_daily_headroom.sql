-- Reserve enough daily Responses Medium capacity for all three Newsroom slots.
update public.api_quota_limits
set daily_cap = 45,
    monthly_cap = 450,
    note = 'Newsroom Parallel Responses Medium writer, revision and reviewer allowance; 45 calls/day, 450/month, within the shared $35 monthly Parallel budget.'
where provider = 'parallel-chat:medium';
