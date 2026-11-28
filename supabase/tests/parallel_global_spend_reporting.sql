-- Regression: the shared Parallel period display must include every Parallel endpoint,
-- not only the core provider family. Run after the Phase 3.1 migration.
begin;
set local request.jwt.claim.role = 'service_role';
set local role service_role;

do $$
declare
  v_expected numeric;
  v_reported numeric;
begin
  select coalesce(sum(u.calls * p.usd_per_unit), 0)
    into v_expected
    from public.content_api_usage u
    join public.api_unit_prices p on p.provider = u.provider
   where u.provider like 'parallel%'
     and u.day between date '2026-11-28' and date '2027-03-31';

  select spent_usd
    into v_reported
    from private.api_spend_period_status()
   where family = 'parallel'
     and period_start = date '2026-11-28'
     and period_end = date '2027-03-31';

  if v_reported is null then
    raise exception 'Expected the shared Parallel period status row';
  end if;

  if round(v_reported, 4) <> round(v_expected, 4) then
    raise exception 'Parallel global spend mismatch: reported %, expected %', v_reported, v_expected;
  end if;
end;
$$;

rollback;
