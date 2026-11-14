-- Wider PFIE coverage (21 competitions): one Parallel search per competition per daily fixtures run, plus result
-- checks that now back off. Raise the daily cap so a busy weekend is not cut short; the monthly cap (and so the
-- most this can cost, about $7.50 a month) is unchanged.
update public.api_quota_limits
set daily_cap = 80,
    note = 'paid from the prepaid balance; about $7.50 a month at most (daily 80 for 21-competition coverage)',
    updated_at = now()
where provider = 'parallel';
