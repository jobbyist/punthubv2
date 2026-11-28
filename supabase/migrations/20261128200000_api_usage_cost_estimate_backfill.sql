-- Backfill per-call cost estimates for historical API events using the configured unit-price ledger.
update public.api_call_events e
set estimated_cost_usd = p.usd_per_unit
from public.api_unit_prices p
where p.provider = e.provider
  and e.estimated_cost_usd is null;

create or replace view public.api_call_usage_attribution
with (security_invoker = true)
as
select
  provider,
  feature,
  coalesce(consumer, split_part(feature, ':', 1)) as consumer,
  coalesce(operation, 'request') as operation,
  count(*)::bigint as calls,
  coalesce(sum(coalesce(estimated_cost_usd, (
    select p.usd_per_unit from public.api_unit_prices p where p.provider = api_call_events.provider
  ))), 0)::numeric(12,6) as estimated_usd,
  max(claimed_at) as last_call
from public.api_call_events
where claimed_at >= now() - interval '7 days'
group by provider, feature, consumer, operation;

grant select on public.api_call_usage_attribution to service_role;
