-- Keep the displayed shared Parallel spend aligned with api_budget_claim enforcement.
-- The global period guard counts every provider whose label starts with "parallel".
-- The previous reporting function grouped by api_provider_family and therefore omitted
-- Parallel Responses Low/Medium and other endpoint families from the shared $200 total.
create or replace function private.api_spend_period_status()
returns table(
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
set search_path to public, private, pg_temp
as $function$
  select
    l.family,
    l.period_start,
    l.period_end,
    l.limit_usd,
    round(s.spent, 4),
    case when s.spent is null then null else round(l.limit_usd - s.spent, 4) end
  from public.api_spend_period_limits l
  left join lateral (
    select
      case
        -- Never publish a misleadingly low spend total if a used endpoint has no configured unit price.
        when count(*) filter (where p.provider is null) > 0 then null
        else coalesce(sum(u.calls * p.usd_per_unit), 0)
      end as spent
    from public.content_api_usage u
    left join public.api_unit_prices p on p.provider = u.provider
    where
      (
        case
          when l.family = 'parallel' then u.provider like 'parallel%'
          else public.api_provider_family(u.provider) = l.family
        end
      )
      and u.calls > 0
      and u.day between l.period_start and l.period_end
  ) s on true
  where public.is_admin() or coalesce(auth.role(), '') = 'service_role'
  order by l.family;
$function$;
