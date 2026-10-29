-- Plain SQL assertions for supabase/migrations/20261030150000_puntpoints_rewards.sql. One transaction, rolled back.
-- Failures start with "ASSERT FAILED". Contains no delete or drop. If the SQL editor truncates it, run it in two
-- parts (docs/puntpoints.md) or use the Supabase CLI. Uses only invalid-domain emails.
begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 5) n;
-- 1 referrer, 2 and 5 referred, 3 unconfirmed email, 4 admin
insert into auth.users (id, email, email_confirmed_at)
select id, 'pp' || n || '@example.invalid', case when n <> 3 then now() end from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'pp_' || n, 'Pp ' || n, true, 1990, now() from t_u;
update public.profiles set role = 'admin' where id = (select id from t_u where n = 4);
update public.profiles set referred_by = (select id from t_u where n = 1) where id in (select id from t_u where n in (2, 5));
grant select on t_u to authenticated, service_role;

create temp table t_f (id uuid);
with f as (insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'pp1') returning id)
insert into t_f select id from f;
grant select on t_f to authenticated, service_role;

create or replace function pg_temp.as_user(p_n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = p_n), 'role', 'authenticated')::text, true);
end $$;
create or replace function pg_temp.bal(p_n int) returns integer language sql as $$
  select coalesce(sum(points), 0)::integer from public.puntpoints_ledger where user_id = (select id from t_u where n = p_n)
$$;

-- 1. Everything is off by default: nothing is awarded, and the app is told so.
do $$
declare v integer;
begin
  v := public.award_points((select id from t_u where n = 1), 'first_pick', 'once');
  if v <> 0 or pg_temp.bal(1) <> 0 then raise exception 'ASSERT FAILED: points awarded while switched off'; end if;
  if (select points_enabled or rewards_enabled from public.rewards_status()) then raise exception 'ASSERT FAILED: switches are not off by default'; end if;
  if exists (select 1 from public.point_rules where active) or exists (select 1 from public.rewards) then
    raise exception 'ASSERT FAILED: a rule is active or the catalogue is not empty by default';
  end if;
end $$;

-- 2. Switch on: awards are idempotent, capped, and only for confirmed members.
update public.reward_settings set enabled = true where key in ('points_enabled', 'rewards_enabled');
update public.point_rules set active = true;
do $$
declare v integer; i integer;
begin
  v := public.award_points((select id from t_u where n = 1), 'first_pick', 'once');
  if v <> 20 then raise exception 'ASSERT FAILED: first_pick should award 20, got %', v; end if;
  v := public.award_points((select id from t_u where n = 1), 'first_pick', 'once');
  if v <> 0 then raise exception 'ASSERT FAILED: the same award was made twice'; end if;
  v := public.award_points((select id from t_u where n = 3), 'first_pick', 'once');
  if v <> 0 then raise exception 'ASSERT FAILED: an unconfirmed email earned points'; end if;
  for i in 1..12 loop
    perform public.award_points((select id from t_u where n = 1), 'pick_locked', 'r' || i);
  end loop;
  if (select count(*) from public.puntpoints_ledger where user_id = (select id from t_u where n = 1) and rule_code = 'pick_locked') <> 10 then
    raise exception 'ASSERT FAILED: the daily cap of 10 was not enforced';
  end if;
  -- on a break: no points
  update public.profiles set posting_paused_until = now() + interval '1 day' where id = (select id from t_u where n = 5);
  v := public.award_points((select id from t_u where n = 5), 'first_pick', 'once');
  update public.profiles set posting_paused_until = null where id = (select id from t_u where n = 5);
  if v <> 0 then raise exception 'ASSERT FAILED: a member on a break earned points'; end if;
end $$;

-- 3. Hooks: a pick earns points, settlement earns points (won or lost, never void).
do $$
declare v_pred uuid;
begin
  set local role authenticated;
  perform pg_temp.as_user(2);
  perform public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null);
  reset role;
  if pg_temp.bal(2) <> 22 then raise exception 'ASSERT FAILED: first pick should earn 22 (20 + 2), got %', pg_temp.bal(2); end if;
  select id into v_pred from public.predictions where user_id = (select id from t_u where n = 2);
  insert into public.settlement_events (prediction_id, result, units, source) values (v_pred, 'void', 0, 'auto');
  if pg_temp.bal(2) <> 22 then raise exception 'ASSERT FAILED: a void earned points'; end if;
  insert into public.settlement_events (prediction_id, result, units, source, reason, admin_id)
  values (v_pred, 'lost', -1, 'admin', 'test correction', (select id from t_u where n = 1));
  if pg_temp.bal(2) <> 25 then raise exception 'ASSERT FAILED: a settled pick should earn 3, balance %', pg_temp.bal(2); end if;
end $$;

