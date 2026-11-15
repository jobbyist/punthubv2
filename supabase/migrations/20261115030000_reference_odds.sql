-- Pre-match reference odds and the member-odds check (owner decisions, 15 Nov 2026; docs/PARALLEL_ARCHITECTURE.md).
--
-- Two kinds of odds, neither overriding the other:
--   * market reference odds: collected automatically before kick-off (never in-play) into market_odds;
--   * member-entered odds: what the member typed on the pick. Unchanged, still part of the pick's hash.
--
-- 1. market_odds: history of reference prices per fixture, market and selection (source kept for audit only).
-- 2. predictions.reference_odds / odds_unverified, set by a BEFORE INSERT trigger from the latest reference price
--    captured in the 36 hours before the pick. Members cannot write predictions directly (only create_prediction),
--    so they cannot set these columns.
-- 3. prediction_odds_state (internal view): the member's odds, or the lower reference price when the pick is
--    "odds unverified" (more than 25% above the reference) = settle_odds. Settlement units, admin settlements and
--    the weekly leaderboard's 1.50 threshold use it. Points for correct picks never depended on odds: unchanged.
--    Predictions stay append-only (forbid_mutation): nothing here updates a pick.
-- 4. reference_odds(): latest reference prices for given fixtures, only for 18+ attested members who are not on a
--    break or suspended (CLAUDE.md affiliate and odds rules). No bookmaker name is returned.
-- 5. prediction_odds_overrides + admin_set_odds_check(): an admin can clear or set the flag with a reason (logged),
--    without touching the append-only pick.
-- 6. sync_status accepts the 'odds' job; sync-odds cron twice a day.

-- 1. Reference prices ----------------------------------------------------------------------------------------------
create table if not exists public.market_odds (
  id bigserial primary key,
  fixture_id uuid not null references public.fixtures (id) on delete cascade,
  market text not null check (market in ('1X2', 'OU25', 'BTTS', 'DC')),
  selection text not null,
  price numeric(6, 2) not null check (price >= 1.01 and price <= 100),
  source_domain text not null,
  source_url text,
  captured_at timestamptz not null default now(),
  check (
    (market = '1X2' and selection in ('home', 'draw', 'away'))
    or (market = 'OU25' and selection in ('over', 'under'))
    or (market = 'BTTS' and selection in ('yes', 'no'))
    or (market = 'DC' and selection in ('1X', 'X2', '12'))
  )
);
create index if not exists market_odds_lookup_idx
  on public.market_odds (fixture_id, market, selection, captured_at desc);
alter table public.market_odds enable row level security;
revoke all on public.market_odds from anon, authenticated;
grant select, insert, delete on public.market_odds to service_role;
grant usage, select on sequence public.market_odds_id_seq to service_role;

-- 2. Member-odds check on new picks --------------------------------------------------------------------------------
alter table public.predictions add column if not exists reference_odds numeric(6, 2);
alter table public.predictions add column if not exists odds_unverified boolean not null default false;

-- Unverified when the member's odds are more than 25% above the reference price (owner, 15 Nov 2026).
create or replace function public.odds_unverified_threshold() returns numeric
language sql immutable set search_path = public, pg_temp as $$ select 1.25::numeric $$;

create or replace function public.predictions_reference_odds()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ref numeric(6, 2);
  v_at timestamptz := coalesce(new.created_at, clock_timestamp());
begin
  select m.price into v_ref
  from public.market_odds m
  where m.fixture_id = new.fixture_id and m.market = new.market and m.selection = new.selection
    and m.captured_at <= v_at and m.captured_at > v_at - interval '36 hours'
  order by m.captured_at desc
  limit 1;
  new.reference_odds := v_ref;
  new.odds_unverified := v_ref is not null and new.odds > round(v_ref * public.odds_unverified_threshold(), 2);
  return new;
end;
$$;
drop trigger if exists predictions_reference_odds on public.predictions;
create trigger predictions_reference_odds before insert on public.predictions
  for each row execute function public.predictions_reference_odds();

-- Admin corrections live beside the pick, never in it.
create table if not exists public.prediction_odds_overrides (
  prediction_id uuid primary key references public.predictions (id) on delete cascade,
  odds_unverified boolean not null,
  reason text not null check (btrim(reason) <> ''),
  admin_id uuid,
  updated_at timestamptz not null default now()
);
alter table public.prediction_odds_overrides enable row level security;
revoke all on public.prediction_odds_overrides from anon, authenticated;
grant select, insert, update on public.prediction_odds_overrides to service_role;

