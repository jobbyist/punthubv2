-- Settlement watchdog: isolate unresolved member picks and active duels from the general PFIE
-- backlog so their fixtures receive high-priority result checks without polling every match.
create or replace function public.pending_settlement_result_fixtures()
returns table (
  fixture_id uuid,
  provider text,
  provider_ref text,
  competition text,
  home text,
  away text,
  kickoff_at timestamptz,
  pending integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    f.id,
    f.provider,
    f.provider_ref,
    f.competition,
    f.home,
    f.away,
    f.kickoff_at,
    (
      select count(*)::integer
      from public.predictions p
      where p.fixture_id = f.id
        and not exists (
          select 1 from public.settlement_events s where s.prediction_id = p.id
        )
    ) + (
      select count(*)::integer
      from public.duels d
      where d.fixture_id = f.id and d.status = 'active'
    ) as pending
  from public.fixtures f
  where f.status in ('scheduled', 'live')
    and f.kickoff_at <= now() - interval '105 minutes'
    and f.kickoff_at >= now() - interval '12 hours'
    and (
      exists (
        select 1
        from public.predictions p
        where p.fixture_id = f.id
          and not exists (
            select 1 from public.settlement_events s where s.prediction_id = p.id
          )
      )
      or exists (
        select 1 from public.duels d
        where d.fixture_id = f.id and d.status = 'active'
      )
    )
  order by f.kickoff_at asc
  limit 200;
$$;

revoke all on function public.pending_settlement_result_fixtures() from public, anon, authenticated;
grant execute on function public.pending_settlement_result_fixtures() to service_role;

-- Result watchdog every five minutes; only fixtures with unsettled picks or active duels are queried.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'settlement-results-watchdog') then
    perform cron.alter_job(
      (select jobid from cron.job where jobname = 'settlement-results-watchdog' limit 1),
      '*/5 * * * *',
      $cmd$select public.invoke_cron('/api/cron/sync-results?priority=1')$cmd$,
      null, null, true
    );
  else
    perform cron.schedule(
      'settlement-results-watchdog',
      '*/5 * * * *',
      $cmd$select public.invoke_cron('/api/cron/sync-results?priority=1')$cmd$
    );
  end if;

  -- Settlement runs independently every two minutes and the route isolates pick and duel failures.
  if exists (select 1 from cron.job where jobname = 'settle') then
    perform cron.alter_job(
      (select jobid from cron.job where jobname = 'settle' limit 1),
      '*/2 * * * *',
      null, null, null, true
    );
  end if;
end
$$;