-- 4. Referral: pending, vests after the wait, both sides earn, clawback on a ban, milestone bonus.
do $$
declare v integer; v_b1 integer; v_ref uuid;
begin
  select id into v_ref from public.referral_rewards where referred_id = (select id from t_u where n = 2);
  if v_ref is null then raise exception 'ASSERT FAILED: no referral row after the first pick'; end if;
  if public.vest_referrals() <> 0 then raise exception 'ASSERT FAILED: a referral vested before its wait'; end if;
  update public.referral_rewards set vests_at = now() - interval '1 day' where id = v_ref;
  v_b1 := pg_temp.bal(1);
  if public.vest_referrals() <> 1 then raise exception 'ASSERT FAILED: the referral did not vest'; end if;
  if pg_temp.bal(2) <> 50 or pg_temp.bal(1) <> v_b1 + 25 then raise exception 'ASSERT FAILED: referral points wrong (referred %, referrer %)', pg_temp.bal(2), pg_temp.bal(1); end if;
  if public.vest_referrals() <> 0 or pg_temp.bal(2) <> 50 then raise exception 'ASSERT FAILED: a referral was paid twice'; end if;
end $$;

do $$
declare v_ref uuid; v_b1 integer;
begin
  -- second referral, with a milestone at 2 qualified referrals
  insert into public.referral_milestones (threshold, title, bonus_points, active) values (2, 'Test milestone', 50, true);
  set local role authenticated;
  perform pg_temp.as_user(5);
  perform public.create_prediction((select id from t_f), '1X2', 'away', null, 3.00, 3, null);
  reset role;
  select id into v_ref from public.referral_rewards where referred_id = (select id from t_u where n = 5);
  update public.referral_rewards set vests_at = now() - interval '1 day' where id = v_ref;
  v_b1 := pg_temp.bal(1);
  perform public.vest_referrals();
  if pg_temp.bal(1) <> v_b1 + 25 + 50 then raise exception 'ASSERT FAILED: referral plus milestone should add 75, added %', pg_temp.bal(1) - v_b1; end if;
  -- clawback: ban the referred member (clear the fake member login first, or the profile guard blocks the update)
  perform set_config('request.jwt.claims', '', true);
  update public.profiles set is_banned = true where id = (select id from t_u where n = 5);
  v_b1 := pg_temp.bal(1);
  perform public.vest_referrals();
  if pg_temp.bal(1) <> v_b1 - 25 then raise exception 'ASSERT FAILED: the clawback should remove 25 from the referrer, changed by %', pg_temp.bal(1) - v_b1; end if;
  if (select status from public.referral_rewards where id = v_ref) <> 'void' then raise exception 'ASSERT FAILED: reversed referral not void'; end if;
  update public.profiles set is_banned = false where id = (select id from t_u where n = 5);
end $$;

-- 5. Rewards: eligibility, stock, codes, approval, cancel and refund, betting switch, balances.
insert into public.rewards (code, title, kind, points_cost, stock, requires_approval, active)
values ('perk_a', 'Perk A', 'perk', 30, 1, false, true),
       ('voucher_b', 'Retail voucher B', 'retail_voucher', 10, null, true, true),
       ('betting_c', 'Betting voucher C', 'betting_voucher', 10, null, true, true),
       ('big_d', 'Big reward D', 'sponsored', 100000, null, true, true);
insert into public.reward_codes (reward_id, code)
select id, c from public.rewards, (values ('B-1'), ('B-2')) v(c) where code = 'voucher_b';

do $$
declare v_msg text; v_red public.redemptions; v_n integer; v_bal integer;
begin
  set local role authenticated;
  perform pg_temp.as_user(1);
  select count(*) into v_n from public.list_rewards();
  if v_n <> 3 then raise exception 'ASSERT FAILED: member should see 3 rewards (betting hidden), saw %', v_n; end if;

  -- unconfirmed email cannot redeem
  perform pg_temp.as_user(3);
  begin perform public.redeem_reward((select id from public.rewards where code = 'perk_a')); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'not_eligible' then raise exception 'ASSERT FAILED: unconfirmed member redeemed (%)', v_msg; end if;

  -- an auto-fulfilled perk uses the one unit of stock
  perform pg_temp.as_user(1);
  v_bal := pg_temp.bal(1);
  v_red := public.redeem_reward((select id from public.rewards where code = 'perk_a'));
  if v_red.status <> 'fulfilled' or pg_temp.bal(1) <> v_bal - 30 then raise exception 'ASSERT FAILED: perk redemption wrong (% / %)', v_red.status, pg_temp.bal(1); end if;
  perform pg_temp.as_user(2);
  v_msg := null;
  begin perform public.redeem_reward((select id from public.rewards where code = 'perk_a')); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'out_of_stock' then raise exception 'ASSERT FAILED: over-stock redemption allowed (%)', v_msg; end if;

  -- not enough points
  v_msg := null;
  begin perform public.redeem_reward((select id from public.rewards where code = 'big_d')); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'insufficient_points' then raise exception 'ASSERT FAILED: spent points that were not there (%)', v_msg; end if;

  -- a voucher waits for an admin, and its code is not shown yet
  v_bal := pg_temp.bal(2);
  v_red := public.redeem_reward((select id from public.rewards where code = 'voucher_b'));
  if v_red.status <> 'requested' or v_red.voucher_code is not null or pg_temp.bal(2) <> v_bal - 10 then
    raise exception 'ASSERT FAILED: voucher redemption wrong (% / % / %)', v_red.status, v_red.voucher_code, pg_temp.bal(2);
  end if;
  reset role;

  -- betting vouchers are invisible and unredeemable while their switch is off
  set local role authenticated;
  perform pg_temp.as_user(1);
  v_msg := null;
  begin perform public.redeem_reward((select id from public.rewards where code = 'betting_c')); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'reward_not_found' then raise exception 'ASSERT FAILED: betting voucher redeemed while off (%)', v_msg; end if;
  reset role;
