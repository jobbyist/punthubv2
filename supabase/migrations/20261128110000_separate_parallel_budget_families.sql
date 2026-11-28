-- Separate Parallel spend families that were previously collapsed into one shared bucket.
-- Preserve the $50 core and newsroom monthly caps, the $35 shared PUNT AI/monitor/task-lite cap,
-- and add a dedicated $50 synthetic experiment family. All Parallel families share one $280
-- cumulative ceiling through 31 March 2027 (the previous $230 allowance plus the new $50 synthetic allocation).

create or replace function public.api_provider_family(p_provider text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_provider = 'parallel-chat:medium' then 'parallel-newsroom'
    when p_provider in ('parallel-chat:low', 'parallel-monitor:lite', 'parallel-task:lite') then 'parallel-aux'
    else split_part(split_part(p_provider, ':', 1), '-', 1)
  end;
$$;

insert into public.api_budgets (family, monthly_usd, note, updated_at)
values
  ('parallel', 50.00, 'Core Parallel Search/Extract and Task base/core: $50 monthly; subject to the shared $280 cumulative allowance through 31 Mar 2027.', now()),
  ('parallel-newsroom', 50.00, 'Parallel Responses Medium for Newsroom only: $50 monthly; subject to the shared $280 cumulative allowance through 31 Mar 2027.', now()),
  ('parallel-aux', 35.00, 'Shared $35 monthly reserve for PUNT AI live-web, Parallel Monitor lite and Parallel Task lite; subject to the shared $280 cumulative allowance through 31 Mar 2027.', now()),
  ('parallel-synthetic', 50.00, 'Dedicated $50 monthly ceiling for synthetic QA and synthetic AI community activity; also constrained by the experiment ledger cap and shared $280 cumulative allowance.', now())
on conflict (family) do update
set monthly_usd = excluded.monthly_usd,
    note = excluded.note,
    updated_at = now();

update public.api_spend_period_limits
set limit_usd = 280.00,
    note = 'Cumulative Parallel allowance increased by $50 to $280 for 28 Nov 2026 through 31 Mar 2027. Includes the prior $230 allowance (including reserved $30 for owner-designated tasks) plus a dedicated $50 synthetic QA allocation.',
    updated_at = now()
where family = 'parallel'
  and period_start = date '2026-11-28'
  and period_end = date '2027-03-31';

create or replace function public.api_budget_claim(
  p_provider text,
  p_units integer,
  p_feature text
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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
      select coalesce(sum(spent_usd), 0)
        into v_spent
        from public.synthetic_experiments
       where created_at >= date_trunc('month', now() at time zone 'utc')::date;
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
$$;

-- Compatibility wrapper for older deployments during the rolling release. Missing feature labels are
-- conservatively treated as non-synthetic and therefore cannot consume the synthetic allocation.
create or replace function public.api_budget_claim(
  p_provider text,
  p_units integer default 1
) returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.api_budget_claim(p_provider, p_units, 'unattributed');
$$;

revoke all on function public.api_budget_claim(text, integer, text) from public, anon, authenticated;
revoke all on function public.api_budget_claim(text, integer) from public, anon, authenticated;
grant execute on function public.api_budget_claim(text, integer, text) to service_role;
grant execute on function public.api_budget_claim(text, integer) to service_role;

update public.api_quota_limits
set daily_cap = 500,
    note = 'Launch usage guard: 500 calls/day and 7,500/month; subject to the $50 monthly core Parallel family cap and shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel';

update public.api_quota_limits
set daily_cap = 400,
    note = 'Launch usage guard: 400 calls/day and 6,000/month; subject to the $50 monthly core Parallel family cap and shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-extract';

update public.api_quota_limits
set note = 'Parallel Responses Medium for Newsroom only; subject to its separate $50 monthly family cap and shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-chat:medium';

update public.api_quota_limits
set note = 'PUNT AI live-web answers; shared $35 monthly reserve with Parallel Monitor lite and Parallel Task lite; subject to the shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-chat:low';

update public.api_quota_limits
set note = 'Targeted team/news monitoring; shared $35 monthly reserve with PUNT AI live-web and Parallel Task lite; subject to the shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-monitor:lite';

update public.api_quota_limits
set note = 'PFIE match briefs, head-to-head and team profiles; shared $35 monthly reserve with PUNT AI live-web and Parallel Monitor lite; subject to the shared $280 cumulative allowance through 31 Mar 2027.',
    updated_at = now()
where provider = 'parallel-task:lite';
