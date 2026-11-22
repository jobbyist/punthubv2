-- Surface picks that are waiting for a verified result, rather than reporting an empty settlement queue.
-- This is read-only admin visibility; it does not grade or modify predictions.
create or replace function public.pending_result_fixtures()
returns table (
  fixture_id uuid,
  home text,
  away text,
  status text,
  kickoff_at timestamptz,
  pending integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    f.id,
    f.home,
    f.away,
    f.status,
    f.kickoff_at,
    count(p.id)::integer
  from public.fixtures f
  join public.predictions p on p.fixture_id = f.id
  where f.status in ('scheduled', 'live')
    and f.kickoff_at <= now() - interval '2 hours'
    and not exists (
      select 1
      from public.settlement_events s
      where s.prediction_id = p.id
    )
  group by f.id, f.home, f.away, f.status, f.kickoff_at
  order by f.kickoff_at asc
  limit 200;
$$;

revoke all on function public.pending_result_fixtures() from public, anon, authenticated;
grant execute on function public.pending_result_fixtures() to service_role;
