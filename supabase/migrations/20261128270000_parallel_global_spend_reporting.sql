-- Phase 3.2: report the shared Parallel cumulative allowance using the same
-- provider scope enforced by api_budget_claim. The period row named "parallel"
-- represents the global cap, not only the monthly core family.
create or replace function private.api_spend_period_status()
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
set search_path to public, pg_temp
as $function$
  select
    l.family,
    l.period_start,
    l.period_end,
    l.limit_usd,
    round(coalesce(s.spent, 0), 4) as spent_usd,
    round(l.limit_usd - coalesce(s.spent, 0), 4) as remaining_usd
  from public.api_spend_period_limits l
  left join lateral (
    select sum(u.calls * p.usd_per_unit) as spent
      from public.content_api_usage u
      join public.api_unit_prices p on p.provider = u.provider
     where
       case
         when l.family = 'parallel' then u.provider like 'parallel%'
         else public.api_provider_family(u.provider) = l.family
       end
       and u.day between l.period_start and l.period_end
  ) s on true
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by l.family;
$function$;

comment on function private.api_spend_period_status() is
  'Returns family-period spend. The parallel period row is the global cumulative Parallel cap and includes all parallel% endpoints, matching api_budget_claim enforcement.';
