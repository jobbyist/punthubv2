-- Plain SQL assertions for supabase/migrations/20261029071500_mvp_core.sql.
-- Run against a scratch or branch database, never production data:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/mvp_core.sql
-- Everything runs in one transaction and is rolled back at the end. Any failure aborts with a message
-- starting "ASSERT FAILED". A clean run prints "ALL MVP CORE TESTS PASSED" as a NOTICE.

begin;

-- ---------------------------------------------------------------------------
-- Fixture data (as the postgres role, which is privileged for the profile guard)
-- ---------------------------------------------------------------------------
create temp table t_users as
  select n, gen_random_uuid() as id from generate_series(1, 102) n;

insert into auth.users (id, email)
select id, 'test' || n || '@example.invalid' from t_users;

insert into public.profiles (id, username, display_name, is_18_attested, popia_consent_at)
select id, 'user_' || lpad(n::text, 3, '0'), 'User ' || n, true, now()
from t_users
order by n;

create temp table t_fix (open_id uuid, past_id uuid, rugby_id uuid);

with f as (
  insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values
    ('soccer', 'Test League', 'Home FC', 'Away FC', now() + interval '1 day', 'test', 'open'),
    ('soccer', 'Test League', 'Old FC', 'Gone FC', now() - interval '1 hour', 'test', 'past'),
    ('rugby', 'Test Cup', 'Home RFC', 'Away RFC', now() + interval '2 days', 'test', 'rugby')
  returning id, provider_ref
)
insert into t_fix
select
  (select id from f where provider_ref = 'open'),
  (select id from f where provider_ref = 'past'),
  (select id from f where provider_ref = 'rugby');

grant select on t_users, t_fix to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 1. Founding numbers: first 100 get 1..100, the 101st gets none
-- ---------------------------------------------------------------------------
do $$
declare
  v_assigned integer;
  v_distinct integer;
  v_min integer;
  v_max integer;
  v_101 integer;
  v_102 integer;
begin
  select count(founding_number), count(distinct founding_number), min(founding_number), max(founding_number)
    into v_assigned, v_distinct, v_min, v_max
  from public.profiles where username like 'user\_%';
  if v_assigned <> 100 or v_distinct <> 100 or v_min <> 1 or v_max <> 100 then
    raise exception 'ASSERT FAILED founding: assigned %, distinct %, min %, max %', v_assigned, v_distinct, v_min, v_max;
  end if;

  select founding_number into v_101 from public.profiles where username = 'user_101';
  select founding_number into v_102 from public.profiles where username = 'user_102';
  if v_101 is not null or v_102 is not null then
    raise exception 'ASSERT FAILED: the 101st profile got founding number % / %', v_101, v_102;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Profile guard: a client cannot grant itself admin or a founding number
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_blocked boolean := false;
begin
  select id into v_uid from t_users where n = 101;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  update public.profiles set display_name = 'Renamed' where id = v_uid;

  begin
    update public.profiles set role = 'admin' where id = v_uid;
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERT FAILED: client could set role = admin';
  end if;

  v_blocked := false;
  begin
    update public.profiles set founding_number = 5 where id = v_uid;
  exception when insufficient_privilege or unique_violation then
    v_blocked := true;
  end;
  if not v_blocked then
    raise exception 'ASSERT FAILED: client could set founding_number';
  end if;

  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Posting: success, duplicate market, after kick-off, bad market for sport
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_fix record;
  v_row public.predictions;
  v_failed text;
