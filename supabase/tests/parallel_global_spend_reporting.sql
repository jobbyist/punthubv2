-- Regression: the shared Parallel period display must include every Parallel endpoint,
-- not only the core provider family. Run after the Phase 3.2 migration.
begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;

do $$
declare
  v_expected numeric;
  v_reported numeric;
  v_period_start date;
  v_period_end date;
begin
  select period_start, period_end
    into v_period_start, v_period_end
    from public.api_spend_period_limits
   where family = 'parallel';

  if v_period_start is null or v_period_end is null then
    raise exception 'Expected the shared Parallel period limit row';
  end if;

  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_expected
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where u.provider like 'parallel%'
     and u.day between v_period_start and v_period_end;

  select spent_usd
    into v_reported
    from public.api_spend_period_status()
   where family = 'parallel'
     and period_start = v_period_start
     and period_end = v_period_end;

  if v_reported is null then
    raise exception 'Expected the shared Parallel period status row';
  end if;

  if round(v_reported, 4) <> round(v_expected, 4) then
    raise exception 'Parallel global spend mismatch: reported %, expected %', v_reported, v_expected;
  end if;
end;
$$;

rollback;
