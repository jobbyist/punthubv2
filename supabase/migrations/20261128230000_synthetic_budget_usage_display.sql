-- Ensure the Admin API Usage budget cards reflect all synthetic activity, not only provider-family aggregates.
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
  v_synthetic_events numeric := 0;
  v_synthetic_experiments numeric := 0;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'utc');
begin
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_spent
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where public.api_provider_family(u.provider) = p_family
     and u.day >= v_month_start::date;

  -- Parallel Responses low is normally in the auxiliary reserve. PFIE-tagged calls are reassigned to core.
  if p_family in ('parallel', 'parallel-aux') then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_low
      from public.api_call_events
     where provider = 'parallel-chat:low'
       and feature like 'pfie:%'
       and claimed_at >= v_month_start;
    if p_family = 'parallel' then
      v_spent := v_spent + v_pfie_low;
    else
      v_spent := greatest(0, v_spent - v_pfie_low);
    end if;
  end if;

  -- Synthetic QA experiments and synthetic AI community activity share the dedicated reserve.
  if p_family = 'parallel-synthetic' then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_synthetic_events
      from public.api_call_events
     where (feature like 'synthetic:%' or feature like 'ai-community:%')
       and claimed_at >= v_month_start;

    select coalesce(sum(spent_usd), 0)
      into v_synthetic_experiments
      from public.synthetic_experiments
     where created_at >= v_month_start::date;

    -- The experiment ledger may already include event-ledger spend; use the greater value, not the sum.
    v_spent := greatest(v_spent, v_synthetic_events, v_synthetic_experiments);
  end if;

  return v_spent;
end;
$function$;
