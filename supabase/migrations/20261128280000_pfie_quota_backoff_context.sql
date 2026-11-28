-- Phase 3.3: contextual claim events and cross-job hard-cap backoff for PFIE.
-- Existing api_budget_claim callers remain compatible; PFIE uses api_budget_claim_context.

alter table public.api_call_events
  add column if not exists attempt_id uuid not null default gen_random_uuid(),
  add column if not exists competition text,
  add column if not exists job_run_id uuid,
  add column if not exists reason_code text,
  add column if not exists completed_at timestamptz;

create unique index if not exists api_call_events_attempt_id_uidx
  on public.api_call_events (attempt_id);
create index if not exists api_call_events_pfie_run_idx
  on public.api_call_events (competition, job_run_id, claimed_at desc)
  where competition is not null or job_run_id is not null;
create index if not exists api_call_events_provider_status_idx
  on public.api_call_events (provider, status, claimed_at desc);

create table if not exists public.api_provider_backoff (
  scope text not null check (scope in ('provider', 'family', 'global')),
  scope_key text not null,
  blocked_until timestamptz not null,
  reason_code text not null,
  feature text,
  competition text,
  job_run_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, scope_key)
);

create index if not exists api_provider_backoff_until_idx
  on public.api_provider_backoff (blocked_until);

alter table public.api_provider_backoff enable row level security;
revoke all on public.api_provider_backoff from anon, authenticated;
grant select, insert, update, delete on public.api_provider_backoff to service_role;
drop policy if exists api_provider_backoff_admin_read on public.api_provider_backoff;
create policy api_provider_backoff_admin_read
  on public.api_provider_backoff for select to authenticated using (public.is_admin());
grant select on public.api_provider_backoff to authenticated;

