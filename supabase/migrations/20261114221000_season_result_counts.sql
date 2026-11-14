-- Counts per competition for the /results "Season results" chips, grouped in the database (review on PR #129).
create or replace function public.season_result_counts()
returns table (competition text, results bigint)
language sql stable security invoker set search_path = public, pg_temp as $$
  select competition, count(*) from public.team_results group by competition order by count(*) desc;
$$;
revoke all on function public.season_result_counts() from public;
grant execute on function public.season_result_counts() to anon, authenticated, service_role;
