alter table public.league_standings
  add column if not exists group_name text not null default '';

alter table public.league_standings
  drop constraint if exists league_standings_pkey;

alter table public.league_standings
  add constraint league_standings_pkey primary key (competition_key, group_name, team);

drop index if exists public.league_standings_comp_pos_idx;
create index league_standings_comp_pos_idx
  on public.league_standings (competition_key, group_name, "position");

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
set search_path = public, pg_temp
as $function$
declare
  v_n integer;
begin
  delete from public.league_standings where competition_key = p_key;
  insert into public.league_standings (
    competition_key, group_name, competition, season, team, position, played, won, drawn,
    lost, goals_for, goals_against, points, source_domain, source_url, synced_at
  )
  select
    p_key,
    coalesce(nullif(r->>'group', ''), ''),
    p_competition,
    p_season,
    r->>'team',
    (r->>'position')::smallint,
    (r->>'played')::smallint,
    (r->>'won')::smallint,
    (r->>'drawn')::smallint,
    (r->>'lost')::smallint,
    (r->>'goalsFor')::smallint,
    (r->>'goalsAgainst')::smallint,
    (r->>'points')::smallint,
    p_source_domain,
    p_source_url,
    now()
  from jsonb_array_elements(p_rows) r;
  get diagnostics v_n = row_count;
  delete from public.standings_applied where competition_key = p_key;
  return v_n;
end;
$function$;
