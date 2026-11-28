-- Phase 3.3 regression: hard cap denials are recorded once and block subsequent cron jobs;
-- successful claims are finalised as failed/succeeded without duplicating the attempt event.
begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;

do $$
declare
  v_day_calls bigint;
  v_month_calls bigint;
  v_attempt uuid := gen_random_uuid();
  v_attempt2 uuid := gen_random_uuid();
  v_job uuid := gen_random_uuid();
  v_result jsonb;
  v_result2 jsonb;
  v_blocked_until timestamptz;
  v_status text;
  v_event_count integer;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'api_call_usage_attribution_detail'
       and column_name = 'competition'
  ) or not exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'api_call_usage_attribution_detail'
       and column_name = 'job_run_id'
  ) then
    raise exception 'Expected the contextual API attribution detail view';
  end if;

  select
    coalesce(sum(calls) filter (where day = (now() at time zone 'UTC')::date), 0),
    coalesce(sum(calls), 0)
  into v_day_calls, v_month_calls
  from public.content_api_usage
  where provider = 'parallel-chat:low'
    and day >= date_trunc('month', (now() at time zone 'UTC'))::date;

  -- Make the test request exceed the provider daily cap while leaving monthly headroom.
  update public.api_quota_limits
     set daily_cap = greatest(v_day_calls, 1),
         monthly_cap = v_month_calls + 2
   where provider = 'parallel-chat:low';

  v_result := public.api_budget_claim_context(
    'parallel-chat:low', 2, 'pfie:test', 'premier-league', v_job, v_attempt, '{}'::jsonb
  );
  if v_result->>'granted' <> 'false'
     or v_result->>'reason_code' <> 'provider_daily_call_cap_exhausted' then
    raise exception 'Expected daily-cap denial, received %', v_result;
  end if;

  v_result2 := public.api_budget_claim_context(
    'parallel-chat:low', 1, 'pfie:test', 'premier-league', gen_random_uuid(), v_attempt2, '{}'::jsonb
  );
  if v_result2->>'granted' <> 'false'
     or v_result2->>'reason_code' <> 'provider_backoff_active' then
    raise exception 'Expected cross-job provider backoff, received %', v_result2;
  end if;

  select blocked_until into v_blocked_until
    from public.api_provider_backoff
   where scope = 'provider' and scope_key = 'parallel-chat:low';
  if v_blocked_until is null or v_blocked_until <= now() then
    raise exception 'Expected an active provider backoff';
  end if;

  select count(*) into v_event_count
    from public.api_call_events
   where attempt_id in (v_attempt, v_attempt2) and status = 'denied';
  if v_event_count <> 2 then
    raise exception 'Expected exactly two denied claim events, found %', v_event_count;
  end if;

  -- Exercise a successful claim and finalise its single event as a provider failure.
  insert into public.api_unit_prices(provider, usd_per_unit)
  values ('parallel-test', 0.001)
  on conflict (provider) do nothing;
  insert into public.api_quota_limits(provider, daily_cap, monthly_cap, note)
  values ('parallel-test', 100, 100, 'transactional PFIE quota test')
  on conflict (provider) do update set daily_cap = 100, monthly_cap = 100;

  v_attempt := gen_random_uuid();
  v_result := public.api_budget_claim_context(
    'parallel-test', 1, 'pfie:test', 'premier-league', v_job, v_attempt, '{}'::jsonb
  );
  if v_result->>'granted' <> 'true' then
    raise exception 'Expected the test provider claim to be granted, received %', v_result;
  end if;

  if not public.api_call_event_result(v_attempt, 'failed', 'upstream_timeout', jsonb_build_object('test', true)) then
    raise exception 'Expected the granted event to be finalised';
  end if;

  select status into v_status from public.api_call_events where attempt_id = v_attempt;
  if v_status <> 'failed' then
    raise exception 'Expected failed event status, found %', v_status;
  end if;
end;
$$;

rollback;
