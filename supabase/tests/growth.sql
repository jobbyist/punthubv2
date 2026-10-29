-- Plain SQL assertions for supabase/migrations/20261030090000_growth.sql.
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 4) n;
insert into auth.users (id, email) select id, 'gr' || n || '@example.invalid' from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'grow_' || n, 'Grow ' || n, true, 1990, now() from t_u where n in (1, 4);
-- 2 and 3 were referred by 1; 4 has no referrer
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at, referred_by)
select id, 'grow_' || n, 'Grow ' || n, true, 1990, now(), (select id from t_u where n = 1) from t_u where n in (2, 3);

create temp table t_f (id uuid);
with f as (insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'g1'),
         ('soccer', 'Test', 'C', 'D', now() + interval '1 day', 'test', 'g2') returning id)
insert into t_f select id from f;
grant select on t_u, t_f to authenticated, service_role, anon;

create or replace function pg_temp.as_user(p_n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = p_n), 'role', 'authenticated')::text, true);
end $$;

-- 1. Founding counter counts founding numbers and is public
do $$
declare v integer;
begin
  set local role anon;
  select public.founding_spots_taken() into v;
  reset role;
  if v <> 4 then raise exception 'ASSERT FAILED: expected 4 founding spots taken, got %', v; end if;
end $$;

-- 2. A referral counts only at the first pick, and only once
set local role authenticated;
do $$
declare v_rewards integer;
begin
  perform pg_temp.as_user(2);
  select count(*) into v_rewards from public.referral_rewards;
  if v_rewards <> 0 then raise exception 'ASSERT FAILED: a reward existed before any pick'; end if;
  perform public.create_prediction((select id from t_f limit 1), '1X2', 'home', null, 2.0, 3, null);
end $$;
reset role;

do $$
declare v_rewards integer; v_credits integer; v_status text;
begin
  select count(*), max(referrer_credits), max(status) into v_rewards, v_credits, v_status from public.referral_rewards;
  if v_rewards <> 1 or v_credits <> 15 or v_status <> 'pending' then
    raise exception 'ASSERT FAILED: expected one pending 15-credit reward, got % rows, % credits, %', v_rewards, v_credits, v_status;
  end if;
end $$;

set local role authenticated;
do $$
declare v_rewards integer;
begin
  perform pg_temp.as_user(2);
  -- a second pick by the same friend adds nothing
  perform public.create_prediction((select id from t_f limit 1), 'BTTS', 'yes', null, 1.9, 3, null);
  perform public.create_prediction((select id from t_f offset 1 limit 1), '1X2', 'away', null, 3.1, 3, null);
  perform pg_temp.as_user(4);
  -- a member with no referrer creates no reward
  perform public.create_prediction((select id from t_f limit 1), '1X2', 'draw', null, 3.3, 3, null);
end $$;
reset role;

do $$
declare v_rewards integer;
begin
  select count(*) into v_rewards from public.referral_rewards;
  if v_rewards <> 1 then raise exception 'ASSERT FAILED: expected 1 reward after more picks, got %', v_rewards; end if;
end $$;

-- 3. Counts for the referrer: two signed up, one joined (posted a first pick)
set local role authenticated;
do $$
declare v_signed integer; v_joined integer;
begin
  perform pg_temp.as_user(1);
  select signed_up, joined into v_signed, v_joined from public.my_referral_counts();
  if v_signed <> 2 or v_joined <> 1 then
    raise exception 'ASSERT FAILED: referral counts % signed up, % joined (expected 2 and 1)', v_signed, v_joined;
  end if;
  -- a member with no referrals sees zeros
  perform pg_temp.as_user(4);
  select signed_up, joined into v_signed, v_joined from public.my_referral_counts();
  if v_signed <> 0 or v_joined <> 0 then raise exception 'ASSERT FAILED: member with no referrals sees non-zero counts'; end if;
end $$;

-- 4. Row level security: referrer and referred see the row; a stranger and anon do not; nobody can write
do $$
declare v integer; v_msg text;
begin
  perform pg_temp.as_user(1); select count(*) into v from public.referral_rewards;
  if v <> 1 then raise exception 'ASSERT FAILED: referrer cannot see their reward'; end if;
  perform pg_temp.as_user(2); select count(*) into v from public.referral_rewards;
  if v <> 1 then raise exception 'ASSERT FAILED: referred member cannot see their reward'; end if;
  perform pg_temp.as_user(3); select count(*) into v from public.referral_rewards;
  if v <> 0 then raise exception 'ASSERT FAILED: a stranger can see someone else''s reward'; end if;
  begin
    insert into public.referral_rewards (referrer_id, referred_id, qualifying_prediction_id)
      select id, id, (select id from public.predictions limit 1) from t_u where n = 3;
  exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: a member could insert a reward'; end if;
end $$;
reset role;

set local role anon;
do $$
declare v_msg text;
begin
  begin perform count(*) from public.referral_rewards; exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: anon can read referral_rewards'; end if;
  v_msg := null;
  begin perform count(*) from public.waitlist_invites; exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: anon can read waitlist_invites'; end if;
  v_msg := null;
  begin perform count(*) from public.waitlist_unsubscribes; exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: anon can read waitlist_unsubscribes'; end if;
end $$;
reset role;

-- 5. Invite log: one row per email, lower-case only
do $$
declare v_msg text;
begin
  insert into public.waitlist_invites (email) values ('a@example.invalid');
  begin insert into public.waitlist_invites (email) values ('a@example.invalid'); exception when unique_violation then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: duplicate invite row accepted'; end if;
  v_msg := null;
  begin insert into public.waitlist_invites (email) values ('B@example.invalid'); exception when check_violation then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: upper-case email accepted'; end if;
end $$;

rollback;