end $$;

do $$
declare v_msg text; v_red public.redemptions; v_id uuid; v_bal integer; v_n integer;
begin
  -- admin fulfils: the member now sees the code, other members never see it
  select id into v_id from public.redemptions where user_id = (select id from t_u where n = 2) and status = 'requested';
  set local role authenticated;
  perform pg_temp.as_user(4);
  v_red := public.admin_fulfil_redemption(v_id, 'sent');
  if v_red.status <> 'fulfilled' or v_red.voucher_code is null then raise exception 'ASSERT FAILED: fulfilment did not set the code'; end if;
  perform pg_temp.as_user(2);
  select count(*) into v_n from public.redemptions where voucher_code is not null;
  if v_n <> 1 then raise exception 'ASSERT FAILED: member should see their own fulfilled code'; end if;
  perform pg_temp.as_user(1);
  select count(*) into v_n from public.redemptions where user_id = (select id from t_u where n = 2);
  if v_n <> 0 then raise exception 'ASSERT FAILED: a member could see someone else''s redemption'; end if;
  select count(*) into v_n from public.reward_codes;
  if v_n <> 0 then raise exception 'ASSERT FAILED: a member could read voucher codes'; end if;

  -- a member cannot fulfil or adjust points
  v_msg := null;
  begin perform public.admin_adjust_points((select id from t_u where n = 1), 100, 'cheat'); exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a member adjusted points'; end if;
  reset role;

  -- cancel: points come back as a new row and the code is freed
  set local role authenticated;
  perform pg_temp.as_user(2);
  v_bal := pg_temp.bal(2);
  v_red := public.redeem_reward((select id from public.rewards where code = 'voucher_b'));
  perform pg_temp.as_user(4);
  v_msg := null;
  begin perform public.admin_cancel_redemption(v_red.id, '  '); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'reason_required' then raise exception 'ASSERT FAILED: cancelled without a reason (%)', v_msg; end if;
  perform public.admin_cancel_redemption(v_red.id, 'Sponsor ran out');
  reset role;
  if pg_temp.bal(2) <> v_bal then raise exception 'ASSERT FAILED: the cancel did not refund (% vs %)', pg_temp.bal(2), v_bal; end if;
  if (select count(*) from public.reward_codes where redemption_id is null) <> 1 then raise exception 'ASSERT FAILED: the code was not freed'; end if;

  -- admin adjustment: reason required, never negative
  set local role authenticated;
  perform pg_temp.as_user(4);
  v_bal := public.admin_adjust_points((select id from t_u where n = 2), 5, 'Goodwill');
  v_msg := null;
  begin perform public.admin_adjust_points((select id from t_u where n = 2), -100000, 'Too much'); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'would_go_negative' then raise exception 'ASSERT FAILED: balance went negative (%)', v_msg; end if;
  reset role;
end $$;

-- 6. Betting vouchers appear only with their own switch, and only for eligible members.
update public.reward_settings set enabled = true where key = 'betting_vouchers_enabled';
do $$
declare v_msg text; v_n integer; v_red public.redemptions;
begin
  set local role authenticated;
  perform pg_temp.as_user(1);
  select count(*) into v_n from public.list_rewards() where kind = 'betting_voucher';
  if v_n <> 1 then raise exception 'ASSERT FAILED: an eligible member should see the betting voucher'; end if;
  v_red := public.redeem_reward((select id from public.rewards where code = 'betting_c'));
  perform pg_temp.as_user(3);
  select count(*) into v_n from public.list_rewards() where kind = 'betting_voucher';
  if v_n <> 0 then raise exception 'ASSERT FAILED: an unconfirmed member saw a betting voucher'; end if;
  reset role;
end $$;

-- 7. Clients cannot write the ledger or award points; the ledger is append-only; points touch no public view.
do $$
declare v_msg text;
begin
  set local role authenticated;
  perform pg_temp.as_user(1);
  begin perform public.award_points((select id from t_u where n = 1), 'first_pick', 'x'); exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a client called award_points'; end if;
  v_msg := null;
  begin insert into public.puntpoints_ledger (user_id, kind, points) values ((select id from t_u where n = 1), 'adjust', 1000); exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a client wrote the ledger'; end if;
  reset role;
  v_msg := null;
  begin update public.puntpoints_ledger set points = 1; exception when others then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: the ledger was edited'; end if;
  if exists (select 1 from pg_views where schemaname = 'public' and definition ilike '%puntpoints%') then
    raise exception 'ASSERT FAILED: a public view reads points, which could change ranking';
  end if;
end $$;

select 'puntpoints_rewards: all assertions passed' as result;
rollback;