-- Effective check per pick. Predictions are public (predictions_public_select), so this adds only the effective
-- flag and settlement odds; the admin's reason stays in prediction_odds_overrides (service role only). The weekly
-- leaderboard (security_invoker) reads it, so anon and authenticated may select it.
create or replace view public.prediction_odds_state with (security_invoker = false) as
  select p.id as prediction_id, p.odds, p.reference_odds,
         coalesce(o.odds_unverified, p.odds_unverified) as odds_unverified,
         (case when coalesce(o.odds_unverified, p.odds_unverified) and p.reference_odds is not null
               then least(p.odds, p.reference_odds) else p.odds end)::numeric(6, 2) as settle_odds
  from public.predictions p
  left join public.prediction_odds_overrides o on o.prediction_id = p.id;
revoke all on public.prediction_odds_state from anon, authenticated;
grant select on public.prediction_odds_state to anon, authenticated, service_role;

-- 3. Settlement and rankings use settle_odds ----------------------------------------------------------------------
create or replace function public.pending_settlements()
returns table (prediction_id uuid, sport text, market text, selection text, line numeric, odds numeric, status text,
               home_score integer, away_score integer)
language sql stable security definer set search_path = public, pg_temp as $$
  -- `odds` here is settle_odds: the member's odds, or the lower reference price for an "odds unverified" pick.
  select p.id, f.sport, p.market, p.selection, p.line, st.settle_odds, f.status, f.home_score, f.away_score
  from public.predictions p
  join public.prediction_odds_state st on st.prediction_id = p.id
  join public.fixtures f on f.id = p.fixture_id
  where not exists (select 1 from public.settlement_events s where s.prediction_id = p.id)
    and (
      f.status in ('finished', 'abandoned', 'cancelled')
      or (f.status = 'postponed' and f.kickoff_at < now() - interval '72 hours')
    )
  order by p.seq
  limit 2000;
$$;

create or replace function public.apply_auto_settlements(p_rows jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
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
    join public.prediction_odds_state p on p.prediction_id = i.prediction_id
    where i.result in ('won', 'lost', 'void')
      and i.units = case i.result when 'won' then p.settle_odds - 1 when 'lost' then -1 else 0 end
      and not exists (select 1 from public.settlement_events s where s.prediction_id = i.prediction_id)
    on conflict do nothing
    returning 1
  )
  select count(*)::integer into v_count from ins;
  return v_count;
end;
$$;

create or replace function public.admin_settle_prediction(p_prediction uuid, p_result text, p_reason text)
returns public.settlement_events language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_odds numeric;
  v_units numeric;
  v_row public.settlement_events;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_result is null or p_result not in ('won', 'lost', 'void') then
    raise exception 'invalid_result' using errcode = 'P0001';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select settle_odds into v_odds from public.prediction_odds_state where prediction_id = p_prediction;
  if not found then
    raise exception 'prediction_not_found' using errcode = 'P0001';
  end if;
  v_units := case p_result when 'won' then v_odds - 1 when 'lost' then -1 else 0 end;
  insert into public.settlement_events (prediction_id, result, units, source, reason, admin_id)
  values (p_prediction, p_result, v_units, 'admin', btrim(p_reason), auth.uid())
  returning * into v_row;
  return v_row;
end;
$$;

create or replace view public.weekly_leaderboard with (security_invoker = true) as
  with s as (
    select
      date_trunc('week', f.kickoff_at at time zone 'Africa/Johannesburg')::date as week_start,
      pr.user_id, pr.created_at, r.result, r.units
    from public.predictions pr
    join public.prediction_odds_state st on st.prediction_id = pr.id
    join public.fixtures f on f.id = pr.fixture_id
    join public.prediction_results r on r.prediction_id = pr.id
    where st.settle_odds >= 1.50 and r.result in ('won', 'lost')
  ),
  agg as (
    select
      week_start, user_id,
      count(*)::integer as picks_settled,
      (count(*) filter (where result = 'won'))::integer as wins,
      sum(units)::numeric(10, 2) as units,
      round(sum(units) / count(*), 4) as roi,
      max(created_at) as last_pick_at,
      count(*) >= 10 as eligible
    from s
    group by week_start, user_id
  )
  select
    a.week_start, a.user_id, u.username, a.picks_settled, a.wins, a.units, a.roi, a.last_pick_at, a.eligible,
    (case when a.eligible
      then rank() over (partition by a.week_start, a.eligible order by a.units desc, a.roi desc, a.last_pick_at asc)
    end)::integer as rank
  from agg a
  join public.public_profiles u on u.id = a.user_id;

