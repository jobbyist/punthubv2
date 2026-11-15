-- Parallel data layer foundation (docs/PARALLEL_ARCHITECTURE.md).
-- 1. parallel_cache: read-through cache for Parallel responses (service role only).
-- 2. api_unit_prices: USD per unit for each provider key.
-- 3. api_budgets: monthly USD budget per provider family ('parallel' covers parallel, parallel-extract,
--    parallel-task:*, parallel-chat:*, parallel-monitor:*).
-- 4. api_budget_claim(): budget check, then the existing call caps (api_quota_claim). Fails closed.
-- 5. api_spend_status(): spend this month per family, for /admin.
-- 6. Call caps for the new provider keys (an unknown provider has no allowance).
-- 7. Daily purge of expired cache rows.
-- No personal data is stored: cached responses are about teams, fixtures and competitions only.

-- 1. Cache ---------------------------------------------------------------------------------------------------------
create table if not exists public.parallel_cache (
  key text primary key,
  endpoint text not null,
  purpose text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists parallel_cache_expires_idx on public.parallel_cache (expires_at);
alter table public.parallel_cache enable row level security;
revoke all on public.parallel_cache from anon, authenticated;
grant select, insert, update, delete on public.parallel_cache to service_role;

-- 2. Prices --------------------------------------------------------------------------------------------------------
create table if not exists public.api_unit_prices (
  provider text primary key,
  usd_per_unit numeric(12, 6) not null check (usd_per_unit >= 0),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.api_unit_prices enable row level security;
revoke all on public.api_unit_prices from anon, authenticated;
grant select, insert, update on public.api_unit_prices to service_role;
drop policy if exists api_unit_prices_admin_read on public.api_unit_prices;
create policy api_unit_prices_admin_read on public.api_unit_prices for select to authenticated using (public.is_admin());
grant select on public.api_unit_prices to authenticated;

insert into public.api_unit_prices (provider, usd_per_unit, note) values
  ('parallel', 0.001, 'Search, fast mode, 10 results'),
  ('parallel-extract', 0.001, 'Extract, per URL'),
  ('parallel-task:lite', 0.005, 'Task API lite'),
  ('parallel-task:base', 0.010, 'Task API base'),
  ('parallel-task:core', 0.025, 'Task API core'),
  ('parallel-task:pro', 0.100, 'Task API pro'),
  ('parallel-chat:low', 0.010, 'Responses API, low reasoning'),
  ('parallel-chat:medium', 0.050, 'Responses API, medium reasoning'),
  ('parallel-monitor:lite', 0.003, 'Monitor lite, per execution'),
  ('parallel-monitor:base', 0.010, 'Monitor base, per execution')
on conflict (provider) do update set usd_per_unit = excluded.usd_per_unit, note = excluded.note, updated_at = now();

-- 3. Budgets -------------------------------------------------------------------------------------------------------
create table if not exists public.api_budgets (
  family text primary key,
  monthly_usd numeric(10, 2) not null check (monthly_usd >= 0),
  note text,
  updated_at timestamptz not null default now()
);
alter table public.api_budgets enable row level security;
revoke all on public.api_budgets from anon, authenticated;
grant select, insert, update on public.api_budgets to service_role;
drop policy if exists api_budgets_admin_read on public.api_budgets;
create policy api_budgets_admin_read on public.api_budgets for select to authenticated using (public.is_admin());
grant select on public.api_budgets to authenticated;

insert into public.api_budgets (family, monthly_usd, note) values
  ('parallel', 25.00,
   'November: front-loads one-off data jobs while the ~$50 prepaid balance lasts (expires 7 Dec 2026). Set to 5.00 on 7 Dec (free monthly credit).')
on conflict (family) do nothing;

-- Family of a provider key: 'parallel-task:lite' -> 'parallel'.
create or replace function public.api_provider_family(p_provider text)
returns text language sql immutable set search_path = public, pg_temp as $$
  select split_part(split_part(p_provider, ':', 1), '-', 1);
$$;

-- Spend this month (UTC) for one family, priced from api_unit_prices. A provider with no price counts as zero here;
-- api_budget_claim refuses such a provider instead.
create or replace function public.api_family_spend_usd(p_family text)
returns numeric language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
  from public.content_api_usage u
  join public.api_unit_prices p on p.provider = u.provider
  where public.api_provider_family(u.provider) = p_family
    and u.day >= date_trunc('month', now() at time zone 'utc')::date;
$$;

-- 4. Budget claim --------------------------------------------------------------------------------------------------
create or replace function public.api_budget_claim(p_provider text, p_units integer default 1)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_family text := public.api_provider_family(p_provider);
  v_budget public.api_budgets;
  v_price numeric;
  v_spent numeric;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode = '22023';
  end if;
  select * into v_budget from public.api_budgets where family = v_family;
  if found then
    select usd_per_unit into v_price from public.api_unit_prices where provider = p_provider;
    if v_price is null then
      -- Budgeted family but unknown price: we cannot tell what it costs, so refuse.
      insert into public.content_api_usage (provider, day, calls, errors, refused) values (p_provider, v_today, 0, 0, 1)
      on conflict (provider, day) do update set refused = public.content_api_usage.refused + 1;
      return false;
    end if;
    perform pg_advisory_xact_lock(hashtext('api_budget:' || v_family));
    v_spent := public.api_family_spend_usd(v_family);
    if v_spent + v_price * p_units > v_budget.monthly_usd then
      insert into public.content_api_usage (provider, day, calls, errors, refused) values (p_provider, v_today, 0, 0, 1)
      on conflict (provider, day) do update set refused = public.content_api_usage.refused + 1;
      return false;
    end if;
  end if;
  return public.api_quota_claim(p_provider, p_units);
end;
$$;

-- 5. Spend status for /admin ---------------------------------------------------------------------------------------
create or replace function public.api_spend_status()
returns table (family text, monthly_usd numeric, spent_usd numeric, remaining_usd numeric)
language sql stable security definer set search_path = public, pg_temp as $$
  -- Spend is computed once per row (lateral), so spent and remaining always agree.
  select b.family, b.monthly_usd, round(s.spent, 4), round(b.monthly_usd - s.spent, 4)
  from public.api_budgets b
  cross join lateral (select public.api_family_spend_usd(b.family) as spent) s
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by b.family;
$$;

revoke all on function public.api_provider_family(text) from public, anon, authenticated;
revoke all on function public.api_family_spend_usd(text) from public, anon, authenticated;
revoke all on function public.api_budget_claim(text, integer) from public, anon, authenticated;
revoke all on function public.api_spend_status() from public, anon;
grant execute on function public.api_provider_family(text), public.api_family_spend_usd(text),
  public.api_budget_claim(text, integer) to service_role;
grant execute on function public.api_spend_status() to authenticated, service_role;

-- 6. Call caps for the new provider keys (the USD budget above is the real ceiling) --------------------------------
insert into public.api_quota_limits (provider, daily_cap, monthly_cap, note) values
  ('parallel-task:lite', 60, 1200, 'Task API lite: H2H, team profiles, featured-fixture briefs'),
  ('parallel-task:base', 20, 300, 'Task API base: wider research when lite is not enough'),
  ('parallel-task:core', 10, 60, 'Task API core: evergreen deep-research briefs only'),
  ('parallel-chat:low', 100, 2000, 'Punt AI live-web answers for paid members'),
  ('parallel-monitor:lite', 20, 500, 'Team news monitors, one per league, daily')
on conflict (provider) do nothing;

-- 7. Purge expired cache rows daily at 03:15 SAST ------------------------------------------------------------------
select cron.unschedule('parallel-cache-purge') where exists (select 1 from cron.job where jobname = 'parallel-cache-purge');
select cron.schedule('parallel-cache-purge', '15 1 * * *',
  $$delete from public.parallel_cache where expires_at < now()$$);
