-- League standings and team form (14 Nov 2026). Two separate processes:
--   1. Standings: `league_standings`, refreshed by the daily PFIE standings job (04:10 SAST batches) from verified
--      tables, and updated between refreshes by applying each confirmed result once (no API call).
--   2. Form: derived from completed matches only: finished `fixtures` plus `team_results` (a one-time history
--      backfill of recent results, verified by two sources or the official site). `completed_matches` combines
--      both without duplicates.
-- `sync_status` records every job's attempts, successes, failures and last sync time for monitoring and the
-- stale-data indicator.

-- 1. Sync status (one row per job and scope, e.g. ('standings', 'epl')). -------------------------------------------
create table if not exists public.sync_status (
  job text not null check (job in ('standings', 'history')),
  scope text not null,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  last_synced_at timestamptz,
  consecutive_failures integer not null default 0,
  last_error text,
  meta jsonb not null default '{}'::jsonb,
  primary key (job, scope)
);
alter table public.sync_status enable row level security;
drop policy if exists sync_status_public_read on public.sync_status;
create policy sync_status_public_read on public.sync_status for select to anon, authenticated using (true);
revoke all on public.sync_status from anon, authenticated;
grant select on public.sync_status to anon, authenticated;
grant select, insert, update, delete on public.sync_status to service_role;

-- 2. League standings (current table per competition). ----------------------------------------------------------
create table if not exists public.league_standings (
  competition_key text not null,
  competition text not null,
  season text not null,
  team text not null,
  position smallint not null check (position between 1 and 60),
  played smallint not null check (played >= 0),
  won smallint not null check (won >= 0),
  drawn smallint not null check (drawn >= 0),
  lost smallint not null check (lost >= 0),
  goals_for smallint not null check (goals_for >= 0),
  goals_against smallint not null check (goals_against >= 0),
  goal_diff smallint generated always as (goals_for - goals_against) stored,
  points smallint not null,
  source_domain text,
  source_url text,
  synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (competition_key, team),
  constraint league_standings_wdl check (won + drawn + lost = played)
);
create index if not exists league_standings_comp_pos_idx on public.league_standings (competition_key, position);
alter table public.league_standings enable row level security;
drop policy if exists league_standings_public_read on public.league_standings;
create policy league_standings_public_read on public.league_standings for select to anon, authenticated using (true);
revoke all on public.league_standings from anon, authenticated;
grant select on public.league_standings to anon, authenticated;
grant select, insert, update, delete on public.league_standings to service_role;

-- Results already applied to a table since its last refresh (so a result is never counted twice).
create table if not exists public.standings_applied (
  competition_key text not null,
  fixture_id uuid not null references public.fixtures (id) on delete cascade,
  applied_at timestamptz not null default now(),
  primary key (competition_key, fixture_id)
);
alter table public.standings_applied enable row level security;
revoke all on public.standings_applied from anon, authenticated;
grant select, insert, update, delete on public.standings_applied to service_role;

-- 3. Team results history (form backfill). --------------------------------------------------------------------
create table if not exists public.team_results (
  id uuid primary key default gen_random_uuid(),
  competition_key text not null,
  competition text not null,
  match_date date not null,
  home text not null,
  away text not null,
  home_score smallint not null check (home_score >= 0),
  away_score smallint not null check (away_score >= 0),
  source_domains text[] not null default '{}',
  created_at timestamptz not null default now()
);
create unique index if not exists team_results_unique_idx
  on public.team_results (competition_key, match_date, lower(home), lower(away));
create index if not exists team_results_home_idx on public.team_results (lower(home), match_date desc);
create index if not exists team_results_away_idx on public.team_results (lower(away), match_date desc);
alter table public.team_results enable row level security;
drop policy if exists team_results_public_read on public.team_results;
create policy team_results_public_read on public.team_results for select to anon, authenticated using (true);
revoke all on public.team_results from anon, authenticated;
grant select on public.team_results to anon, authenticated;
grant select, insert, update, delete on public.team_results to service_role;

