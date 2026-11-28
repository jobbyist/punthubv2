-- Regression checks for Phase 3.3 admin visibility and UTC backoff boundaries.
begin;

set local time zone 'America/New_York';

do $$
declare
  v_actual timestamptz;
  v_expected timestamptz := make_timestamptz(2026, 12, 1, 0, 0, 0, 'UTC');
begin
  -- The production expression must resolve to UTC midnight regardless of the SQL session timezone.
  v_actual := (date '2026-11-30' + 1)::timestamp at time zone 'UTC';
  if v_actual <> v_expected then
    raise exception 'backoff boundary is not UTC-stable: actual %, expected %', v_actual, v_expected;
  end if;

  if not has_table_privilege('authenticated', 'public.api_call_events', 'select') then
    raise exception 'authenticated role is missing the base-table SELECT grant';
  end if;
  if not has_table_privilege('authenticated', 'public.api_call_usage_attribution_detail', 'select') then
    raise exception 'authenticated role is missing the attribution-view SELECT grant';
  end if;
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'api_call_events'
       and policyname = 'api_call_events_admin_read'
       and cmd = 'SELECT'
  ) then
    raise exception 'admin-only RLS policy is missing from api_call_events';
  end if;
end $$;

rollback;
