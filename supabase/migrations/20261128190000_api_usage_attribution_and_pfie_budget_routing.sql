-- Enrich API attribution history while preserving the original quota-claim ledger.
alter table public.api_call_events
  add column if not exists consumer text,
  add column if not exists operation text,
  add column if not exists status text not null default 'claimed',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists estimated_cost_usd numeric(12,6);

update public.api_call_events
set
  consumer = case when feature = 'unattributed' then 'unattributed' else split_part(feature, ':', 1) end,
  operation = case when feature = 'unattributed' then 'unknown' else coalesce(nullif(substr(feature, length(split_part(feature, ':', 1)) + 2), ''), 'request') end,
  status = case when feature = 'unattributed' then 'legacy_unattributed' else 'claimed' end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('backfilled_attribution', true)
where consumer is null or operation is null;

create index if not exists api_call_events_claimed_at_idx
  on public.api_call_events (claimed_at desc);
create index if not exists api_call_events_consumer_feature_idx
  on public.api_call_events (consumer, feature, claimed_at desc);

create or replace function public.set_api_call_event_cost()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.estimated_cost_usd is null then
    select usd_per_unit into new.estimated_cost_usd
    from public.api_unit_prices
    where provider = new.provider;
  end if;
  return new;
end;
$$;

drop trigger if exists api_call_events_estimated_cost on public.api_call_events;
create trigger api_call_events_estimated_cost
before insert on public.api_call_events
for each row execute function public.set_api_call_event_cost();

-- PFIE has a dedicated share of the existing core $50 monthly Parallel budget.
-- Other low-effort chat consumers retain their existing auxiliary reserve.
create or replace function public.api_budget_claim(p_provider text, p_units integer, p_feature text)
returns boolean
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_family text := public.api_provider_family(p_provider);
  v_feature text := coalesce(nullif(trim(p_feature), ''), 'unattributed');
  v_budget public.api_budgets;
  v_period public.api_spend_period_limits;
  v_price numeric;
  v_spent numeric;
  v_period_spent numeric;
  v_today date := (now() at time zone 'utc')::date;
  v_synthetic boolean := v_feature like 'synthetic:%' or v_feature like 'ai-community:%';
  v_granted boolean;
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode='22023';
  end if;

  if v_feature like 'pfie:%' then
    v_family := 'parallel';
  elsif v_synthetic then
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
      -- Include both experiment-ledger spend and every attributable synthetic/AI-community API call.
      -- GREATEST avoids double-counting experiment costs that are already represented in the API event ledger.
      select coalesce(sum(estimated_cost_usd), 0)
        into v_spent
        from public.api_call_events
       where (feature like 'synthetic:%' or feature like 'ai-community:%')
         and claimed_at >= date_trunc('month', now() at time zone 'utc');
      v_spent := greatest(
        v_spent,
        (select coalesce(sum(spent_usd), 0)
           from public.synthetic_experiments
          where created_at >= date_trunc('month', now() at time zone 'utc')::date)
      );
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

  v_granted := public.api_quota_claim(p_provider,p_units);
  if v_granted then
    insert into public.api_call_events (
      provider, feature, consumer, operation, status, metadata
    ) values (
      p_provider,
      v_feature,
      split_part(v_feature, ':', 1),
      coalesce(nullif(substr(v_feature, length(split_part(v_feature, ':', 1)) + 2), ''), 'request'),
      'claimed',
      jsonb_build_object('attribution_source', 'api_budget_claim', 'budget_family', v_family)
    );
  end if;
  return v_granted;
end;
$function$;

create or replace function public.api_family_spend_usd(p_family text)
returns numeric
language plpgsql
stable
security definer
set search_path to public, pg_temp
as $function$
declare
  v_spent numeric := 0;
  v_pfie_low numeric := 0;
begin
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_spent
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where public.api_provider_family(u.provider) = p_family
     and u.day >= date_trunc('month', now() at time zone 'utc')::date;

  -- Parallel Responses low is normally in the auxiliary reserve. PFIE-tagged calls are reassigned to core.
  if p_family in ('parallel', 'parallel-aux') then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_low
      from public.api_call_events
     where provider = 'parallel-chat:low'
       and feature like 'pfie:%'
       and claimed_at >= date_trunc('month', now() at time zone 'utc');
    if p_family = 'parallel' then
      v_spent := v_spent + v_pfie_low;
    else
      v_spent := greatest(0, v_spent - v_pfie_low);
    end if;
  end if;

  return v_spent;
end;
$function$;

-- Team badges may be verified from official team/league pages discovered by Parallel Search.
alter table public.team_badges drop constraint if exists team_badges_method_check;
alter table public.team_badges
  add constraint team_badges_method_check
  check (method is null or method = any (array[
    'parallel_wikipedia'::text,
    'parallel_sofascore'::text,
    'parallel_official'::text,
    'manual'::text
  ]));

-- Give Parallel Responses low enough daily headroom for PFIE + PUNT AI while retaining the existing monthly cap
-- and USD family guards. The PFIE feature tag routes its spend to core; PUNT AI remains in auxiliary.
update public.api_quota_limits
set daily_cap = 250,
    note = 'Parallel Responses low for PFIE structured extraction and PUNT AI live-web; PFIE-tagged usage is charged to the $50 core family, PUNT AI to the $35 auxiliary family. Monthly 3,000 cap and $280 cumulative guard remain in force.'
where provider = 'parallel-chat:low';

create or replace view public.api_call_usage_attribution
with (security_invoker = true)
as
select
  provider,
  feature,
  coalesce(consumer, split_part(feature, ':', 1)) as consumer,
  coalesce(operation, 'request') as operation,
  count(*)::bigint as calls,
  coalesce(sum(estimated_cost_usd), 0)::numeric(12,6) as estimated_usd,
  max(claimed_at) as last_call
from public.api_call_events
where claimed_at >= now() - interval '7 days'
group by provider, feature, consumer, operation;
grant select on public.api_call_usage_attribution to service_role;
