-- Community Head-to-Head Duels (batch 1, Task 4, 14 Nov 2026).
--
-- Punter A challenges a named member (or posts an open challenge) on an upcoming fixture with 2 or 3 calls from
-- Match result (1X2), Both teams to score (BTTS) and Over/Under 2.5 (OU25), and an optional PuntPoints stake.
-- Punter B accepts with calls on the same markets; both stakes sit in escrow (ledger kind 'duel_stake'). Calls stay
-- hidden until kick-off. The community can vote "who called it better" once the calls are visible. At full time
-- the settle cron grades each call with the same tested grade() as normal picks and calls settle_duel(): more
-- correct calls wins the pot (2 x stake) and duel XP (win 3, draw 1); a tie or a void match refunds both.
--
-- Stakes are behind the admin setting duels_stakes_enabled (default false) until the owner decides, because
-- staking redeemable points on a match outcome needs counsel's view under the National Gambling Act 7 of 2004
-- [attorney review]. Friendly duels (stake 0) work either way. Every staked duel uses the transfer safeguards:
-- 14-day-old account, 18+, not banned/suspended/limited, only transferable points (no referral points, no points
-- from the hold window), a daily stake cap and a per-pair weekly cap (so duels cannot be used to move points).

-- 1. Ledger kinds for escrow, payout and refund. ------------------------------------------------------------------
alter table public.puntpoints_ledger drop constraint if exists puntpoints_ledger_kind_check;
alter table public.puntpoints_ledger add constraint puntpoints_ledger_kind_check check (kind = any (array[
  'award', 'spend', 'refund', 'adjust', 'reversal', 'transfer_in', 'transfer_out',
  'duel_stake', 'duel_payout', 'duel_refund']));

-- 2. Settings (editable in Admin > System). ----------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('duels_enabled', 'true'),
  ('duels_stakes_enabled', 'false'),
  ('duel_stake_min', '10'),
  ('duel_stake_max', '100'),
  ('duel_daily_stake_cap', '200'),
  ('duel_open_limit', '3'),
  ('duel_pair_weekly_limit', '3')
on conflict (key) do nothing;

-- 3. Tables. -----------------------------------------------------------------------------------------------------
create table if not exists public.duels (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null references public.fixtures (id) on delete restrict,
  challenger uuid not null references public.profiles (id) on delete restrict,
  opponent uuid references public.profiles (id) on delete restrict,
  stake integer not null default 0 check (stake >= 0 and stake <= 1000),
  markets text[] not null check (
    cardinality(markets) between 2 and 3 and markets <@ array['1X2', 'BTTS', 'OU25']::text[]),
  message text check (message is null or char_length(message) <= 140),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'settled', 'void', 'declined', 'cancelled', 'expired')),
  challenger_correct smallint,
  opponent_correct smallint,
  winner uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  settled_at timestamptz,
  constraint duels_not_self check (opponent is null or opponent <> challenger)
);
create index if not exists duels_fixture_idx on public.duels (fixture_id);
create index if not exists duels_challenger_idx on public.duels (challenger, created_at desc);
create index if not exists duels_opponent_idx on public.duels (opponent, created_at desc);
create index if not exists duels_status_idx on public.duels (status);

create table if not exists public.duel_picks (
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete restrict,
  market text not null check (market in ('1X2', 'BTTS', 'OU25')),
  selection text not null,
  correct boolean,
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id, market),
  constraint duel_picks_selection check (
    (market = '1X2' and selection in ('home', 'draw', 'away'))
    or (market = 'BTTS' and selection in ('yes', 'no'))
    or (market = 'OU25' and selection in ('over', 'under')))
);

create table if not exists public.duel_votes (
  duel_id uuid not null references public.duels (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  side text not null check (side in ('challenger', 'opponent')),
  created_at timestamptz not null default now(),
  primary key (duel_id, user_id)
);

alter table public.duels enable row level security;
alter table public.duel_picks enable row level security;
alter table public.duel_votes enable row level security;

-- Duels themselves are public (usernames, fixture, stake, status, result). Calls and votes are read only through
-- the functions below, which hide calls until kick-off and only return vote totals.
drop policy if exists duels_public_read on public.duels;
create policy duels_public_read on public.duels for select to anon, authenticated using (true);

revoke all on public.duels, public.duel_picks, public.duel_votes from anon, authenticated;
grant select on public.duels to anon, authenticated;
grant select, insert, update, delete on public.duels, public.duel_picks, public.duel_votes to service_role;

-- 4. Helpers. ----------------------------------------------------------------------------------------------------
create or replace function public.setting_bool(p_key text, p_default boolean)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select lower(value) = 'true' from public.app_settings where key = p_key), p_default);
$$;

