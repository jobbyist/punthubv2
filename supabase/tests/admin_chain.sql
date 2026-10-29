-- Plain SQL assertions for supabase/migrations/20261030100000_admin_chain.sql.
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 3) n;
insert into auth.users (id, email) select id, 'ad' || n || '@example.invalid' from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'adm_' || n, 'Adm ' || n, true, 1990, now() from t_u;
update public.profiles set role = 'admin' where username = 'adm_1';

create temp table t_f (id uuid);
with f as (insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'ad1') returning id)
insert into t_f select id from f;
grant select on t_u, t_f to authenticated, service_role;

create or replace function pg_temp.as_user(p_n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = p_n), 'role', 'authenticated')::text, true);
end $$;

-- two picks, by two members
set local role authenticated;
select pg_temp.as_user(2);
select public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null);
select pg_temp.as_user(3);
select public.create_prediction((select id from t_f), '1X2', 'away', null, 3.00, 3, null);
reset role;

-- auto-settle the first pick as lost, as the cron would
insert into public.settlement_events (prediction_id, result, units, source)
select id, 'lost', -1, 'auto' from public.predictions where user_id = (select id from t_u where n = 2);

-- 1. A non-admin cannot correct a result; an admin needs a reason; unknown picks and results are refused
do $$
declare v_pred uuid; v_msg text;
begin
  select id into v_pred from public.predictions where user_id = (select id from t_u where n = 2);
  set local role authenticated;
  perform pg_temp.as_user(2);
  begin perform public.admin_settle_prediction(v_pred, 'won', 'I deserve it'); exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a normal member corrected a result'; end if;

  perform pg_temp.as_user(1);
  v_msg := null;
  begin perform public.admin_settle_prediction(v_pred, 'won', '   '); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'reason_required' then raise exception 'ASSERT FAILED: correction without a reason accepted (%)', v_msg; end if;
  v_msg := null;
  begin perform public.admin_settle_prediction(v_pred, 'drawn', 'x'); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'invalid_result' then raise exception 'ASSERT FAILED: unknown result accepted (%)', v_msg; end if;
  v_msg := null;
  begin perform public.admin_settle_prediction(gen_random_uuid(), 'won', 'x'); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'prediction_not_found' then raise exception 'ASSERT FAILED: unknown pick accepted (%)', v_msg; end if;
  reset role;
end $$;

-- 2. A correction is a new event with its reason; the old event is still there; units come from the odds
do $$
declare v_pred uuid; v_events integer; v_current text; v_units numeric; v_reason text; v_admin uuid; v_old integer;
begin
  select id into v_pred from public.predictions where user_id = (select id from t_u where n = 2);
  set local role authenticated;
  perform pg_temp.as_user(1);
  perform public.admin_settle_prediction(v_pred, 'won', '  Score was entered wrongly by the provider  ');
  reset role;
  select count(*) into v_events from public.settlement_events where prediction_id = v_pred;
  select count(*) into v_old from public.settlement_events where prediction_id = v_pred and source = 'auto' and result = 'lost';
  select result, units into v_current, v_units from public.prediction_results where prediction_id = v_pred;
  select reason, admin_id into v_reason, v_admin from public.settlement_events where prediction_id = v_pred and source = 'admin';
  if v_events <> 2 or v_old <> 1 then raise exception 'ASSERT FAILED: expected the original event plus one correction, got % events (% original)', v_events, v_old; end if;
  if v_current <> 'won' or v_units <> 1.10 then raise exception 'ASSERT FAILED: latest result should be won +1.10, got % %', v_current, v_units; end if;
  if v_reason <> 'Score was entered wrongly by the provider' or v_admin <> (select id from t_u where n = 1) then
    raise exception 'ASSERT FAILED: reason or admin not recorded';
  end if;
  -- a second correction (to void) is allowed and also appended
  set local role authenticated;
  perform pg_temp.as_user(1);
  perform public.admin_settle_prediction(v_pred, 'void', 'Match was abandoned');
  reset role;
  select result, units into v_current, v_units from public.prediction_results where prediction_id = v_pred;
  if v_current <> 'void' or v_units <> 0 then raise exception 'ASSERT FAILED: second correction not applied'; end if;
  select count(*) into v_events from public.settlement_events where prediction_id = v_pred;
  if v_events <> 3 then raise exception 'ASSERT FAILED: expected 3 events, got %', v_events; end if;
end $$;

-- 3. Events still cannot be edited or deleted, even by the service role
do $$
declare v_msg text;
begin
  begin update public.settlement_events set units = 99; exception when others then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a settlement event was updated'; end if;
  v_msg := null;
  begin delete from public.settlement_events; exception when others then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a settlement event was deleted'; end if;
end $$;

-- 4. write_chain_head: matches the head create_prediction wrote, and repairs a tampered row
do $$
declare
  v_day date := (now() at time zone 'Africa/Johannesburg')::date;
  v_stored text; v_last text; v_count integer; v_after text; v_returned_count integer;
begin
  select hash into v_stored from public.chain_heads where day = v_day;
  select hash into v_last from public.predictions order by seq desc limit 1;
  if v_stored is distinct from v_last then raise exception 'ASSERT FAILED: create_prediction wrote an unexpected head'; end if;

  update public.chain_heads set hash = repeat('0', 64), pick_count = 99 where day = v_day;
  set local role service_role;
  select w.head_pick_count into v_returned_count from public.write_chain_head(v_day) w;
  reset role;
  select hash, pick_count into v_after, v_count from public.chain_heads where day = v_day;
  if v_after <> v_last or v_count <> 2 or v_returned_count <> 2 then
    raise exception 'ASSERT FAILED: chain head not repaired (% / %)', v_after, v_count;
  end if;
  -- a day with no picks writes nothing
  set local role service_role;
  if exists (select 1 from public.write_chain_head(date '2000-01-01')) then raise exception 'ASSERT FAILED: wrote a head for a day with no picks'; end if;
  reset role;
end $$;

-- 5. Clients cannot call write_chain_head
do $$
declare v_msg text;
begin
  set local role authenticated;
  begin perform public.write_chain_head(current_date); exception when insufficient_privilege then v_msg := 'blocked'; end;
  reset role;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: authenticated could call write_chain_head'; end if;
end $$;

rollback;
