-- Phase 3.3 corrective audit: include PFIE Responses Medium in the core PFIE budget
-- and expose usage detail to authenticated admins through invoker RLS.

create or replace function public.api_family_spend_usd(p_family text)
returns numeric
language plpgsql
security definer
set search_path to public, pg_temp
as $function$
declare
  v_spent numeric := 0;
  v_pfie_low numeric := 0;
  v_pfie_medium numeric := 0;
  v_synthetic_events numeric := 0;
  v_synthetic_experiments numeric := 0;
  v_month_start timestamptz := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
begin
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_spent
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where public.api_provider_family(u.provider) = p_family
     and u.day >= (v_month_start at time zone 'UTC')::date;

  if p_family in ('parallel', 'parallel-aux', 'parallel-newsroom') then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_low
      from public.api_call_events
     where provider = 'parallel-chat:low'
       and feature like 'pfie:%'
       and claimed_at >= v_month_start;

    select coalesce(sum(estimated_cost_usd), 0)
      into v_pfie_medium
      from public.api_call_events
     where provider = 'parallel-chat:medium'
       and feature like 'pfie:%'
       and claimed_at >= v_month_start;

    if p_family = 'parallel' then
      v_spent := v_spent + v_pfie_low + v_pfie_medium;
    elsif p_family = 'parallel-aux' then
      v_spent := greatest(0, v_spent - v_pfie_low);
    elsif p_family = 'parallel-newsroom' then
      v_spent := greatest(0, v_spent - v_pfie_medium);
    end if;
  end if;

  if p_family = 'parallel-synthetic' then
    select coalesce(sum(estimated_cost_usd), 0)
      into v_synthetic_events
      from public.api_call_events
     where (feature like 'synthetic:%' or feature like 'ai-community:%')
       and provider like 'parallel%'
       and claimed_at >= v_month_start;

    select coalesce(sum(spent_usd), 0)
      into v_synthetic_experiments
      from public.synthetic_experiments
     where created_at >= v_month_start;

    v_spent := greatest(v_spent, v_synthetic_events, v_synthetic_experiments);
  end if;

  return v_spent;
end;
$function$;

-- The view is security-invoker. The base-table policy below restricts authenticated reads to admins.
alter view public.api_call_usage_attribution_detail set (security_invoker = true);
grant select on public.api_call_events to authenticated;
drop policy if exists api_call_events_admin_read on public.api_call_events;
create policy api_call_events_admin_read
  on public.api_call_events
  for select
  to authenticated
  using (public.is_admin());
grant select on public.api_call_usage_attribution_detail to authenticated;

comment on view public.api_call_usage_attribution_detail is
  'Admin-only 30-day provider usage detail with PFIE competition, job-run, status, reason and estimated-cost attribution.';