-- Validates 2-3 calls as jsonb [{"market": "1X2", "selection": "home"}, ...]; returns the sorted market list.
create or replace function public.duel_check_picks(p_picks jsonb)
returns text[] language plpgsql immutable set search_path = public, pg_temp as $$
declare
  v_markets text[];
  v_bad integer;
begin
  if p_picks is null or jsonb_typeof(p_picks) <> 'array' then raise exception 'invalid_picks' using errcode = 'P0001'; end if;
  select array_agg(distinct x->>'market' order by x->>'market'),
         count(*) filter (where not coalesce(
           (x->>'market' = '1X2' and x->>'selection' in ('home', 'draw', 'away'))
           or (x->>'market' = 'BTTS' and x->>'selection' in ('yes', 'no'))
           or (x->>'market' = 'OU25' and x->>'selection' in ('over', 'under')), false))
    into v_markets, v_bad
  from jsonb_array_elements(p_picks) x;
  if v_bad > 0 or cardinality(v_markets) <> jsonb_array_length(p_picks)
     or cardinality(v_markets) not between 2 and 3 then
    raise exception 'invalid_picks' using errcode = 'P0001';
  end if;
  return v_markets;
end;
$$;

-- Stake checks shared by create and accept. Raises with a code the app translates.
create or replace function public.duel_check_stake(p_user uuid, p_stake integer)
returns void language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_profile public.profiles;
  v_today integer;
begin
  if p_stake = 0 then return; end if;
  if not public.setting_bool('duels_stakes_enabled', false) then raise exception 'stakes_paused' using errcode = 'P0001'; end if;
  if p_stake < public.setting_int('duel_stake_min', 10) or p_stake > public.setting_int('duel_stake_max', 100) then
    raise exception 'invalid_amount' using errcode = 'P0001';
  end if;
  select * into v_profile from public.profiles where id = p_user;
  if v_profile.created_at > now() - make_interval(days => public.setting_int('transfer_min_account_days', 14)) then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  select coalesce(-sum(points), 0) into v_today from public.puntpoints_ledger
  where user_id = p_user and kind = 'duel_stake'
    and created_at >= date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg';
  if v_today + p_stake > public.setting_int('duel_daily_stake_cap', 200) then raise exception 'daily_cap' using errcode = 'P0001'; end if;
  if public.puntpoints_transferable(p_user) < p_stake then raise exception 'insufficient_transferable' using errcode = 'P0001'; end if;
end;
$$;

create or replace function public.duel_refund(p_duel public.duels, p_user uuid, p_reason text)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
  select p_user, 'duel_refund', p_duel.stake, p_duel.id::text, p_reason
  where p_duel.stake > 0;
$$;

create or replace function public.duel_notify(p_user uuid, p_title text, p_message text, p_url text)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (title, message, category, target_url, audience, recipient_id, published_at)
  values (left(p_title, 140), left(p_message, 400), 'duels', p_url, 'all', p_user, now());
$$;

