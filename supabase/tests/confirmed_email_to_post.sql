-- Plain SQL assertions for supabase/migrations/20261030140000_confirmed_email_to_post.sql. Rolled back.
-- Failures start with "ASSERT FAILED". Contains no delete or drop.
begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 2) n;
-- member 1 has not confirmed their email; member 2 has
insert into auth.users (id, email, email_confirmed_at)
select id, 'cp' || n || '@example.invalid', case when n = 2 then now() end from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'cp_' || n, 'Cp ' || n, true, 1990, now() from t_u;
grant select on t_u to authenticated, service_role;

create temp table t_f (id uuid);
with f as (insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Test', 'A', 'B', now() + interval '1 day', 'test', 'cp1') returning id)
insert into t_f select id from f;
grant select on t_f to authenticated, service_role;

create or replace function pg_temp.as_user(p_n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = p_n), 'role', 'authenticated')::text, true);
end $$;

do $$
declare v_msg text; v_n int;
begin
  set local role authenticated;

  -- 1. unconfirmed email: refused
  perform pg_temp.as_user(1);
  begin perform public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null); exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'email_not_confirmed' then raise exception 'ASSERT FAILED: unconfirmed member could post (%)', v_msg; end if;

  -- 2. confirmed email: allowed
  perform pg_temp.as_user(2);
  perform public.create_prediction((select id from t_f), '1X2', 'away', null, 3.00, 3, null);
  reset role;
  select count(*) into v_n from public.predictions where user_id = (select id from t_u where n = 2);
  if v_n <> 1 then raise exception 'ASSERT FAILED: confirmed member could not post'; end if;
  select count(*) into v_n from public.predictions where user_id = (select id from t_u where n = 1);
  if v_n <> 0 then raise exception 'ASSERT FAILED: an unconfirmed member has a pick'; end if;
end $$;

-- 3. once the email is confirmed the same member can post
do $$
declare v_n int;
begin
  update auth.users set email_confirmed_at = now() where id = (select id from t_u where n = 1);
  set local role authenticated;
  perform pg_temp.as_user(1);
  perform public.create_prediction((select id from t_f), '1X2', 'home', null, 2.10, 3, null);
  reset role;
  select count(*) into v_n from public.predictions where user_id = (select id from t_u where n = 1);
  if v_n <> 1 then raise exception 'ASSERT FAILED: member could not post after confirming'; end if;
end $$;

-- 4. clients cannot call can_post
do $$
declare v_msg text;
begin
  set local role authenticated;
  begin perform public.can_post((select id from t_u where n = 1)); exception when insufficient_privilege then v_msg := 'blocked'; end;
  reset role;
  if v_msg is distinct from 'blocked' then raise exception 'ASSERT FAILED: authenticated could call can_post'; end if;
end $$;

select 'confirmed_email_to_post: all assertions passed' as result;
rollback;