-- 4. Completed matches: finished fixtures plus history rows that are not also a fixture (same teams, same SA day).
create or replace view public.completed_matches with (security_invoker = true) as
  select f.id::text as id, f.competition, f.home, f.away, f.kickoff_at, f.home_score, f.away_score
  from public.fixtures f
  where f.status = 'finished' and f.home_score is not null and f.away_score is not null
  union all
  select 'tr:' || t.id::text, t.competition, t.home, t.away,
         (t.match_date::timestamp + time '12:00') at time zone 'Africa/Johannesburg', t.home_score, t.away_score
  from public.team_results t
  where not exists (
    select 1 from public.fixtures f
    where f.status = 'finished'
      and lower(f.home) = lower(t.home) and lower(f.away) = lower(t.away)
      and (f.kickoff_at at time zone 'Africa/Johannesburg')::date = t.match_date);
grant select on public.completed_matches to anon, authenticated;

-- 5. Matchday: apply a confirmed result to the stored table once, then re-rank. ---------------------------------
create or replace function public.apply_result_to_standings(p_fixture uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_f public.fixtures;
  v_key text;
  v_synced timestamptz;
  v_hp integer;
  v_ap integer;
begin
  select * into v_f from public.fixtures where id = p_fixture;
  if not found or v_f.status <> 'finished' or v_f.home_score is null or v_f.away_score is null then
    return 'not_final';
  end if;
  select competition_key, min(synced_at) into v_key, v_synced
  from public.league_standings where competition = v_f.competition group by competition_key limit 1;
  if v_key is null then return 'no_table'; end if;
  -- A result from before the table was taken is already in it.
  if v_f.kickoff_at <= v_synced then return 'in_snapshot'; end if;
  if not exists (select 1 from public.league_standings where competition_key = v_key and lower(team) = lower(v_f.home))
     or not exists (select 1 from public.league_standings where competition_key = v_key and lower(team) = lower(v_f.away)) then
    return 'team_not_in_table';
  end if;
  insert into public.standings_applied (competition_key, fixture_id) values (v_key, p_fixture)
  on conflict do nothing;
  if not found then return 'already_applied'; end if;

  v_hp := case when v_f.home_score > v_f.away_score then 3 when v_f.home_score = v_f.away_score then 1 else 0 end;
  v_ap := case when v_f.away_score > v_f.home_score then 3 when v_f.home_score = v_f.away_score then 1 else 0 end;
  update public.league_standings set
    played = played + 1,
    won = won + (v_hp = 3)::int, drawn = drawn + (v_hp = 1)::int, lost = lost + (v_hp = 0)::int,
    goals_for = goals_for + v_f.home_score, goals_against = goals_against + v_f.away_score,
    points = points + v_hp, updated_at = now()
  where competition_key = v_key and lower(team) = lower(v_f.home);
  update public.league_standings set
    played = played + 1,
    won = won + (v_ap = 3)::int, drawn = drawn + (v_ap = 1)::int, lost = lost + (v_ap = 0)::int,
    goals_for = goals_for + v_f.away_score, goals_against = goals_against + v_f.home_score,
    points = points + v_ap, updated_at = now()
  where competition_key = v_key and lower(team) = lower(v_f.away);

  -- Re-rank on points, goal difference, goals scored, then name. The next daily refresh restores each league's
  -- own tie-break rules.
  update public.league_standings s set position = r.pos
  from (select team, row_number() over (order by points desc, goals_for - goals_against desc, goals_for desc, team) pos
        from public.league_standings where competition_key = v_key) r
  where s.competition_key = v_key and s.team = r.team and s.position <> r.pos;
  return 'applied';
end;
$$;

create or replace function public.fixtures_after_result()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'finished' and new.home_score is not null and new.away_score is not null
     and (old.status is distinct from 'finished' or old.home_score is distinct from new.home_score
          or old.away_score is distinct from new.away_score) then
    perform public.apply_result_to_standings(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists fixtures_after_result on public.fixtures;
create trigger fixtures_after_result after update of status, home_score, away_score on public.fixtures
  for each row execute function public.fixtures_after_result();

-- 6. Replace a competition's table atomically (called by the daily job with a verified table). -----------------
create or replace function public.replace_standings(
  p_key text, p_competition text, p_season text, p_rows jsonb, p_source_domain text, p_source_url text)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_n integer;
begin
  delete from public.league_standings where competition_key = p_key;
  insert into public.league_standings (competition_key, competition, season, team, position, played, won, drawn,
    lost, goals_for, goals_against, points, source_domain, source_url, synced_at)
  select p_key, p_competition, p_season, r->>'team', (r->>'position')::smallint, (r->>'played')::smallint,
         (r->>'won')::smallint, (r->>'drawn')::smallint, (r->>'lost')::smallint, (r->>'goalsFor')::smallint,
         (r->>'goalsAgainst')::smallint, (r->>'points')::smallint, p_source_domain, p_source_url, now()
  from jsonb_array_elements(p_rows) r;
  get diagnostics v_n = row_count;
  -- A fresh table already contains every earlier result.
  delete from public.standings_applied where competition_key = p_key;
  return v_n;
end;
$$;

-- History rows: insert, skipping any match already stored (same competition, day and teams).
create or replace function public.insert_team_results(p_rows jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_n integer;
begin
  insert into public.team_results (competition_key, competition, match_date, home, away, home_score, away_score,
                                   source_domains)
  select r->>'competitionKey', r->>'competition', (r->>'matchDate')::date, r->>'home', r->>'away',
         (r->>'homeScore')::smallint, (r->>'awayScore')::smallint,
         array(select jsonb_array_elements_text(coalesce(r->'sourceDomains', '[]'::jsonb)))
  from jsonb_array_elements(p_rows) r
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- 7. Status bookkeeping for the jobs. -------------------------------------------------------------------------
create or replace function public.record_sync(p_job text, p_scope text, p_ok boolean, p_error text, p_meta jsonb)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.sync_status (job, scope, last_attempt_at, last_success_at, last_synced_at,
                                  consecutive_failures, last_error, meta)
  values (p_job, p_scope, now(), case when p_ok then now() end, case when p_ok then now() end,
          case when p_ok then 0 else 1 end, case when p_ok then null else left(p_error, 300) end,
          coalesce(p_meta, '{}'::jsonb))
  on conflict (job, scope) do update set
    last_attempt_at = now(),
    last_success_at = case when p_ok then now() else sync_status.last_success_at end,
    last_synced_at = case when p_ok then now() else sync_status.last_synced_at end,
    consecutive_failures = case when p_ok then 0 else sync_status.consecutive_failures + 1 end,
    last_error = case when p_ok then null else left(p_error, 300) end,
    meta = sync_status.meta || coalesce(p_meta, '{}'::jsonb);
$$;

revoke all on function public.apply_result_to_standings(uuid), public.fixtures_after_result(),
  public.replace_standings(text, text, text, jsonb, text, text), public.record_sync(text, text, boolean, text, jsonb),
  public.insert_team_results(jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_result_to_standings(uuid),
  public.replace_standings(text, text, text, jsonb, text, text), public.record_sync(text, text, boolean, text, jsonb),
  public.insert_team_results(jsonb)
  to service_role;

-- 8. Schedule: every 10 minutes from 04:10 to 05:50 SAST; each run handles the next two due competitions. -------
select cron.unschedule('sync-tables') where exists (select 1 from cron.job where jobname = 'sync-tables');
select cron.schedule('sync-tables', '10,20,30,40,50 2 * * *', $$select public.invoke_cron('/api/cron/sync-tables')$$);
select cron.unschedule('sync-tables-late') where exists (select 1 from cron.job where jobname = 'sync-tables-late');
select cron.schedule('sync-tables-late', '0,10,20,30,40,50 3 * * *', $$select public.invoke_cron('/api/cron/sync-tables')$$);
