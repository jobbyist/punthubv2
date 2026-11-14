-- Duel settings the app needs to draw the challenge form, and a leaderboard order that never uses PuntPoints
-- (the Terms say PuntPoints never change rankings): XP, then wins, then fewer duels played, then username.
create or replace function public.duel_config()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'enabled', public.setting_bool('duels_enabled', true),
    'stakes_enabled', public.setting_bool('duels_stakes_enabled', false),
    'stake_min', public.setting_int('duel_stake_min', 10),
    'stake_max', public.setting_int('duel_stake_max', 100),
    'daily_cap', public.setting_int('duel_daily_stake_cap', 200),
    'open_limit', public.setting_int('duel_open_limit', 3),
    'min_account_days', public.setting_int('transfer_min_account_days', 14),
    'mvp_open', public.mvp_open(),
    'transferable', case when auth.uid() is null then null else public.puntpoints_transferable(auth.uid()) end);
$$;
revoke all on function public.duel_config() from public;
grant execute on function public.duel_config() to anon, authenticated;

create or replace function public.duel_leaderboard(p_days integer default null, p_limit integer default 50)
returns table (username text, founding_number integer, played integer, wins integer, draws integer,
               losses integer, xp integer, points_won integer)
language sql stable security definer set search_path = public, pg_temp as $$
  with rows as (
    select d.id, d.stake, d.winner, unnest(array[d.challenger, d.opponent]) as player
    from public.duels d
    where d.status = 'settled' and (p_days is null or d.settled_at > now() - make_interval(days => p_days))
  )
  select p.username::text, p.founding_number,
         count(*)::integer,
         count(*) filter (where r.winner = r.player)::integer,
         count(*) filter (where r.winner is null)::integer,
         count(*) filter (where r.winner is not null and r.winner <> r.player)::integer,
         (3 * count(*) filter (where r.winner = r.player) + count(*) filter (where r.winner is null))::integer,
         coalesce(sum(r.stake) filter (where r.winner = r.player), 0)::integer
  from rows r join public.profiles p on p.id = r.player
  where p.username::text not like 'deleted-%'
  group by p.id, p.username, p.founding_number
  order by 7 desc, 4 desc, 3 asc, 1
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;
