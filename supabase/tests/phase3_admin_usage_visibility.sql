-- Regression checks for Phase 3.3 admin visibility, PFIE monthly-family accounting and UTC backoff boundaries.
begin;
set local time zone 'America/New_York';

do $$
declare
  v_actual timestamptz;
  v_expected timestamptz := make_timestamptz(2026, 12, 1, 0, 0, 0, 'UTC');
  v_core_before numeric;
  v_core_after numeric;
  v_newsroom_before numeric;
  v_newsroom_after numeric;
begin
  -- The production backoff expression is UTC-stable regardless of session timezone.
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

  select public.api_family_spend_usd('parallel'),
         public.api_family_spend_usd('parallel-newsroom')
    into v_core_before, v_newsroom_before;

  insert into public.api_call_events (
    provider, feature, consumer, operation, status, estimated_cost_usd, metadata
  ) values (
    'parallel-chat:medium', 'pfie:budget-test', 'pfie', 'budget-test',
    'claimed', 0.123, jsonb_build_object('test_fixture', true)
  );

  select public.api_family_spend_usd('parallel'),
         public.api_family_spend_usd('parallel-newsroom')
    into v_core_after, v_newsroom_after;

  if round(v_core_after - v_core_before, 3) <> 0.123 then
    raise exception 'PFIE Medium was not added to the core Parallel family: delta %', v_core_after - v_core_before;
  end if;
  if round(v_newsroom_before - v_newsroom_after, 3) <> 0.123 then
    raise exception 'PFIE Medium was not removed from the newsroom family: delta %', v_newsroom_before - v_newsroom_after;
  end if;
end $$;

rollback;