-- 5. Member actions. ---------------------------------------------------------------------------------------------
create or replace function public.create_duel(
  p_fixture uuid, p_opponent text, p_stake integer, p_picks jsonb, p_message text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles;
  v_opp public.profiles;
  v_fixture public.fixtures;
  v_markets text[];
  v_problem text;
  v_id uuid;
  v_stake integer := coalesce(p_stake, 0);
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if not public.setting_bool('duels_enabled', true) then raise exception 'duels_paused' using errcode = 'P0001'; end if;
  if p_message is not null and char_length(p_message) > 140 then raise exception 'note_too_long' using errcode = 'P0001'; end if;
  v_markets := public.duel_check_picks(p_picks);

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));
  select * into v_me from public.profiles where id = v_uid;
  v_problem := public.member_can_transact(v_me);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;

  select * into v_fixture from public.fixtures where id = p_fixture;
  if not found or v_fixture.status <> 'scheduled' or v_fixture.kickoff_at <= now() + interval '5 minutes' then
    raise exception 'fixture_closed' using errcode = 'P0001';
  end if;
  if v_fixture.sport <> 'soccer' then raise exception 'fixture_closed' using errcode = 'P0001'; end if;

  if p_opponent is not null and btrim(p_opponent) <> '' then
    select * into v_opp from public.profiles where username = lower(ltrim(btrim(p_opponent), '@'));
    if not found or v_opp.username::text like 'deleted-%' then raise exception 'recipient_not_found' using errcode = 'P0001'; end if;
    if v_opp.id = v_uid then raise exception 'self_duel' using errcode = 'P0001'; end if;
    if public.member_can_transact(v_opp) is not null then raise exception 'recipient_unavailable' using errcode = 'P0001'; end if;
    if (select count(*) from public.duels
        where created_at > now() - interval '7 days'
          and status not in ('declined', 'cancelled', 'expired')
          and ((challenger = v_uid and opponent = v_opp.id) or (challenger = v_opp.id and opponent = v_uid)))
       >= public.setting_int('duel_pair_weekly_limit', 3) then
      raise exception 'pair_limit' using errcode = 'P0001';
    end if;
  end if;

  if (select count(*) from public.duels where challenger = v_uid and status = 'pending')
     >= public.setting_int('duel_open_limit', 3) then
    raise exception 'open_limit' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.duels where fixture_id = p_fixture and challenger = v_uid
             and status in ('pending', 'active') and opponent is not distinct from v_opp.id) then
    raise exception 'duplicate_duel' using errcode = 'P0001';
  end if;
  perform public.duel_check_stake(v_uid, v_stake);

  insert into public.duels (fixture_id, challenger, opponent, stake, markets, message)
  values (p_fixture, v_uid, v_opp.id, v_stake, v_markets, nullif(btrim(p_message), ''))
  returning id into v_id;
  insert into public.duel_picks (duel_id, user_id, market, selection)
  select v_id, v_uid, x->>'market', x->>'selection' from jsonb_array_elements(p_picks) x;
  if v_stake > 0 then
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_uid, 'duel_stake', -v_stake, v_id::text, 'Duel stake held');
  end if;
  if v_opp.id is not null then
    perform public.duel_notify(v_opp.id, 'You have been challenged to a duel',
            '@' || v_me.username || ' challenged you on ' || v_fixture.home || ' vs ' || v_fixture.away || '.',
            '/duels/' || v_id::text);
  end if;
  return v_id;
end;
$$;

create or replace function public.accept_duel(p_duel uuid, p_picks jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_me public.profiles;
  v_duel public.duels;
  v_kickoff timestamptz;
  v_markets text[];
  v_problem text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not public.mvp_open() then raise exception 'not_launched' using errcode = 'P0001'; end if;
  if not public.setting_bool('duels_enabled', true) then raise exception 'duels_paused' using errcode = 'P0001'; end if;
  v_markets := public.duel_check_picks(p_picks);

  perform pg_advisory_xact_lock(hashtext('puntpoints:' || v_uid::text));
  select * into v_duel from public.duels where id = p_duel for update;
  if not found or v_duel.status <> 'pending' then raise exception 'duel_unavailable' using errcode = 'P0001'; end if;
  if v_duel.challenger = v_uid then raise exception 'self_duel' using errcode = 'P0001'; end if;
  if v_duel.opponent is not null and v_duel.opponent <> v_uid then raise exception 'duel_unavailable' using errcode = 'P0001'; end if;
  select kickoff_at into v_kickoff from public.fixtures where id = v_duel.fixture_id;
  if v_kickoff <= now() then raise exception 'fixture_closed' using errcode = 'P0001'; end if;
  if v_markets <> (select array_agg(m order by m) from unnest(v_duel.markets) m) then
    raise exception 'invalid_picks' using errcode = 'P0001';
  end if;

  select * into v_me from public.profiles where id = v_uid;
  v_problem := public.member_can_transact(v_me);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;
  if v_duel.opponent is null and (select count(*) from public.duels
      where created_at > now() - interval '7 days' and status not in ('declined', 'cancelled', 'expired', 'pending')
        and ((challenger = v_uid and opponent = v_duel.challenger) or (challenger = v_duel.challenger and opponent = v_uid)))
     >= public.setting_int('duel_pair_weekly_limit', 3) then
    raise exception 'pair_limit' using errcode = 'P0001';
  end if;
  perform public.duel_check_stake(v_uid, v_duel.stake);

  update public.duels set opponent = v_uid, status = 'active', accepted_at = now() where id = p_duel;
  insert into public.duel_picks (duel_id, user_id, market, selection)
  select p_duel, v_uid, x->>'market', x->>'selection' from jsonb_array_elements(p_picks) x;
  if v_duel.stake > 0 then
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_uid, 'duel_stake', -v_duel.stake, p_duel::text, 'Duel stake held');
  end if;
  perform public.duel_notify(v_duel.challenger, 'Your duel was accepted',
          '@' || v_me.username || ' accepted your duel. Calls stay hidden until kick-off.', '/duels/' || p_duel::text);
  return jsonb_build_object('id', p_duel, 'status', 'active');