begin
  select id into v_uid from t_users where n = 1;
  select * into v_fix from t_fix;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  v_row := public.create_prediction(v_fix.open_id, '1X2', 'Home', null, 2.1, 3, 'test pick');
  if v_row.selection <> 'home' or v_row.odds::text <> '2.10' or v_row.prev_hash <> repeat('0', 64) then
    raise exception 'ASSERT FAILED: first pick stored wrongly: %', v_row;
  end if;

  perform public.create_prediction(v_fix.open_id, 'OU25', 'over', null, 1.85, 4, null);
  perform public.create_prediction(v_fix.rugby_id, 'HCP', 'away', -7.5, 1.9, 2, null);

  -- duplicate market
  v_failed := null;
  begin
    perform public.create_prediction(v_fix.open_id, '1X2', 'away', null, 3.2, 1, null);
  exception when unique_violation then
    v_failed := 'unique_violation';
  end;
  if v_failed is distinct from 'unique_violation' then
    raise exception 'ASSERT FAILED: duplicate market was accepted';
  end if;

  -- after kick-off
  v_failed := null;
  begin
    perform public.create_prediction(v_fix.past_id, '1X2', 'home', null, 2.0, 3, null);
  exception when others then
    v_failed := sqlerrm;
  end;
  if v_failed is distinct from 'kickoff_passed' then
    raise exception 'ASSERT FAILED: pick after kick-off gave "%"', v_failed;
  end if;

  -- OU25 on rugby, HCP on soccer
  v_failed := null;
  begin
    perform public.create_prediction(v_fix.rugby_id, 'OU25', 'over', null, 1.9, 3, null);
  exception when others then
    v_failed := sqlerrm;
  end;
  if v_failed is distinct from 'invalid_market_for_sport' then
    raise exception 'ASSERT FAILED: OU25 on rugby gave "%"', v_failed;
  end if;

  v_failed := null;
  begin
    perform public.create_prediction(v_fix.open_id, 'HCP', 'home', -1.5, 1.9, 3, null);
  exception when others then
    v_failed := sqlerrm;
  end;
  if v_failed is distinct from 'invalid_market_for_sport' then
    raise exception 'ASSERT FAILED: HCP on soccer gave "%"', v_failed;
  end if;

  -- a client cannot insert into predictions directly
  v_failed := null;
  begin
    insert into public.predictions (user_id, fixture_id, market, selection, odds, confidence, prev_hash, hash)
    values (v_uid, v_fix.rugby_id, '1X2', 'home', 2.0, 3, repeat('0', 64), repeat('1', 64));
  exception when insufficient_privilege then
    v_failed := 'denied';
  end;
  if v_failed is distinct from 'denied' then
    raise exception 'ASSERT FAILED: client could insert into predictions directly';
  end if;

  reset role;
end $$;

-- A second user posts so the chain has rows from more than one user.
do $$
declare
  v_uid uuid;
  v_open uuid;
begin
  select id into v_uid from t_users where n = 2;
  select open_id into v_open from t_fix;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.create_prediction(v_open, 'BTTS', 'yes', null, 1.75, 3, null);
  perform public.create_prediction(v_open, 'DC', '1x', null, 1.3, 2, null);
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Append-only: UPDATE and DELETE fail for postgres, service_role and authenticated
-- ---------------------------------------------------------------------------
do $$
declare
  v_role text;
  v_op text;
  v_msg text;
begin
  foreach v_role in array array['postgres', 'service_role', 'authenticated'] loop
    foreach v_op in array array['update', 'delete'] loop
      v_msg := null;
      begin
        if v_role <> 'postgres' then
          execute format('set local role %I', v_role);
        end if;
        if v_op = 'update' then
          update public.predictions set confidence = 5;
        else
          delete from public.predictions;
        end if;
      exception when others then
        v_msg := sqlerrm;
      end;
      reset role;
      if v_msg is null then
        raise exception 'ASSERT FAILED: % on predictions succeeded as %', v_op, v_role;
      end if;
      -- postgres and service_role must be stopped by the trigger itself, not by a missing grant.
      if v_role in ('postgres', 'service_role') and v_msg not like '%append-only%' then
        raise exception 'ASSERT FAILED: % as % failed for the wrong reason: %', v_op, v_role, v_msg;
      end if;
    end loop;
  end loop;

  -- TRUNCATE is blocked too
  v_msg := null;
  begin
    truncate public.predictions cascade;
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like '%append-only%' then
    raise exception 'ASSERT FAILED: truncate predictions: %', coalesce(v_msg, 'succeeded');
  end if;
end $$;

-- settlement_events are append-only as well
do $$
declare
  v_pred uuid;
  v_msg text;
