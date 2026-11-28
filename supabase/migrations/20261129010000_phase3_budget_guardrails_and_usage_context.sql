-- Phase 3.3: contextual usage events, cross-job quota cooldowns and hard provider-budget stops.
-- The existing api_budget_claim remains the single source of truth for debiting usage.
-- This wrapper enriches its event atomically, logs refusals, and prevents repeated cron jobs from retrying a
-- provider after a known hard quota/budget denial.

create table if not exists private.api_provider_cooldowns (
  provider text primary key,
  cooldown_until timestamptz not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table private.api_provider_cooldowns enable row level security;
revoke all on table private.api_provider_cooldowns from public, anon, authenticated;
create index if not exists api_provider_cooldowns_until_idx
  on private.api_provider_cooldowns (cooldown_until);

-- Reassign all PFIE Responses effort levels to the core PFIE/Parallel budget, not just Low.
create or replace function public.api_family_spend_usd(p_family text)
returns numeric
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_spent numeric := 0;
  v_pfie_low numeric := 0;
  v_pfie_medium numeric := 0;
  v_synthetic_events numeric := 0;
  v_synthetic_experiments numeric := 0;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
begin
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_spent
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where public.api_provider_family(u.provider) = p_family
     and u.day >= (v_month_start at time zone 'UTC')::date;

  if p_family in ('parallel', 'parallel-aux', 'parallel-newsroom') then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_low
      from public.api_call_events
     where provider = 'parallel-chat:low'
       and feature like 'pfie:%'
       and claimed_at >= v_month_start;

    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_medium
      from public.api_call_events
     where provider = 'parallel-chat:medium'
       and feature like 'pfie:%'
       and claimed_at >= v_month_start;

    if p_family = 'parallel' then
      v_spent := v_spent + v_pfie_low + v_pfie_medium;
    elsif p_family = 'parallel-aux' then
      v_spent := greatest(0, v_spent - v_pfie_low);
    elsif p_family = 'parallel-newsroom' then
      v_spent := greatest(0, v_spent - v_pfie_medium);
    end if;
  end if;

  if p_family = 'parallel-synthetic' then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_synthetic_events
      from public.api_call_events
     where (feature like 'synthetic:%' or feature like 'ai-community:%')
       and provider like 'parallel%'
       and claimed_at >= v_month_start;

    select coalesce(sum(spent_usd), 0)
      into v_synthetic_experiments
      from public.synthetic_experiments
     where created_at >= v_month_start;

    v_spent := greatest(v_spent, v_synthetic_events, v_synthetic_experiments);
  end if;

  return v_spent;
end;
$function$;

create or replace function private.api_call_event_context_before_insert()
returns trigger
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
declare
  v_raw text;
  v_context jsonb;
begin
  v_raw := nullif(current_setting('puntr.api_call_context', true), '');
  if v_raw is null then
    return new;
  end if;

  begin
    v_context := v_raw::jsonb;
  exception when others then
    return new;
  end;

  new.metadata := coalesce(new.metadata, '{}'::jsonb) || v_context;
  if new.estimated_cost_usd is null and v_context ? 'estimated_cost_usd' then
    new.estimated_cost_usd := nullif(v_context->>'estimated_cost_usd', '')::numeric;
  end if;
  return new;
end;
$function$;

drop trigger if exists api_call_event_context_before_insert on public.api_call_events;
create trigger api_call_event_context_before_insert
before insert on public.api_call_events
for each row execute function private.api_call_event_context_before_insert();

create index if not exists api_call_events_request_id_idx
  on public.api_call_events ((metadata->>'request_id'))
  where metadata ? 'request_id';

create or replace function public.api_budget_claim_with_context(
  p_provider text,
  p_units integer,
  p_feature text,
  p_context jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
declare
  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');
  v_context jsonb;
  v_price numeric;
  v_family text;
  v_budget record;
  v_period record;
  v_quota record;
  v_period_spent numeric := 0;
  v_day_calls bigint := 0;
  v_month_calls bigint := 0;
  v_today date := (now() at time zone 'UTC')::date;
  v_reason text;
  v_cooldown_until timestamptz;
  v_granted boolean := false;
  v_consumer text;
  v_operation text;
  v_is_synthetic boolean := false;
  v_existing_cooldown timestamptz;
begin
  if p_provider is null or trim(p_provider) = '' or p_units is null or p_units < 1 then
    raise exception 'provider and positive units are required';
  end if;
  if p_context is not null and jsonb_typeof(p_context) not in ('object', 'null') then
    raise exception 'usage context must be a JSON object';
  end if;

  v_context := jsonb_strip_nulls(jsonb_build_object(
    'request_id', nullif(trim(p_context->>'request_id'), ''),
    'competition', nullif(trim(p_context->>'competition'), ''),
    'job_run_id', nullif(trim(p_context->>'job_run_id'), ''),
    'job_kind', nullif(trim(p_context->>'job_kind'), '')
  ));
  if v_context->>'request_id' is null then
    raise exception 'request_id is required for contextual quota claims';
  end if;

  perform pg_advisory_xact_lock(hashtext('api-provider-cooldown:' || p_provider));
  select cooldown_until into v_existing_cooldown
    from private.api_provider_cooldowns
   where provider = p_provider;

  if v_existing_cooldown is not null and v_existing_cooldown > now() then
    v_context := v_context || jsonb_build_object(
      'estimated_cost_usd', 0,
      'refusal_reason', 'provider_cooldown_active',
      'cooldown_until', v_existing_cooldown
    );
    perform set_config('puntr.api_call_context', v_context::text, true);
    v_consumer := split_part(v_feature, ':', 1);
    v_operation := coalesce(nullif(substr(v_feature, length(v_consumer) + 2), ''), 'request');
    insert into public.api_call_events (
      provider, feature, consumer, operation, status, metadata, estimated_cost_usd
    ) values (
      p_provider, v_feature, v_consumer, v_operation, 'deferred',
      jsonb_build_object('attribution_source', 'api_budget_claim_with_context', 'refusal_reason', 'provider_cooldown_active'),
      0
    );
    perform set_config('puntr.api_call_context', '', true);
    return false;
  end if;

  delete from private.api_provider_cooldowns
   where provider = p_provider and cooldown_until <= now();

  select usd_per_unit into v_price
    from public.api_unit_prices
   where provider = p_provider;

  v_family := public.api_provider_family(p_provider);
  v_is_synthetic := v_feature like 'synthetic:%' or v_feature like 'ai-community:%';
  if v_is_synthetic then
    v_family := 'parallel-synthetic';
  elsif v_feature like 'pfie:%' then
    v_family := 'parallel';
  end if;

  -- A Parallel endpoint without a price must never bypass the shared cap.
  if p_provider like 'parallel%' and v_price is null then
    v_reason := 'missing_unit_price';
  else
    v_context := v_context || jsonb_strip_nulls(jsonb_build_object(
      'estimated_cost_usd', case when v_price is null then null else v_price * p_units end,
      'estimated_cost_status', case when v_price is null then 'unpriced_provider' else 'estimated' end,
      'budget_family', v_family
    ));
    perform set_config('puntr.api_call_context', v_context::text, true);
    v_granted := public.api_budget_claim(p_provider, p_units, v_feature);
    if v_granted then
      delete from private.api_provider_cooldowns where provider = p_provider;
      perform set_config('puntr.api_call_context', '', true);
      return true;
    end if;
  end if;

  if v_reason is null then
    if v_price is null then
      v_reason := 'missing_unit_price';
    else
      select monthly_usd into v_budget
        from public.api_budgets
       where family = v_family;

      if found and public.api_family_spend_usd(v_family) + (v_price * p_units) > v_budget.monthly_usd then
        v_reason := 'monthly_family_budget_exceeded';
      end if;
    end if;
  end if;

  if v_reason is null and p_provider like 'parallel%' then
    select period_start, period_end, limit_usd into v_period
      from public.api_spend_period_limits
     where family = 'parallel'
       and v_today between period_start and period_end
     order by period_start desc
     limit 1;

    if found then
      select coalesce(sum(u.calls * p.usd_per_unit), 0)
        into v_period_spent
        from public.content_api_usage u
        join public.api_unit_prices p on p.provider = u.provider
       where u.provider like 'parallel%'
         and u.day between v_period.period_start and v_period.period_end;

      if v_period_spent + (v_price * p_units) > v_period.limit_usd then
        v_reason := 'shared_period_budget_exceeded';
      end if;
    end if;
  end if;

  if v_reason is null then
    select daily_cap, monthly_cap into v_quota
      from public.api_quota_limits
     where provider = p_provider;

    if not found then
      v_reason := 'provider_quota_not_configured';
    else
      select
        coalesce(sum(calls) filter (where day = v_today), 0),
        coalesce(sum(calls), 0)
        into v_day_calls, v_month_calls
        from public.content_api_usage
       where provider = p_provider
         and day >= date_trunc('month', now() at time zone 'UTC')::date;

      if v_quota.daily_cap is not null and v_day_calls + p_units > v_quota.daily_cap then
        v_reason := 'provider_daily_quota_exceeded';
      elsif v_quota.monthly_cap is not null and v_month_calls + p_units > v_quota.monthly_cap then
        v_reason := 'provider_monthly_quota_exceeded';
      else
        v_reason := 'budget_or_quota_claim_refused';
      end if;
    end if;
  end if;

  if v_reason = 'provider_daily_quota_exceeded' then
    v_cooldown_until := (date_trunc('day', now() at time zone 'UTC') + interval '1 day') at time zone 'UTC';
  elsif v_reason in ('provider_monthly_quota_exceeded', 'monthly_family_budget_exceeded') then
    v_cooldown_until := (date_trunc('month', now() at time zone 'UTC') + interval '1 month') at time zone 'UTC';
  elsif v_reason = 'shared_period_budget_exceeded' and v_period.period_end is not null then
    v_cooldown_until := ((v_period.period_end + 1)::timestamp at time zone 'UTC');
  else
    v_cooldown_until := now() + interval '30 minutes';
  end if;

  insert into private.api_provider_cooldowns(provider, cooldown_until, reason, updated_at)
  values (p_provider, v_cooldown_until, v_reason, now())
  on conflict (provider) do update
    set cooldown_until = excluded.cooldown_until,
        reason = excluded.reason,
        updated_at = now();

  v_context := v_context || jsonb_build_object(
    'estimated_cost_usd', 0,
    'refusal_reason', v_reason,
    'cooldown_until', v_cooldown_until,
    'budget_family', v_family
  );
  perform set_config('puntr.api_call_context', v_context::text, true);
  v_consumer := split_part(v_feature, ':', 1);
  v_operation := coalesce(nullif(substr(v_feature, length(v_consumer) + 2), ''), 'request');
  insert into public.api_call_events (
    provider, feature, consumer, operation, status, metadata, estimated_cost_usd
  ) values (
    p_provider, v_feature, v_consumer, v_operation, 'refused',
    jsonb_build_object('attribution_source', 'api_budget_claim_with_context', 'refusal_reason', v_reason),
    0
  );
  perform set_config('puntr.api_call_context', '', true);
  return false;
end;
$function$;

create or replace function public.api_call_event_finish(
  p_provider text,
  p_request_id text,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path to public, private, pg_temp
as $function$
declare
  v_updated integer;
begin
  if p_status not in ('success', 'error') then
    raise exception 'status must be success or error';
  end if;

  update public.api_call_events
     set status = p_status,
         metadata = metadata || jsonb_strip_nulls(jsonb_build_object(
           'finished_at', now(),
           'error', case when p_status = 'error' then left(coalesce(p_error, 'provider request failed'), 300) else null end
         ))
   where provider = p_provider
     and metadata->>'request_id' = p_request_id;

  get diagnostics v_updated = row_count;
  if v_updated > 0 and p_status = 'error' then
    perform public.api_quota_error(p_provider);
  end if;
  return v_updated > 0;
end;
$function$;

revoke all on function public.api_budget_claim_with_context(text, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.api_budget_claim_with_context(text, integer, text, jsonb) to service_role;
revoke all on function public.api_call_event_finish(text, text, text, text) from public, anon, authenticated;
grant execute on function public.api_call_event_finish(text, text, text, text) to service_role;

-- Preserve the old records without inventing missing context or prices.
update public.api_call_events
   set metadata = metadata || jsonb_build_object('legacy_context_status', 'not_captured')
 where not (metadata ? 'competition')
    or not (metadata ? 'job_run_id');

update public.api_call_events e
   set estimated_cost_usd = p.usd_per_unit,
       metadata = e.metadata || jsonb_build_object('legacy_cost_status', 'backfilled_from_unit_price')
  from public.api_unit_prices p
 where e.provider = p.provider
   and e.estimated_cost_usd is null;

update public.api_call_events
   set metadata = metadata || jsonb_build_object('legacy_attribution_status', 'unattributed')
 where feature = 'unattributed'
    or consumer is null
    or operation is null;

update public.api_call_events
   set metadata = metadata || jsonb_build_object('legacy_cost_status', 'provider_price_missing')
 where estimated_cost_usd is null;
