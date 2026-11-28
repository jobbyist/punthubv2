-- Regression guard: goal_diff is a generated column and must never be assigned by the result reconciliation function.
-- The final apply_result_to_standings definition is included here so clean deployments get the same safe function body.
-- Restrict standings writes to the ten launch competitions, matching the exact season and a fresh snapshot.
create or replace function public.apply_result_to_standings(p_fixture uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_f public.fixtures;
  v_key text;
  v_season text;
  v_synced timestamptz;
  v_ledger public.standings_applied;
  v_hp integer;
  v_ap integer;
  v_old_hp integer;
  v_old_ap integer;
  v_was_applied boolean := false;
begin
  select * into v_f from public.fixtures where id = p_fixture;
  if not found or v_f.status <> 'finished' or v_f.home_score is null or v_f.away_score is null then return 'not_final'; end if;
  v_key := case lower(v_f.competition)
    when 'betway premiership' then 'psl' when 'premier league' then 'epl'
    when 'efl championship' then 'championship' when 'la liga' then 'laliga'
    when 'uefa champions league' then 'ucl' when 'uefa conference league' then 'uecl'
    when 'bundesliga' then 'bundesliga' when 'serie a' then 'seriea'
    when 'ligue 1' then 'ligue1' when 'caf confederation cup' then 'caf-cc'
    else null end;
  if v_key is null then return 'outside_launch_scope'; end if;
  v_season := case
    when extract(month from v_f.kickoff_at at time zone 'UTC') >= 7
      then extract(year from v_f.kickoff_at at time zone 'UTC')::integer::text
    else (extract(year from v_f.kickoff_at at time zone 'UTC')::integer - 1)::text end;
  select min(synced_at) into v_synced from public.league_standings
  where competition_key=v_key and season=v_season;
  if v_synced is null then return 'no_matching_season_table'; end if;
  if v_synced < now()-interval '36 hours' then return 'stale_table_refresh_required'; end if;
  if v_f.kickoff_at <= v_synced then return 'in_snapshot_refresh_required_on_correction'; end if;
  if not exists(select 1 from public.league_standings where competition_key=v_key and season=v_season and lower(team)=lower(v_f.home))
     or not exists(select 1 from public.league_standings where competition_key=v_key and season=v_season and lower(team)=lower(v_f.away)) then
    return 'team_not_in_table';
  end if;
  select * into v_ledger from public.standings_applied where fixture_id=p_fixture for update;
  v_was_applied := found;
  v_hp := case when v_f.home_score>v_f.away_score then 3 when v_f.home_score=v_f.away_score then 1 else 0 end;
  v_ap := case when v_f.away_score>v_f.home_score then 3 when v_f.home_score=v_f.away_score then 1 else 0 end;
  if v_was_applied then
    if v_ledger.needs_refresh or v_ledger.applied_home_score is null or v_ledger.applied_away_score is null then return 'refresh_required_legacy_ledger'; end if;
    if v_ledger.applied_home_score=v_f.home_score and v_ledger.applied_away_score=v_f.away_score then return 'already_applied'; end if;
    v_old_hp := case when v_ledger.applied_home_score>v_ledger.applied_away_score then 3 when v_ledger.applied_home_score=v_ledger.applied_away_score then 1 else 0 end;
    v_old_ap := case when v_ledger.applied_away_score>v_ledger.applied_home_score then 3 when v_ledger.applied_home_score=v_ledger.applied_away_score then 1 else 0 end;
    update public.league_standings set played=played-1,won=won-(v_old_hp=3)::int,drawn=drawn-(v_old_hp=1)::int,lost=lost-(v_old_hp=0)::int,
      goals_for=goals_for-v_ledger.applied_home_score,goals_against=goals_against-v_ledger.applied_away_score,points=points-v_old_hp
      where competition_key=v_key and season=v_season and lower(team)=lower(v_ledger.home_team);
    update public.league_standings set played=played-1,won=won-(v_old_ap=3)::int,drawn=drawn-(v_old_ap=1)::int,lost=lost-(v_old_ap=0)::int,
      goals_for=goals_for-v_ledger.applied_away_score,goals_against=goals_against-v_ledger.applied_home_score,points=points-v_old_ap
      where competition_key=v_key and season=v_season and lower(team)=lower(v_ledger.away_team);
    update public.standings_applied set season=v_season,home_team=v_f.home,away_team=v_f.away,
      applied_home_score=v_f.home_score,applied_away_score=v_f.away_score,needs_refresh=false,applied_at=now()
      where fixture_id=p_fixture;
  else
    insert into public.standings_applied(competition_key,fixture_id,season,home_team,away_team,applied_home_score,applied_away_score,needs_refresh)
    values(v_key,p_fixture,v_season,v_f.home,v_f.away,v_f.home_score,v_f.away_score,false);
  end if;
  update public.league_standings set played=played+1,won=won+(v_hp=3)::int,drawn=drawn+(v_hp=1)::int,lost=lost+(v_hp=0)::int,
    goals_for=goals_for+v_f.home_score,goals_against=goals_against+v_f.away_score,points=points+v_hp,updated_at=now()
    where competition_key=v_key and season=v_season and lower(team)=lower(v_f.home);
  update public.league_standings set played=played+1,won=won+(v_ap=3)::int,drawn=drawn+(v_ap=1)::int,lost=lost+(v_ap=0)::int,
    goals_for=goals_for+v_f.away_score,goals_against=goals_against+v_f.home_score,points=points+v_ap,updated_at=now()
    where competition_key=v_key and season=v_season and lower(team)=lower(v_f.away);
  update public.league_standings s set position=r.pos
  from (select team,group_name,row_number() over(partition by group_name order by points desc,goals_for-goals_against desc,goals_for desc,team)::smallint pos
        from public.league_standings where competition_key=v_key and season=v_season) r
  where s.competition_key=v_key and s.season=v_season and s.team=r.team and s.group_name=r.group_name and s.position<>r.pos;
  return case when v_was_applied then 'corrected' else 'applied' end;
end;
$function$;


