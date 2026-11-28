-- Transactional regression test for contextual usage events and cross-job cooldowns.
-- Run against a disposable database or with a service-role SQL session; all test mutations roll back.
begin;

do $$
declare
  v_provider text := 'parallel-chat:low';
  v_day_calls bigint := 0;
  v_month_calls bigint := 0;
  v_request_success text := gen_random_uuid()::text;
  v_request_error text := gen_random_uuid()::text;
  v_request_refused text := gen_random_uuid()::text;
  v_request_deferred text := gen_random_uuid()::text;
  v_event record;
begin
  select
    coalesce(sum(calls) filter (where day = (now() at time zone 'UTC')::date), 0),
    coalesce(sum(calls), 0)
    into v_day_calls, v_month_calls
    from public.content_api_usage
   where provider = v_provider
     and day >= date_trunc('month', now() at time zone 'UTC')::date;

  update public.api_quota_limits
     set daily_cap = v_day_calls + 2,
         monthly_cap = v_month_calls + 2
   where provider = v_provider;

  if not found then
    raise exception 'test provider quota row is missing';
  end if;

  if not public.api_budget_claim_with_context(
    v_provider, 1, 'pfie:test',
    jsonb_build_object(
      'request_id', v_request_success,
      'competition', 'championship',
      'job_run_id', gen_random_uuid()::text,
      'job_kind', 'standings'
    )
  ) then
    raise exception 'expected first test claim to be granted';
  end if;
  if not public.api_call_event_finish(v_provider, v_request_success, 'success', null) then
    raise exception 'could not finish successful test claim';
  end if;
  if public.api_budget_claim_with_context(
    v_provider, 1, 'pfie:test',
    jsonb_build_object(
      'request_id', v_request_success,
      'competition', 'championship',
      'job_run_id', gen_random_uuid()::text,
      'job_kind', 'standings'
    )
  ) then
    raise exception 'a repeated request id must not be granted twice';
  end if;

  if not public.api_budget_claim_with_context(
    v_provider, 1, 'pfie:test',
    jsonb_build_object(
      'request_id', v_request_error,
      'competition', 'championship',
      'job_run_id', gen_random_uuid()::text,
      'job_kind', 'standings'
    )
  ) then
    raise exception 'expected second test claim to be granted';
  end if;
  if not public.api_call_event_finish(v_provider, v_request_error, 'error', 'intentional rollback-only test error') then
    raise exception 'could not mark provider error';
  end if;

  if public.api_budget_claim_with_context(
    v_provider, 1, 'pfie:test',
    jsonb_build_object(
      'request_id', v_request_refused,
      'competition', 'championship',
      'job_run_id', gen_random_uuid()::text,
      'job_kind', 'standings'
    )
  ) then
    raise exception 'expected third test claim to be refused at daily cap';
  end if;

  if public.api_budget_claim_with_context(
    v_provider, 1, 'pfie:test',
    jsonb_build_object(
      'request_id', v_request_deferred,
      'competition', 'championship',
      'job_run_id', gen_random_uuid()::text,
      'job_kind', 'standings'
    )
  ) then
    raise exception 'expected fourth test claim to be deferred by provider cooldown';
  end if;

  select status, estimated_cost_usd, metadata into v_event
    from public.api_call_events where metadata->>'request_id' = v_request_success;
  if v_event.status <> 'success' or v_event.estimated_cost_usd is null
     or v_event.metadata->>'competition' <> 'championship'
     or v_event.metadata->>'job_kind' <> 'standings'
     or v_event.metadata->>'job_run_id' is null then
    raise exception 'successful event did not retain cost and job context';
  end if;

  select status into v_event
    from public.api_call_events where metadata->>'request_id' = v_request_error;
  if v_event.status <> 'error' then
    raise exception 'provider error was not reflected in the event ledger';
  end if;

  select status, metadata into v_event
    from public.api_call_events where metadata->>'request_id' = v_request_refused;
  if v_event.status <> 'refused' or v_event.metadata->>'refusal_reason' <> 'provider_daily_quota_exceeded' then
    raise exception 'daily quota refusal was not recorded with its reason';
  end if;

  select status, metadata into v_event
    from public.api_call_events where metadata->>'request_id' = v_request_deferred;
  if v_event.status <> 'deferred' or v_event.metadata->>'refusal_reason' <> 'provider_cooldown_active' then
    raise exception 'cross-job cooldown did not defer the subsequent request';
  end if;
end $$;

rollback;