end;
$$;

-- Named opponent declines, or challenger cancels, while pending. The challenger's stake comes back.
create or replace function public.withdraw_duel(p_duel uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_duel public.duels;
  v_status text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into v_duel from public.duels where id = p_duel for update;
  if not found or v_duel.status <> 'pending' then raise exception 'duel_unavailable' using errcode = 'P0001'; end if;
  if v_duel.challenger = v_uid then v_status := 'cancelled';
  elsif v_duel.opponent = v_uid then v_status := 'declined';
  else raise exception 'duel_unavailable' using errcode = 'P0001';
  end if;
  update public.duels set status = v_status, settled_at = now() where id = p_duel;
  perform public.duel_refund(v_duel, v_duel.challenger, 'Duel stake returned');
  return v_status;
end;
$$;

create or replace function public.vote_duel(p_duel uuid, p_side text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_duel public.duels;
  v_kickoff timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_side not in ('challenger', 'opponent') then raise exception 'invalid_vote' using errcode = 'P0001'; end if;
  select * into v_duel from public.duels where id = p_duel;
  if not found or v_duel.status <> 'active' then raise exception 'voting_closed' using errcode = 'P0001'; end if;
  if v_uid in (v_duel.challenger, v_duel.opponent) then raise exception 'participant_vote' using errcode = 'P0001'; end if;
  select kickoff_at into v_kickoff from public.fixtures where id = v_duel.fixture_id;
  if v_kickoff > now() then raise exception 'voting_not_open' using errcode = 'P0001'; end if;
  if (select is_banned or suspended_until > now() from public.profiles where id = v_uid) then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  insert into public.duel_votes (duel_id, user_id, side) values (p_duel, v_uid, p_side)
  on conflict (duel_id, user_id) do update set side = excluded.side, created_at = now();
  return public.duel_vote_totals(p_duel);
end;
$$;

create or replace function public.duel_vote_totals(p_duel uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'challenger', count(*) filter (where side = 'challenger'),
    'opponent', count(*) filter (where side = 'opponent'),
    'mine', (select side from public.duel_votes where duel_id = p_duel and user_id = auth.uid()))
  from public.duel_votes where duel_id = p_duel;
$$;

-- 6. Reads. ------------------------------------------------------------------------------------------------------
-- One duel with its calls: each player always sees their own; everyone sees both from kick-off.
create or replace function public.duel_detail(p_duel uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', d.id, 'status', d.status, 'stake', d.stake, 'markets', d.markets, 'message', d.message,
    'created_at', d.created_at, 'accepted_at', d.accepted_at, 'settled_at', d.settled_at,
    'challenger_correct', d.challenger_correct, 'opponent_correct', d.opponent_correct,
    'winner', w.username,
    'challenger', jsonb_build_object('username', c.username, 'founding_number', c.founding_number, 'avatar_url', c.avatar_url),
    'opponent', case when o.id is null then null else
      jsonb_build_object('username', o.username, 'founding_number', o.founding_number, 'avatar_url', o.avatar_url) end,
    'fixture', jsonb_build_object('id', f.id, 'sport', f.sport, 'competition', f.competition, 'home', f.home,
      'away', f.away, 'kickoff_at', f.kickoff_at, 'status', f.status, 'home_score', f.home_score, 'away_score', f.away_score),
    'revealed', f.kickoff_at <= now(),
    'me', case when auth.uid() = d.challenger then 'challenger' when auth.uid() = d.opponent then 'opponent' else null end,
    'picks', coalesce((select jsonb_agg(jsonb_build_object(
        'side', case when p.user_id = d.challenger then 'challenger' else 'opponent' end,
        'market', p.market, 'selection', p.selection, 'correct', p.correct) order by p.market)
      from public.duel_picks p
      where p.duel_id = d.id and (f.kickoff_at <= now() or p.user_id = auth.uid())), '[]'::jsonb),
    'votes', public.duel_vote_totals(d.id))
  from public.duels d
  join public.fixtures f on f.id = d.fixture_id
  join public.profiles c on c.id = d.challenger
  left join public.profiles o on o.id = d.opponent
  left join public.profiles w on w.id = d.winner
  where d.id = p_duel;
$$;

-- Lists: 'open' (open challenges anyone can accept), 'live' (active), 'settled', 'mine' (any status, me in it).
create or replace function public.duels_feed(p_scope text, p_fixture uuid default null, p_limit integer default 30)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(row order by sort_at desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', d.id, 'status', d.status, 'stake', d.stake, 'markets', d.markets,
      'challenger', c.username, 'opponent', o.username, 'winner', w.username,
      'challenger_correct', d.challenger_correct, 'opponent_correct', d.opponent_correct,
      'fixture', jsonb_build_object('id', f.id, 'sport', f.sport, 'competition', f.competition, 'home', f.home,
        'away', f.away, 'kickoff_at', f.kickoff_at, 'status', f.status, 'home_score', f.home_score,
        'away_score', f.away_score),
      'votes', public.duel_vote_totals(d.id),
      'created_at', d.created_at) as row,
      coalesce(d.settled_at, d.accepted_at, d.created_at) as sort_at
    from public.duels d
    join public.fixtures f on f.id = d.fixture_id
    join public.profiles c on c.id = d.challenger
    left join public.profiles o on o.id = d.opponent
    left join public.profiles w on w.id = d.winner
    where (p_fixture is null or d.fixture_id = p_fixture)
      and case p_scope
        when 'open' then d.status = 'pending' and d.opponent is null and f.kickoff_at > now()
        when 'live' then d.status = 'active'
        when 'settled' then d.status in ('settled', 'void')
        when 'mine' then auth.uid() is not null and auth.uid() in (d.challenger, d.opponent)
        else false end
    order by coalesce(d.settled_at, d.accepted_at, d.created_at) desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;
$$;

-- H2H Duel Leaderboard: duel XP (win 3, draw 1), then wins, then points won. p_days null = all time.
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
  order by 7 desc, 4 desc, 8 desc, 1
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- 7. Settlement (service role, called by /api/cron/settle). ---------------------------------------------------
-- Duels to grade: active with a final or void fixture; and pending duels whose kick-off passed (expire).
create or replace function public.duels_to_settle()
returns table (duel_id uuid, fixture_status text, home_score integer, away_score integer,
               user_id uuid, market text, selection text)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.id, f.status, f.home_score, f.away_score, p.user_id, p.market, p.selection
  from public.duels d
  join public.fixtures f on f.id = d.fixture_id
  join public.duel_picks p on p.duel_id = d.id
  where d.status = 'active' and f.status in ('finished', 'postponed', 'abandoned', 'cancelled');
$$;

-- p_results: [{"user_id": ..., "market": ..., "correct": true|false}] graded by the app's grade(); p_void when
-- the fixture was postponed/abandoned/cancelled. Idempotent: only an active duel is settled.
create or replace function public.settle_duel(p_duel uuid, p_results jsonb, p_void boolean)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels;
  v_c integer;
  v_o integer;
  v_winner uuid;
  v_fixture public.fixtures;
begin
  select * into v_duel from public.duels where id = p_duel for update;
  if not found or v_duel.status <> 'active' then return 'skipped'; end if;
  select * into v_fixture from public.fixtures where id = v_duel.fixture_id;

  if p_void then
    update public.duels set status = 'void', settled_at = now() where id = p_duel;
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel void: match not played');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel void: match not played');
    return 'void';
  end if;

  update public.duel_picks p set correct = (r->>'correct')::boolean
  from jsonb_array_elements(p_results) r
  where p.duel_id = p_duel and p.user_id = (r->>'user_id')::uuid and p.market = r->>'market';
  if exists (select 1 from public.duel_picks where duel_id = p_duel and correct is null) then
    raise exception 'incomplete_results' using errcode = 'P0001';
  end if;

  select count(*) filter (where user_id = v_duel.challenger and correct),
         count(*) filter (where user_id = v_duel.opponent and correct)
    into v_c, v_o from public.duel_picks where duel_id = p_duel;
  v_winner := case when v_c > v_o then v_duel.challenger when v_o > v_c then v_duel.opponent else null end;

  update public.duels set status = 'settled', settled_at = now(), challenger_correct = v_c,
    opponent_correct = v_o, winner = v_winner where id = p_duel;

  if v_winner is null then
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel drawn: stake returned');
    perform public.duel_refund(v_duel, v_duel.opponent, 'Duel drawn: stake returned');
  elsif v_duel.stake > 0 then
    insert into public.puntpoints_ledger (user_id, kind, points, ref_id, reason)
    values (v_winner, 'duel_payout', 2 * v_duel.stake, p_duel::text, 'Duel won: pot');
  end if;

  perform public.duel_notify(u,
           case when v_winner is null then 'Duel drawn' when v_winner = u then 'You won your duel' else 'Duel settled' end,
           v_fixture.home || ' ' || v_fixture.home_score || '-' || v_fixture.away_score || ' ' || v_fixture.away
             || ': ' || v_c || ' vs ' || v_o || ' correct calls.',
           '/duels/' || p_duel::text)
  from unnest(array[v_duel.challenger, v_duel.opponent]) u;
  return case when v_winner is null then 'draw' else 'settled' end;
end;
$$;

-- Pending challenges nobody accepted before kick-off: expired, stake returned.
create or replace function public.expire_duels()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels;
  v_n integer := 0;
begin
  for v_duel in
    select d.* from public.duels d join public.fixtures f on f.id = d.fixture_id
    where d.status = 'pending' and f.kickoff_at <= now()
    for update of d skip locked
  loop
    update public.duels set status = 'expired', settled_at = now() where id = v_duel.id;
    perform public.duel_refund(v_duel, v_duel.challenger, 'Duel expired: stake returned');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- 8. Account deletion: open challenges are cancelled and active duels voided (stakes returned). ----------------
create or replace function public.duels_on_anonymise()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_duel public.duels;
begin
  if new.username::text like 'deleted-%' and old.username::text not like 'deleted-%' then
    for v_duel in select * from public.duels where status in ('pending', 'active')
                  and new.id in (challenger, opponent) for update loop
      update public.duels set status = case when v_duel.status = 'pending' then 'cancelled' else 'void' end,
        settled_at = now() where id = v_duel.id;
      perform public.duel_refund(v_duel, v_duel.challenger, 'Duel closed: account deleted');
      if v_duel.status = 'active' then
        perform public.duel_refund(v_duel, v_duel.opponent, 'Duel closed: account deleted');
      end if;
    end loop;
    delete from public.duel_votes where user_id = new.id;
  end if;
  return new;
end;
$$;
create or replace trigger duels_on_anonymise after update of username on public.profiles
  for each row execute function public.duels_on_anonymise();

-- 9. Privileges. -------------------------------------------------------------------------------------------------
revoke all on function public.duel_notify(uuid, text, text, text), public.setting_bool(text, boolean), public.duel_check_picks(jsonb),
  public.duel_check_stake(uuid, integer), public.duel_refund(public.duels, uuid, text),
  public.create_duel(uuid, text, integer, jsonb, text), public.accept_duel(uuid, jsonb),
  public.withdraw_duel(uuid), public.vote_duel(uuid, text), public.duel_vote_totals(uuid),
  public.duel_detail(uuid), public.duels_feed(text, uuid, integer), public.duel_leaderboard(integer, integer),
  public.duels_to_settle(), public.settle_duel(uuid, jsonb, boolean), public.expire_duels(),
  public.duels_on_anonymise() from public, anon, authenticated;
grant execute on function public.create_duel(uuid, text, integer, jsonb, text), public.accept_duel(uuid, jsonb),
  public.withdraw_duel(uuid), public.vote_duel(uuid, text) to authenticated;
grant execute on function public.duel_detail(uuid), public.duels_feed(text, uuid, integer),
  public.duel_leaderboard(integer, integer), public.duel_vote_totals(uuid) to anon, authenticated;
grant execute on function public.duels_to_settle(), public.settle_duel(uuid, jsonb, boolean),
  public.expire_duels() to service_role;

-- 10. Legal notices r16 (Terms: Duels; Privacy: duel calls and votes). --------------------------------------------
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-14-r16', now(), '/privacy'), ('terms', '2026-11-14-r16', now(), '/terms')
on conflict (kind, version) do nothing;
