-- Give every new API usage event an explicit consumer. Historical rows remain honestly marked as legacy-unattributed.
alter table public.api_call_events
  add column if not exists consumer text not null default 'legacy-unattributed';

create index if not exists api_call_events_consumer_claimed_idx
  on public.api_call_events (consumer, claimed_at desc);
create index if not exists api_call_events_feature_claimed_idx
  on public.api_call_events (feature, claimed_at desc);

-- Four-argument budget claim is the canonical path. The consumer is recorded separately from the feature.
create or replace function public.api_budget_claim(
  p_provider text,
  p_units integer,
  p_feature text,
  p_consumer text
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_family text := public.api_provider_family(p_provider);
  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');
  v_consumer text := coalesce(nullif(trim(p_consumer), ''), split_part(v_feature, ':', 1));
  v_budget public.api_budgets;
  v_period public.api_spend_period_limits;
  v_price numeric;
  v_spent numeric;
  v_community_spent numeric;
  v_period_spent numeric;
  v_today date := (now() at time zone 'utc')::date;
  v_month_start date := date_trunc('month', now() at time zone 'utc')::date;
  v_synthetic boolean := v_feature like 'synthetic:%'
    or v_feature like 'ai-community:%'
    or v_consumer in ('synthetic', 'ai-community');
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode='22023';
  end if;

  if v_synthetic then
    v_family := 'parallel-synthetic';
  end if;

  select * into v_budget from public.api_budgets where family = v_family;
  if found then
    select usd_per_unit into v_price from public.api_unit_prices where provider = p_provider;
    if v_price is null then
      insert into public.content_api_usage(provider,day,calls,errors,refused)
      values(p_provider,v_today,0,0,1)
      on conflict(provider,day) do update set refused = public.content_api_usage.refused + 1;
      return false;
    end if;

    perform pg_advisory_xact_lock(hashtext('api_budget:' || v_family));

    if v_synthetic then
      -- Synthetic QA (Playwright + Parallel) is tracked in its experiment ledger.
      select coalesce(sum(spent_usd), 0)
        into v_spent
        from public.synthetic_experiments
       where created_at >= v_month_start;

      -- Synthetic AI community activity is tracked per API call and shares the same $50 ceiling.
      select coalesce(sum(p.usd_per_unit), 0)
        into v_community_spent
        from public.api_call_events e
        join public.api_unit_prices p on p.provider = e.provider
       where (e.consumer = 'ai-community' or e.feature like 'ai-community:%')
         and e.claimed_at >= v_month_start;

      v_spent := v_spent + v_community_spent;
    else
      v_spent := public.api_family_spend_usd(v_family);
    end if;

    if v_spent + v_price * p_units > v_budget.monthly_usd then
      insert into public.content_api_usage(provider,day,calls,errors,refused)
      values(p_provider,v_today,0,0,1)
      on conflict(provider,day) do update set refused = public.content_api_usage.refused + 1;
      return false;
    end if;
  end if;

  -- One cumulative allowance across all Parallel endpoints, regardless of monthly family.
  if p_provider like 'parallel%' then
    perform pg_advisory_xact_lock(hashtext('api_budget:parallel-global'));
    select * into v_period
      from public.api_spend_period_limits
     where family = 'parallel'
       and v_today between period_start and period_end;
    if found then
      select coalesce(sum(u.calls * p.usd_per_unit), 0)
        into v_period_spent
        from public.content_api_usage u
        join public.api_unit_prices p on p.provider = u.provider
       where u.provider like 'parallel%'
         and u.day between v_period.period_start and v_period.period_end;
      if v_period_spent + v_price * p_units > v_period.limit_usd then
        insert into public.content_api_usage(provider,day,calls,errors,refused)
        values(p_provider,v_today,0,0,1)
        on conflict(provider,day) do update set refused = public.content_api_usage.refused + 1;
        return false;
      end if;
    end if;
  end if;

  return public.api_quota_claim(p_provider,p_units);
end;
$function$;

-- Preserve the old signatures for compatibility; feature prefixes provide a best-effort consumer label.
create or replace function public.api_budget_claim(p_provider text, p_units integer, p_feature text)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select public.api_budget_claim(
    p_provider,
    p_units,
    p_feature,
    split_part(coalesce(nullif(trim(p_feature), ''), 'unattributed'), ':', 1)
  );
$function$;

create or replace function public.api_budget_claim(p_provider text, p_units integer default 1)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select public.api_budget_claim(p_provider, p_units, 'unattributed', 'legacy-unattributed');
$function$;

revoke all on function public.api_budget_claim(text, integer, text, text) from public, anon, authenticated;
grant execute on function public.api_budget_claim(text, integer, text, text) to service_role;

-- Report the same synthetic spend calculation used by the $50 family gate.
create or replace function public.api_spend_status()
returns table(family text, monthly_usd numeric, spent_usd numeric, remaining_usd numeric)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with bounds as (
    select date_trunc('month', now() at time zone 'utc')::date as month_start
  ),
  synthetic_qa as (
    select coalesce(sum(spent_usd), 0) as spent
    from public.synthetic_experiments, bounds
    where created_at >= bounds.month_start
  ),
  synthetic_community as (
    select coalesce(sum(p.usd_per_unit), 0) as spent
    from public.api_call_events e
    join public.api_unit_prices p on p.provider = e.provider
    cross join bounds
    where (e.consumer = 'ai-community' or e.feature like 'ai-community:%')
      and e.claimed_at >= bounds.month_start
  ),
  family_spend as (
    select b.family, b.monthly_usd,
      case when b.family = 'parallel-synthetic'
        then synthetic_qa.spent + synthetic_community.spent
        else public.api_family_spend_usd(b.family)
      end as spent
    from public.api_budgets b
    cross join synthetic_qa
    cross join synthetic_community
  )
  select family, monthly_usd, round(spent, 4), round(monthly_usd - spent, 4)
  from family_spend
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by family;
$function$;

-- Consumer/feature/provider breakdown for the admin System panel.
create or replace function public.api_usage_attribution_status(p_days integer default 7)
returns table(
  consumer text,
  feature text,
  provider text,
  calls bigint,
  estimated_usd numeric,
  last_call timestamptz
)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select
    coalesce(nullif(e.consumer, ''), 'legacy-unattributed'),
    coalesce(nullif(e.feature, ''), 'unattributed'),
    e.provider,
    count(*)::bigint,
    round(coalesce(sum(p.usd_per_unit), 0), 4),
    max(e.claimed_at)
  from public.api_call_events e
  left join public.api_unit_prices p on p.provider = e.provider
  where e.claimed_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
  group by e.consumer, e.feature, e.provider
  order by count(*) desc, e.consumer, e.feature, e.provider
  limit 100;
$function$;

revoke all on function public.api_usage_attribution_status(integer) from public, anon, authenticated;
grant execute on function public.api_usage_attribution_status(integer) to service_role;
