-- Reconcile legacy standings ledger entries against each newly validated full-season snapshot.
-- Only the season being replaced is touched. Rows with unresolved team-name mismatches remain flagged
-- so corrected-score deltas cannot be applied to the wrong standings rows.
create or replace function public.replace_standings(
  p_key text,
  p_competition text,
  p_season text,
  p_rows jsonb,
  p_source_domain text,
  p_source_url text
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_n integer;
begin
  if p_key not in ('psl','epl','championship','laliga','ucl','uecl','bundesliga','seriea','ligue1','caf-cc') then
    raise exception 'competition is outside the ten-competition PFIE launch scope';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'standings snapshot must contain at least one row';
  end if;

  delete from public.league_standings
  where competition_key = p_key and season = p_season;

  insert into public.league_standings (
    competition_key, group_name, competition, season, team, position, played, won, drawn,
    lost, goals_for, goals_against, points, source_domain, source_url, synced_at
  )
  select
    p_key, coalesce(nullif(r->>'group', ''), ''), p_competition, p_season, r->>'team',
    (r->>'position')::smallint, (r->>'played')::smallint, (r->>'won')::smallint,
    (r->>'drawn')::smallint, (r->>'lost')::smallint, (r->>'goalsFor')::smallint,
    (r->>'goalsAgainst')::smallint, (r->>'points')::smallint, p_source_domain, p_source_url, now()
  from jsonb_array_elements(p_rows) r;

  get diagnostics v_n = row_count;

  -- Invalidate only the ledger entries belonging to the replaced season, including legacy rows
  -- whose season/team/score metadata was never populated.
  update public.standings_applied a
  set needs_refresh = true
  where a.competition_key = p_key
    and (
      a.season = p_season
      or (
        a.season is null
        and exists (
          select 1
          from public.fixtures f
          where f.id = a.fixture_id
            and case
              when extract(month from f.kickoff_at at time zone 'UTC') >= 7
                then extract(year from f.kickoff_at at time zone 'UTC')::integer::text
              else (extract(year from f.kickoff_at at time zone 'UTC')::integer - 1)::text
            end = p_season
        )
      )
    );

  -- A validated full snapshot is now the baseline. Populate the exact scores and team names
  -- from finished fixtures only when both names match rows in the new snapshot. Any ambiguous
  -- alias remains needs_refresh=true and is safely blocked from incremental score corrections.
  update public.standings_applied a
  set season = p_season,
      home_team = f.home,
      away_team = f.away,
      applied_home_score = f.home_score,
      applied_away_score = f.away_score,
      needs_refresh = false,
      applied_at = now()
  from public.fixtures f
  where a.fixture_id = f.id
    and a.competition_key = p_key
    and a.needs_refresh = true
    and f.status = 'finished'
    and f.home_score is not null
    and f.away_score is not null
    and f.kickoff_at <= now()
    and case
      when extract(month from f.kickoff_at at time zone 'UTC') >= 7
        then extract(year from f.kickoff_at at time zone 'UTC')::integer::text
      else (extract(year from f.kickoff_at at time zone 'UTC')::integer - 1)::text
    end = p_season
    and exists (
      select 1 from public.league_standings s
      where s.competition_key = p_key
        and s.season = p_season
        and lower(s.team) = lower(f.home)
    )
    and exists (
      select 1 from public.league_standings s
      where s.competition_key = p_key
        and s.season = p_season
        and lower(s.team) = lower(f.away)
    );

  return v_n;
end;
$function$;
