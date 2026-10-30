-- Plain SQL assertions for supabase/migrations/20261030120000_auth_passwords_mfa.sql. One transaction, rolled back.
-- Failures start with "ASSERT FAILED". Uses only invalid-domain emails.
begin;

delete from public.early_access;

-- 99 ordinary members leave exactly one Founding number.
create temp table t_fill (n int, id uuid);
insert into t_fill select n, gen_random_uuid() from generate_series(1, 99) n;
insert into auth.users (id, email, email_confirmed_at) select id, 'fill' || n || '@example.invalid', now() from t_fill;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'fill_' || n, 'Fill ' || n, true, 1990, now() from t_fill;
grant select on t_fill to authenticated, service_role;

insert into public.early_access (email, name, plan, founding_reserved)
values ('early@example.invalid', 'Early', 'free', true);

-- 1. An UNCONFIRMED reserved email signs up: no number, and the last spot stays held.
create temp table t_e (id uuid);
insert into t_e values (gen_random_uuid());
grant select on t_e to authenticated, service_role;
insert into auth.users (id, email) select id, 'early@example.invalid' from t_e;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'early_one', 'Early', true, 1990, now() from t_e;
do $$
begin
  if (select founding_number from public.profiles where username = 'early_one') is not null then
    raise exception 'ASSERT FAILED: an unconfirmed email took a held Founding number';
  end if;
  if public.founding_spots_held() <> 1 then
    raise exception 'ASSERT FAILED: the spot should still be held, got %', public.founding_spots_held();
  end if;
end $$;

-- 2. A stranger cannot take the held spot.
create temp table t_s (id uuid);
insert into t_s values (gen_random_uuid());
insert into auth.users (id, email, email_confirmed_at) select id, 'stranger@example.invalid', now() from t_s;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'stranger', 'Stranger', true, 1990, now() from t_s;
do $$
begin
  if (select founding_number from public.profiles where username = 'stranger') is not null then
    raise exception 'ASSERT FAILED: a stranger took the held spot';
  end if;
end $$;

-- 3. Claiming before the email is confirmed does nothing; after confirmation it assigns the last number.
do $$
declare v integer;
begin
  set local role service_role;
  v := public.claim_reserved_founding((select id from t_e));
  reset role;
  if v is not null then raise exception 'ASSERT FAILED: claimed with an unconfirmed email'; end if;

  update auth.users set email_confirmed_at = now() where id = (select id from t_e);
  set local role service_role;
  v := public.claim_reserved_founding((select id from t_e));
  reset role;
  if v is distinct from 100 then raise exception 'ASSERT FAILED: expected number 100, got %', v; end if;
  if public.founding_spots_held() <> 0 then raise exception 'ASSERT FAILED: nothing should be held now'; end if;

  set local role service_role;
  v := public.claim_reserved_founding((select id from t_e));
  reset role;
  if v is not null then raise exception 'ASSERT FAILED: claimed twice'; end if;
end $$;

-- 4. Clients cannot call claim_reserved_founding.
do $$
declare v_msg text;
begin
  set local role authenticated;
  begin perform public.claim_reserved_founding((select id from t_e)); exception when insufficient_privilege then v_msg := 'blocked'; end;
  reset role;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: authenticated could claim a Founding number'; end if;
end $$;

-- 5. Two-factor enforcement.
create temp table t_f (id uuid);
with f as (insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'mfa1') returning id)
insert into t_f select id from f;
grant select on t_f to authenticated, service_role;

insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
values (gen_random_uuid(), (select id from t_fill where n = 1), 'totp', 'verified', now(), now());

create or replace function pg_temp.as_user(p_n int, p_aal text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_fill where n = p_n), 'role', 'authenticated', 'aal', p_aal)::text, true);
end $$;

do $$
declare v_msg text; v_n int;
begin
  -- member 1 has a verified factor; member 2 does not
  set local role authenticated;
  perform pg_temp.as_user(1, 'aal1');
  begin perform public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'mfa_required' then raise exception 'ASSERT FAILED: aal1 post allowed for a member with a factor (%)', v_msg; end if;

  select count(*) into v_n from public.profiles where id = (select id from t_fill where n = 1);
  if v_n <> 0 then raise exception 'ASSERT FAILED: aal1 session could read its own profile despite a factor'; end if;

  perform pg_temp.as_user(1, 'aal2');
  perform public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null);
  select count(*) into v_n from public.profiles where id = (select id from t_fill where n = 1);
  if v_n <> 1 then raise exception 'ASSERT FAILED: aal2 session could not read its profile'; end if;

  perform pg_temp.as_user(2, 'aal1');
  perform public.create_prediction((select id from t_f), '1X2', 'away', null, 3.00, 3, null);
  select count(*) into v_n from public.profiles where id = (select id from t_fill where n = 2);
  if v_n <> 1 then raise exception 'ASSERT FAILED: a member without a factor lost access'; end if;
  reset role;
end $$;

select 'auth_passwords_mfa: all assertions passed' as result;
rollback;