begin
  select id into v_pred from public.predictions order by seq limit 1;
  insert into public.settlement_events (prediction_id, result, units, source) values (v_pred, 'won', 1.10, 'auto');
  insert into public.settlement_events (prediction_id, result, units, source, reason, admin_id)
    values (v_pred, 'void', 0, 'admin', 'test correction', (select id from t_users where n = 1));

  if (select result from public.prediction_results where prediction_id = v_pred) <> 'void' then
    raise exception 'ASSERT FAILED: latest settlement event is not the current result';
  end if;

  begin
    update public.settlement_events set units = 99;
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is null or v_msg not like '%append-only%' then
    raise exception 'ASSERT FAILED: settlement_events update: %', coalesce(v_msg, 'succeeded');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Chain: recompute every hash from the first row and compare
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  v_prev text := repeat('0', 64);
  v_expected text;
  v_count integer := 0;
begin
  for r in select * from public.predictions order by seq loop
    v_count := v_count + 1;
    if r.prev_hash <> v_prev then
      raise exception 'ASSERT FAILED: row % prev_hash % does not match previous hash %', r.seq, r.prev_hash, v_prev;
    end if;
    v_expected := encode(sha256(convert_to(
      r.prev_hash
      || r.user_id::text
      || r.fixture_id::text
      || r.market
      || r.selection
      || coalesce(r.line::text, '')
      || r.odds::text
      || to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'UTF8')), 'hex');
    if v_expected <> r.hash then
      raise exception 'ASSERT FAILED: row % hash mismatch (expected %, stored %)', r.seq, v_expected, r.hash;
    end if;
    v_prev := r.hash;
  end loop;

  if v_count < 5 then
    raise exception 'ASSERT FAILED: expected at least 5 chained rows, found %', v_count;
  end if;

  if (select sum(pick_count) from public.chain_heads) <> v_count then
    raise exception 'ASSERT FAILED: chain_heads pick_count does not add up to %', v_count;
  end if;
  if (select hash from public.chain_heads order by day desc limit 1) <> v_prev then
    raise exception 'ASSERT FAILED: latest chain head does not match the last hash';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Daily limit: the 31st pick in a day is refused
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_msg text;
  i integer;
begin
  select id into v_uid from t_users where n = 3;

  insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  select 'soccer', 'Cap League', 'H' || g, 'A' || g, now() + interval '3 days', 'test', 'cap' || g
  from generate_series(1, 31) g;

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  for i in 1..30 loop
    perform public.create_prediction((select id from public.fixtures where provider_ref = 'cap' || i), '1X2', 'home', null, 2.0, 3, null);
  end loop;

  begin
    perform public.create_prediction((select id from public.fixtures where provider_ref = 'cap31'), '1X2', 'home', null, 2.0, 3, null);
  exception when others then
    v_msg := sqlerrm;
  end;
  reset role;

  if v_msg is distinct from 'daily_limit' then
    raise exception 'ASSERT FAILED: 31st pick gave "%"', coalesce(v_msg, 'success');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Leaderboard eligibility: under 10 settled picks is not eligible and has no rank
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_eligible boolean;
  v_rank integer;
  v_picks integer;
begin
  select id into v_uid from t_users where n = 3;

  insert into public.settlement_events (prediction_id, result, units, source)
  select id, 'won', odds - 1, 'auto'
  from public.predictions where user_id = v_uid order by seq limit 9;

  select eligible, rank, picks_settled into v_eligible, v_rank, v_picks
  from public.weekly_leaderboard where user_id = v_uid;
  if v_picks <> 9 or v_eligible or v_rank is not null then
    raise exception 'ASSERT FAILED: 9 settled picks gave picks %, eligible %, rank %', v_picks, v_eligible, v_rank;
  end if;

  insert into public.settlement_events (prediction_id, result, units, source)
  select id, 'lost', -1, 'auto'
  from public.predictions where user_id = v_uid
    and id not in (select prediction_id from public.settlement_events)
  order by seq limit 1;

  select eligible, rank, picks_settled into v_eligible, v_rank, v_picks
  from public.weekly_leaderboard where user_id = v_uid;
  if v_picks <> 10 or not v_eligible or v_rank <> 1 then
    raise exception 'ASSERT FAILED: 10 settled picks gave picks %, eligible %, rank %', v_picks, v_eligible, v_rank;
  end if;
end $$;

do $$ begin raise notice 'ALL MVP CORE TESTS PASSED'; end $$;

rollback;
