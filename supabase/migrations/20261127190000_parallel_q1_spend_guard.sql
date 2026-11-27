-- Parallel budget controls for the remaining Q1 operating balance.
-- Monthly cap is raised to $50, while a cumulative $200 guard limits spend from 28 Nov 2026
-- through 31 Mar 2027. Medium Responses is constrained to 15 calls/day and 450/month;
-- once reached, the existing model router falls back to the approved Gemini models.

create table if not exists public.api_spend_period_limits (
  family text primary key references public.api_budgets(family) on delete cascade,
  period_start date not null,
  period_end date not null,
  limit_usd numeric(10, 2) not null check (limit_usd >= 0),
  note text,
  updated_at timestamptz not null default now(),
  constraint api_spend_period_limits_valid_range check (period_end >= period_start)
);

alter table public.api_spend_period_limits enable row level security;
revoke all on public.api_spend_period_limits from anon, authenticated;
grant select, insert, update on public.api_spend_period_limits to service_role;
drop policy if exists api_spend_period_limits_admin_read on public.api_spend_period_limits;
create policy api_spend_period_limits_admin_read
  on public.api_spend_period_limits for select to authenticated using (public.is_admin());
grant select on public.api_spend_period_limits to authenticated;

insert into public.api_spend_period_limits (family, period_start, period_end, limit_usd, note)
values (
  'parallel',
  '2026-11-28',
  '2027-03-31',
  200.00,
  'Cumulative remaining Parallel allowance for 28 Nov 2026 through 31 Mar 2027; do not exceed $200.'
)
on conflict (family) do update
set period_start = excluded.period_start,
    period_end = excluded.period_end,
    limit_usd = excluded.limit_usd,
    note = excluded.note,
    updated_at = now();

update public.api_budgets
set monthly_usd = 50.00,
    note = 'Temporary $50 monthly Parallel ceiling; additionally constrained by the cumulative $200 limit through 31 Mar 2027.',
    updated_at = now()
where family = 'parallel';

update public.api_quota_limits
set daily_cap = 15,
    monthly_cap = 450,
    note = 'Newsroom Responses Medium: maximum 15 calls/day and 450/month ($22.50 at current unit price); quota refusal automatically falls back to approved Gemini models.',
    updated_at = now()
where provider = 'parallel-chat:medium';

create or replace function public.api_budget_claim(p_provider text, p_units integer default 1)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_family text := public.api_provider_family(p_provider);
  v_budget public.api_budgets;
  v_period public.api_spend_period_limits;
  v_price numeric;
  v_spent numeric;
  v_period_spent numeric;
  v_today date := (now() at time zone 'utc')::date;
begin
  if p_units is null or p_units < 1 or p_units > 100 then
    raise exception 'bad_units' using errcode = '22023';
  end if;

  select * into v_budget from public.api_budgets where family = v_family;
  if found then
    select usd_per_unit into v_price from public.api_unit_prices where provider = p_provider;
    if v_price is null then
      insert into public.content_api_usage (provider, day, calls, errors, refused)
      values (p_provider, v_today, 0, 0, 1)
      on conflict (provider, day) do update
        set refused = public.content_api_usage.refused + 1;
      return false;
    end if;

    perform pg_advisory_xact_lock(hashtext('api_budget:' || v_family));

    v_spent := public.api_family_spend_usd(v_family);
    if v_spent + v_price * p_units > v_budget.monthly_usd then
      insert into public.content_api_usage (provider, day, calls, errors, refused)
      values (p_provider, v_today, 0, 0, 1)
      on conflict (provider, day) do update
        set refused = public.content_api_usage.refused + 1;
      return false;
    end if;

    select * into v_period
      from public.api_spend_period_limits
     where family = v_family
       and v_today between period_start and period_end;
    if found then
      select coalesce(sum(u.calls * p.usd_per_unit), 0)
        into v_period_spent
        from public.content_api_usage u
        join public.api_unit_prices p on p.provider = u.provider
       where public.api_provider_family(u.provider) = v_family
         and u.day between v_period.period_start and v_period.period_end;
      if v_period_spent + v_price * p_units > v_period.limit_usd then
        insert into public.content_api_usage (provider, day, calls, errors, refused)
        values (p_provider, v_today, 0, 0, 1)
        on conflict (provider, day) do update
          set refused = public.content_api_usage.refused + 1;
        return false;
      end if;
    end if;
  end if;

  return public.api_quota_claim(p_provider, p_units);
end;
$$;

create or replace function public.api_spend_period_status()
returns table (
  family text,
  period_start date,
  period_end date,
  limit_usd numeric,
  spent_usd numeric,
  remaining_usd numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    l.family,
    l.period_start,
    l.period_end,
    l.limit_usd,
    round(coalesce(s.spent, 0), 4),
    round(l.limit_usd - coalesce(s.spent, 0), 4)
  from public.api_spend_period_limits l
  left join lateral (
    select sum(u.calls * p.usd_per_unit) as spent
      from public.content_api_usage u
      join public.api_unit_prices p on p.provider = u.provider
     where public.api_provider_family(u.provider) = l.family
       and u.day between l.period_start and l.period_end
  ) s on true
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by l.family;
$$;

revoke all on function public.api_budget_claim(text, integer) from public, anon, authenticated;
revoke all on function public.api_spend_period_status() from public, anon;
grant execute on function public.api_budget_claim(text, integer) to service_role;
grant execute on function public.api_spend_period_status() to authenticated, service_role;