-- The public pick view shows the check next to each pick (new columns go at the end).
create or replace view public.visible_predictions with (security_invoker = false) as
  select p.id, p.seq, p.user_id, p.fixture_id, p.market, p.selection, p.line, p.odds, p.confidence, p.reasoning,
         p.created_at, p.prev_hash, p.hash, p.reference_odds, st.odds_unverified
  from public.predictions p
  join public.prediction_odds_state st on st.prediction_id = p.id
  where not exists (select 1 from public.hidden_predictions h where h.prediction_id = p.id);

-- 4. Reference prices for eligible members -------------------------------------------------------------------------
create or replace function public.reference_odds(p_fixture_ids uuid[])
returns table (fixture_id uuid, market text, selection text, price numeric, captured_at timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct on (m.fixture_id, m.market, m.selection)
         m.fixture_id, m.market, m.selection, m.price, m.captured_at
  from public.market_odds m
  join public.fixtures f on f.id = m.fixture_id
  where m.fixture_id = any (p_fixture_ids)
    and cardinality(p_fixture_ids) <= 200
    and f.status = 'scheduled' and f.kickoff_at > now()       -- pre-match only: nothing once a match starts
    and m.captured_at > now() - interval '36 hours'
    and (
      coalesce(auth.role(), '') = 'service_role'
      or exists (
        select 1 from public.profiles pr
        where pr.id = auth.uid() and pr.is_18_attested and not pr.is_banned
          and (pr.posting_paused_until is null or pr.posting_paused_until <= now())   -- not on a break
          and (pr.suspended_until is null or pr.suspended_until <= now())
      )
    )
  order by m.fixture_id, m.market, m.selection, m.captured_at desc;
$$;

-- 5. Admin correction of the check ---------------------------------------------------------------------------------
create or replace function public.admin_set_odds_check(p_prediction uuid, p_unverified boolean, p_reason text)
returns public.prediction_odds_overrides language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_row public.prediction_odds_overrides;
  v_pick public.predictions;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'reason_required' using errcode = 'P0001';
  end if;
  select * into v_pick from public.predictions where id = p_prediction;
  if not found then
    raise exception 'prediction_not_found' using errcode = 'P0001';
  end if;
  insert into public.prediction_odds_overrides (prediction_id, odds_unverified, reason, admin_id)
  values (p_prediction, coalesce(p_unverified, false), btrim(p_reason), auth.uid())
  on conflict (prediction_id) do update
    set odds_unverified = excluded.odds_unverified, reason = excluded.reason, admin_id = excluded.admin_id,
        updated_at = now()
  returning * into v_row;
  perform public.log_admin_action('odds_check', v_pick.user_id, btrim(p_reason),
    jsonb_build_object('prediction_id', p_prediction, 'odds_unverified', v_row.odds_unverified,
                       'reference_odds', v_pick.reference_odds, 'odds', v_pick.odds,
                       'note', 'A pick already settled keeps its settlement; correct it with admin_settle_prediction.'));
  return v_row;
end;
$$;

revoke all on function public.odds_unverified_threshold() from public;
revoke all on function public.predictions_reference_odds() from public, anon, authenticated;
revoke all on function public.reference_odds(uuid[]) from public, anon;
revoke all on function public.admin_set_odds_check(uuid, boolean, text) from public, anon;
grant execute on function public.odds_unverified_threshold() to authenticated, service_role;
grant execute on function public.reference_odds(uuid[]) to authenticated, service_role;
grant execute on function public.admin_set_odds_check(uuid, boolean, text) to authenticated, service_role;

-- 6. Sync status and schedule --------------------------------------------------------------------------------------
alter table public.sync_status drop constraint if exists sync_status_job_check;
alter table public.sync_status add constraint sync_status_job_check
  check (job in ('standings', 'history', 'season', 'odds'));

-- 07:00-07:50 and 14:00-14:50 SAST, every 10 minutes; each call refreshes the next two due competitions.
select cron.unschedule('sync-odds') where exists (select 1 from cron.job where jobname = 'sync-odds');
select cron.schedule('sync-odds', '0,10,20,30,40,50 5,12 * * *',
  $$select public.invoke_cron('/api/cron/sync-odds')$$);