create or replace function public.api_budget_claim_context(
  p_provider text,
  p_units integer,
  p_feature text,
  p_competition text,
  p_job_run_id uuid,
  p_attempt_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_family text := public.api_provider_family(p_provider);
  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');
  v_budget public.api_budgets;
  v_period public.api_spend_period_limits;
  v_price numeric;
  v_spent numeric := 0;
  v_period_spent numeric := 0;
  v_today date := (now() at time zone 'UTC')::date;
  v_now timestamptz := now();
  v_month_reset timestamptz := ((date_trunc('month', v_now at time zone 'UTC') + interval '1 month') at time zone 'UTC');
  v_blocked_until timestamptz;
  v_existing_reason text;
  v_reason text;
  v_backoff_reason text;
  v_synthetic boolean := v_feature like 'synthetic:%' or v_feature like 'ai-community:%';
  v_has_budget boolean := false;
  v_granted boolean := false;
  v_daily_cap integer;
  v_monthly_cap integer;
  v_day_calls bigint := 0;
  v_month_calls bigint := 0;
  v_status text;
  v_consumer text;
  v_operation text;
  v_attempt_id uuid := coalesce(p_attempt_id, gen_random_uuid());
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode = '22023';
  end if;
  if p_provider is null or btrim(p_provider) = '' then
    raise exception 'provider_required' using errcode = '22023';
  end if;

  if v_feature like 'pfie:%' then
    v_family := 'parallel';
  elsif v_synthetic then
    v_family := 'parallel-synthetic';
  end if;

  v_consumer := split_part(v_feature, ':', 1);
  v_operation := coalesce(nullif(substr(v_feature, length(v_consumer) + 2), ''), 'request');
  select usd_per_unit into v_price from public.api_unit_prices where provider = p_provider;

  -- Active blocks are checked before budget calculations. They prevent repeated cron invocations
  -- from repeatedly evaluating a cap that cannot reset until a known boundary.
  if p_provider like 'parallel%' then
    select blocked_until, reason_code into v_blocked_until, v_existing_reason
      from public.api_provider_backoff
     where scope = 'global' and scope_key = 'parallel' and blocked_until > v_now;
    if found then
      v_reason := 'global_backoff_active';
      v_backoff_reason := v_existing_reason;
    end if;
  end if;

  if v_reason is null then
    select blocked_until, reason_code into v_blocked_until, v_existing_reason
      from public.api_provider_backoff
     where scope = 'family' and scope_key = v_family and blocked_until > v_now;
    if found then
      v_reason := 'family_backoff_active';
      v_backoff_reason := v_existing_reason;
    end if;
  end if;

  if v_reason is null then
    select blocked_until, reason_code into v_blocked_until, v_existing_reason
      from public.api_provider_backoff
     where scope = 'provider' and scope_key = p_provider and blocked_until > v_now;
    if found then
      v_reason := 'provider_backoff_active';
      v_backoff_reason := v_existing_reason;
    end if;
  end if;

  if v_reason is null and v_price is null then
    v_reason := 'provider_price_missing';
    v_blocked_until := v_now + interval '15 minutes';
    insert into public.api_provider_backoff
      (scope, scope_key, blocked_until, reason_code, feature, competition, job_run_id, metadata)
    values
      ('provider', p_provider, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))
    on conflict (scope, scope_key) do update
      set blocked_until = greatest(public.api_provider_backoff.blocked_until, excluded.blocked_until),
          reason_code = excluded.reason_code,
          feature = excluded.feature,
          competition = excluded.competition,
          job_run_id = excluded.job_run_id,
          metadata = excluded.metadata,
          updated_at = now();
  end if;

  if v_reason is null then
    select * into v_budget from public.api_budgets where family = v_family;
    v_has_budget := found;
    if v_has_budget then
      perform pg_advisory_xact_lock(hashtext('api_budget:' || v_family));

      if v_synthetic then
        select coalesce(sum(estimated_cost_usd), 0)
          into v_spent
          from public.api_call_events
         where (feature like 'synthetic:%' or feature like 'ai-community:%')
           and claimed_at >= date_trunc('month', v_now at time zone 'UTC');
        v_spent := greatest(
          v_spent,
          (select coalesce(sum(spent_usd), 0)
             from public.synthetic_experiments
            where created_at >= date_trunc('month', v_now at time zone 'UTC')::date)
        );
      else
        v_spent := public.api_family_spend_usd(v_family);
      end if;

      if v_spent + v_price * p_units > v_budget.monthly_usd then
        v_reason := 'family_monthly_usd_budget_exhausted';
        v_blocked_until := v_month_reset;
        insert into public.api_provider_backoff
          (scope, scope_key, blocked_until, reason_code, feature, competition, job_run_id, metadata)
        values
          ('family', v_family, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))
        on conflict (scope, scope_key) do update
          set blocked_until = greatest(public.api_provider_backoff.blocked_until, excluded.blocked_until),
              reason_code = excluded.reason_code,
              feature = excluded.feature,
              competition = excluded.competition,
              job_run_id = excluded.job_run_id,
              metadata = excluded.metadata,
              updated_at = now();
      end if;
    end if;
  end if;

  -- The shared Q1 cap is independent of monthly family budgets and covers every Parallel endpoint.
  if v_reason is null and p_provider like 'parallel%' then
    perform pg_advisory_xact_lock(hashtext('api_budget:parallel-global'));
    select * into v_period
      from public.api_spend_period_limits
     where family = 'parallel' and v_today between period_start and period_end;
    if found then
      select coalesce(sum(u.calls * p.usd_per_unit), 0)
        into v_period_spent
        from public.content_api_usage u
        join public.api_unit_prices p on p.provider = u.provider
       where u.provider like 'parallel%'
         and u.day between v_period.period_start and v_period.period_end;
      if v_period_spent + v_price * p_units > v_period.limit_usd then
        v_reason := 'global_parallel_period_budget_exhausted';
        v_blocked_until := (v_period.period_end + 1)::timestamp at time zone 'UTC';
        insert into public.api_provider_backoff
          (scope, scope_key, blocked_until, reason_code, feature, competition, job_run_id, metadata)
        values
          ('global', 'parallel', v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))
        on conflict (scope, scope_key) do update
          set blocked_until = greatest(public.api_provider_backoff.blocked_until, excluded.blocked_until),
              reason_code = excluded.reason_code,
              feature = excluded.feature,
              competition = excluded.competition,
              job_run_id = excluded.job_run_id,
              metadata = excluded.metadata,
              updated_at = now();
      end if;
    end if;
  end if;

  if v_reason is null then
    v_granted := public.api_quota_claim(p_provider, p_units);
    if not v_granted then
      select q.daily_cap, q.monthly_cap,
             coalesce(sum(u.calls) filter (where u.day = v_today), 0),
             coalesce(sum(u.calls), 0)
        into v_daily_cap, v_monthly_cap, v_day_calls, v_month_calls
        from public.api_quota_limits q
        left join public.content_api_usage u
          on u.provider = q.provider
         and u.day >= date_trunc('month', v_today)::date
       where q.provider = p_provider
       group by q.daily_cap, q.monthly_cap;

      if not found then
        v_reason := 'provider_quota_not_configured';
        v_blocked_until := v_now + interval '15 minutes';
      elsif v_month_calls + p_units > v_monthly_cap then
        v_reason := 'provider_monthly_call_cap_exhausted';
        v_blocked_until := v_month_reset;
      else
        v_reason := 'provider_daily_call_cap_exhausted';
        v_blocked_until := ((v_today + 1)::timestamp at time zone 'UTC');
      end if;

      insert into public.api_provider_backoff
        (scope, scope_key, blocked_until, reason_code, feature, competition, job_run_id, metadata)
      values
        ('provider', p_provider, v_blocked_until, v_reason, v_feature, p_competition, p_job_run_id, coalesce(p_metadata, '{}'::jsonb))
      on conflict (scope, scope_key) do update
        set blocked_until = greatest(public.api_provider_backoff.blocked_until, excluded.blocked_until),
            reason_code = excluded.reason_code,
            feature = excluded.feature,
            competition = excluded.competition,
            job_run_id = excluded.job_run_id,
            metadata = excluded.metadata,
            updated_at = now();
    end if;
  end if;

  v_status := case when v_granted and v_reason is null then 'claimed' else 'denied' end;
  insert into public.api_call_events (
    attempt_id, provider, feature, consumer, operation, status, metadata,
    estimated_cost_usd, competition, job_run_id, reason_code
  ) values (
    v_attempt_id, p_provider, v_feature, v_consumer, v_operation, v_status,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'attribution_source', 'api_budget_claim_context',
      'budget_family', v_family,
      'claim_outcome', case when v_status = 'claimed' then 'granted' else 'denied' end,
      'reason_code', v_reason,
      'blocked_reason', v_backoff_reason,
      'blocked_until', v_blocked_until
    ),
    case when v_status = 'claimed' then v_price * p_units else 0 end,
    p_competition, p_job_run_id, v_reason
  );

  return jsonb_build_object(
    'granted', v_status = 'claimed',
    'attempt_id', v_attempt_id,
    'reason_code', v_reason,
    'blocked_until', v_blocked_until,
    'budget_family', v_family
  );
