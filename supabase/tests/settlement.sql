-- Plain SQL assertions for supabase/migrations/20261030080000_settlement.sql.
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 2) n;
insert into auth.users (id, email) select id, 'set' || n || '@example.invalid' from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'settle_' || n, 'Settle ' || n, true, 1990, now() from t_u;

-- Picks are created through the real RPC while the match is in the future, then the match is moved into the past.
create temp table t_f (id uuid, kind text);
with f as (
  insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values
    ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'fin'),
    ('soccer', 'Test', 'C', 'D', now() + interval '1 day', 'test', 'open'),
    ('soccer', 'Test', 'E', 'F', now() + interval '1 day', 'test', 'cancel'),
    ('soccer', 'Test', 'G', 'H', now() + interval '1 day', 'test', 'post')
  returning id, provider_ref
)
insert into t_f select id, provider_ref from f;
grant select on t_u, t_f to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = 1), 'role', 'authenticated')::text, true);
select public.create_prediction((select id from t_f where kind = 'fin'), '1X2', 'home', null, 2.10, 3, null);
select public.create_prediction((select id from t_f where kind = 'fin'), 'BTTS', 'no', null, 1.80, 3, null);
select public.create_prediction((select id from t_f where kind = 'open'), '1X2', 'home', null, 2.00, 3, null);
select public.create_prediction((select id from t_f where kind = 'cancel'), '1X2', 'away', null, 3.00, 3, null);
select public.create_prediction((select id from t_f where kind = 'post'), '1X2', 'draw', null, 3.20, 3, null);
reset role;

-- fin finished 2-0; cancel cancelled; post postponed with kick-off long ago; open stays scheduled.
update public.fixtures set kickoff_at = now() - interval '5 hours', status = 'finished', home_score = 2, away_score = 0
  where id = (select id from t_f where kind = 'fin');
update public.fixtures set kickoff_at = now() - interval '5 hours', status = 'cancelled' where id = (select id from t_f where kind = 'cancel');
update public.fixtures set kickoff_at = now() - interval '4 days', status = 'postponed' where id = (select id from t_f where kind = 'post');

-- 1. pending_settlements: only the finished, cancelled and long-postponed fixtures; not the scheduled one
do $$
declare v_n integer; v_open integer;
begin
  set local role service_role;
  select count(*) into v_n from public.pending_settlements() where prediction_id in (select id from public.predictions where user_id = (select id from t_u where n = 1));
  select count(*) into v_open from public.pending_settlements() ps join public.predictions p on p.id = ps.prediction_id join t_f on t_f.id = p.fixture_id where t_f.kind = 'open';
  reset role;
  if v_n <> 4 then raise exception 'ASSERT FAILED: expected 4 pending picks, got %', v_n; end if;
  if v_open <> 0 then raise exception 'ASSERT FAILED: a scheduled fixture was offered for settlement'; end if;
end $$;

-- 2. apply: correct units are written once; wrong units and repeat runs are ignored
do $$
declare
  v_rows jsonb;
  v_n integer;
  v_again integer;
  v_bad integer;
begin
  select jsonb_agg(jsonb_build_object('prediction_id', p.id, 'result',
           case when p.market = '1X2' and p.selection = 'home' and f.status = 'finished' then 'won'
                when p.market = 'BTTS' then 'lost'
                else 'void' end,
           'units',
           case when p.market = '1X2' and p.selection = 'home' and f.status = 'finished' then p.odds - 1
                when p.market = 'BTTS' then -1
                else 0 end))
    into v_rows
  from public.predictions p join public.fixtures f on f.id = p.fixture_id
  where f.id in (select id from t_f where kind in ('fin', 'cancel', 'post'));

  set local role service_role;
  v_n := public.apply_auto_settlements(v_rows);
  v_again := public.apply_auto_settlements(v_rows);
  -- a won pick claiming the wrong units is refused (the pick is already settled, so use a fresh one)
  reset role;
  if v_n <> 4 then raise exception 'ASSERT FAILED: expected 4 settlements, got %', v_n; end if;
  if v_again <> 0 then raise exception 'ASSERT FAILED: a rerun inserted % duplicate settlements', v_again; end if;
  if (select units from public.prediction_results r join public.predictions p on p.id = r.prediction_id
        where p.market = '1X2' and p.selection = 'home' and p.fixture_id = (select id from t_f where kind = 'fin')) <> 1.10 then
    raise exception 'ASSERT FAILED: won units should be odds - 1 = 1.10';
  end if;
  select count(*) into v_bad from public.settlement_events where source <> 'auto' and prediction_id in (select id from public.predictions where user_id = (select id from t_u where n = 1));
  if v_bad <> 0 then raise exception 'ASSERT FAILED: unexpected non-auto settlements'; end if;
end $$;

-- 3. Wrong units are refused; unknown results are refused
do $$
declare v_pred uuid; v_n integer;
begin
  -- a new pick on a new fixture, settled with deliberately wrong units
  insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
    values ('soccer', 'Test', 'I', 'J', now() + interval '1 day', 'test', 'wrong');
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = 2), 'role', 'authenticated')::text, true);
  select id into v_pred from public.create_prediction((select id from public.fixtures where provider_ref = 'wrong'), '1X2', 'home', null, 2.50, 3, null);
  reset role;
  update public.fixtures set kickoff_at = now() - interval '3 hours', status = 'finished', home_score = 1, away_score = 0 where provider_ref = 'wrong';
  set local role service_role;
  v_n := public.apply_auto_settlements(jsonb_build_array(jsonb_build_object('prediction_id', v_pred, 'result', 'won', 'units', 5)));
  if v_n <> 0 then raise exception 'ASSERT FAILED: settlement with wrong units was accepted'; end if;
  v_n := public.apply_auto_settlements(jsonb_build_array(jsonb_build_object('prediction_id', v_pred, 'result', 'drawn', 'units', 0)));
  if v_n <> 0 then raise exception 'ASSERT FAILED: settlement with an unknown result was accepted'; end if;
  v_n := public.apply_auto_settlements(jsonb_build_array(jsonb_build_object('prediction_id', v_pred, 'result', 'won', 'units', 1.5)));
  reset role;
  if v_n <> 1 then raise exception 'ASSERT FAILED: correct settlement (odds 2.50 -> 1.50) was refused'; end if;
end $$;

-- 4. Clients cannot call either function
do $$
declare v_msg text;
begin
  set local role authenticated;
  begin perform public.pending_settlements(); exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: authenticated could call pending_settlements'; end if;
  v_msg := null;
  begin perform public.apply_auto_settlements('[]'::jsonb); exception when insufficient_privilege then v_msg := 'blocked'; end;
  reset role;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: authenticated could call apply_auto_settlements'; end if;
end $$;

-- 5. The leaderboard and stats views see the result
do $$
declare v_units numeric; v_settled integer;
begin
  select units, settled into v_units, v_settled from public.tipster_stats where username = 'settle_1';
  -- won +1.10, lost -1, void 0, void 0
  if v_units <> 0.10 or v_settled <> 2 then
    raise exception 'ASSERT FAILED: tipster_stats units % settled % (expected 0.10 and 2)', v_units, v_settled;
  end if;
end $$;

rollback;
