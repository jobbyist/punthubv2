-- P9: automatic settlement. Grading itself happens in src/lib/settlement.ts (unit-tested); these functions
-- find what needs grading and write the result, once per pick, from the service role only.
-- Corrections are always new settlement_events rows (admin source). Nothing is ever updated or deleted.

-- At most one automatic settlement per prediction, so reruns and overlapping cron runs are harmless.
create unique index if not exists settlement_events_auto_once
  on public.settlement_events (prediction_id) where source = 'auto';

-- Picks with no settlement yet whose fixture has reached a final state:
--   finished, abandoned or cancelled, or postponed with kick-off more than 72 hours ago and never rescheduled
--   (a reschedule moves kickoff_at forward, which takes the fixture out of this list).
create or replace function public.pending_settlements()
returns table (
  prediction_id uuid,
  sport text,
  market text,
  selection text,
  line numeric,
  odds numeric,
  status text,
  home_score integer,
  away_score integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, f.sport, p.market, p.selection, p.line, p.odds, f.status, f.home_score, f.away_score
  from public.predictions p
  join public.fixtures f on f.id = p.fixture_id
  where not exists (select 1 from public.settlement_events s where s.prediction_id = p.id)
    and (
      f.status in ('finished', 'abandoned', 'cancelled')
      or (f.status = 'postponed' and f.kickoff_at < now() - interval '72 hours')
    )
  order by p.seq
  limit 2000;
$$;

revoke all on function public.pending_settlements() from public, anon, authenticated;
grant execute on function public.pending_settlements() to service_role;

-- Writes automatic settlements from [{prediction_id, result, units}]. Returns how many rows were inserted.
-- Units are checked against the pick's odds (won = odds - 1, lost = -1, void = 0), and a pick that already has
-- any settlement (including an admin one) is skipped.
create or replace function public.apply_auto_settlements(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with incoming as (
    select (r ->> 'prediction_id')::uuid as prediction_id, r ->> 'result' as result, (r ->> 'units')::numeric as units
    from jsonb_array_elements(p_rows) r
  ),
  ins as (
    insert into public.settlement_events (prediction_id, result, units, source)
    select i.prediction_id, i.result, i.units, 'auto'
    from incoming i
    join public.predictions p on p.id = i.prediction_id
    where i.result in ('won', 'lost', 'void')
      and i.units = case i.result when 'won' then p.odds - 1 when 'lost' then -1 else 0 end
      and not exists (select 1 from public.settlement_events s where s.prediction_id = i.prediction_id)
    on conflict do nothing
    returning 1
  )
  select count(*)::integer into v_count from ins;
  return v_count;
end;
$$;

revoke all on function public.apply_auto_settlements(jsonb) from public, anon, authenticated;
grant execute on function public.apply_auto_settlements(jsonb) to service_role;

-- Right after sync-results (which runs on the hour and half hour), so picks settle within minutes of a result.
select cron.schedule('settle', '5,35 * * * *', $$select public.invoke_cron('/api/cron/settle')$$);