end;
$function$;

create or replace function public.api_call_event_result(
  p_attempt_id uuid,
  p_status text,
  p_reason_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_provider text;
  v_feature text;
  v_competition text;
  v_job_run_id uuid;
begin
  if p_status not in ('succeeded', 'failed') then
    raise exception 'bad_event_status' using errcode = '22023';
  end if;

  select provider, feature, competition, job_run_id
    into v_provider, v_feature, v_competition, v_job_run_id
    from public.api_call_events
   where attempt_id = p_attempt_id and status = 'claimed'
   for update;
  if not found then
    return false;
  end if;

  update public.api_call_events
     set status = p_status,
         reason_code = p_reason_code,
         completed_at = now(),
         metadata = metadata || coalesce(p_metadata, '{}'::jsonb) ||
           jsonb_build_object('completed_at', now(), 'reason_code', p_reason_code)
   where attempt_id = p_attempt_id;

  -- An upstream 402/429 is a hard refusal. Pause this exact provider for 30 minutes across cron invocations.
  if p_status = 'failed' and p_reason_code = 'upstream_quota' then
    insert into public.api_provider_backoff
      (scope, scope_key, blocked_until, reason_code, feature, competition, job_run_id, metadata)
    values
      ('provider', v_provider, now() + interval '30 minutes', 'upstream_quota_cooldown',
       v_feature, v_competition, v_job_run_id, jsonb_build_object('attempt_id', p_attempt_id))
    on conflict (scope, scope_key) do update
      set blocked_until = greatest(public.api_provider_backoff.blocked_until, excluded.blocked_until),
          reason_code = excluded.reason_code,
          feature = excluded.feature,
          competition = excluded.competition,
          job_run_id = excluded.job_run_id,
          metadata = excluded.metadata,
          updated_at = now();
  end if;

  return true;
end;
$function$;

revoke all on function public.api_budget_claim_context(text, integer, text, text, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.api_call_event_result(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.api_budget_claim_context(text, integer, text, text, uuid, uuid, jsonb) to service_role;
grant execute on function public.api_call_event_result(uuid, text, text, jsonb) to service_role;

comment on table public.api_provider_backoff is
  'Cross-job provider/family/global cooldowns after hard quota or spend denials. Expired rows are ignored and overwritten on the next denial.';

create or replace view public.api_call_usage_attribution_detail
with (security_invoker = true)
as
select
  id,
  attempt_id,
  provider,
  feature,
  consumer,
  operation,
  status,
  reason_code,
  competition,
  job_run_id,
  estimated_cost_usd,
  claimed_at,
  completed_at,
  metadata
from public.api_call_events
where claimed_at >= now() - interval '30 days';

grant select on public.api_call_usage_attribution_detail to service_role;

comment on view public.api_call_usage_attribution_detail is
  'Thirty-day API claim detail including competition/run context, final outcome, reason code and estimated cost.';
