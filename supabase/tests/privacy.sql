-- Plain SQL assertions for supabase/migrations/20261029090000_privacy.sql.
-- Run on a scratch or branch database after mvp_core and privacy are applied:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/privacy.sql
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 3) n;
insert into auth.users (id, email) select id, 'p' || n || '@example.invalid' from t_u;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'priv_' || n, 'Priv ' || n, true, 1990, now() from t_u;
grant select on t_u to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 1. Under-18 attempts store nothing
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid := gen_random_uuid();
  v_before integer;
  v_msg text;
begin
  insert into auth.users (id, email) values (v_id, 'minor@example.invalid');
  select count(*) into v_before from public.profiles;

  begin
    insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
    values (v_id, 'minor_one', 'Minor', true, extract(year from now())::int - 10, now());
  exception when check_violation then
    v_msg := 'blocked';
  end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: a profile with a birth year under 18 was stored';
  end if;

  v_msg := null;
  begin
    insert into public.profiles (id, username, display_name, is_18_attested, popia_consent_at)
    values (v_id, 'minor_two', 'Minor', false, now());
  exception when check_violation then
    v_msg := 'blocked';
  end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: a profile with is_18_attested = false was stored';
  end if;

  if (select count(*) from public.profiles) <> v_before then
    raise exception 'ASSERT FAILED: profile count changed after under-18 attempts';
  end if;
  if exists (select 1 from public.profiles where id = v_id) then
    raise exception 'ASSERT FAILED: under-18 profile row exists';
  end if;
end $$;

do $$
declare
  v_uid uuid := (select id from t_u where n = 2);
  v_msg text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.profiles set username = 'deleted-abcdefghij' where id = v_uid;
  exception when check_violation then
    v_msg := 'blocked';
  end;
  reset role;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: a user could take a deleted-* username';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Consent: written by RPC, append-only, latest row wins, anon cannot write
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_msg text;
  v_granted boolean;
  v_role text;
  v_op text;
begin
  select id into v_uid from t_u where n = 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  perform public.record_consent('analytics', true, '2026-10-29', 'account');
  perform public.record_consent('analytics', false, '2026-10-29', 'account');
  perform public.record_consent('marketing_email', true, '2026-10-29', 'join');

  select granted into v_granted from public.current_consents where purpose = 'analytics';
  if v_granted is distinct from false then
    raise exception 'ASSERT FAILED: latest analytics consent should be false, got %', v_granted;
  end if;

  -- invalid purpose is refused
  begin
    perform public.record_consent('sell_my_data', true, '2026-10-29', 'account');
  exception when check_violation then
    v_msg := 'blocked';
  end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: unknown consent purpose was accepted';
  end if;

  -- a client cannot write the table directly
  v_msg := null;
  begin
    insert into public.consent_records (user_id, purpose, granted, notice_version, source)
    values (v_uid, 'analytics', true, 'x', 'account');
  exception when insufficient_privilege then
    v_msg := 'blocked';
  end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: client could insert into consent_records directly';
  end if;
  reset role;

  -- append-only for every role
  foreach v_role in array array['postgres', 'service_role'] loop
    foreach v_op in array array['update', 'delete'] loop
      v_msg := null;
      begin
        if v_role <> 'postgres' then
          execute format('set local role %I', v_role);
        end if;
        if v_op = 'update' then
          update public.consent_records set granted = true;
        else
          delete from public.consent_records;
        end if;
      exception when others then
        v_msg := sqlerrm;
      end;
      reset role;
      if v_msg is null or v_msg not like '%append-only%' then
        raise exception 'ASSERT FAILED: % consent_records as %: %', v_op, v_role, coalesce(v_msg, 'succeeded');
      end if;
    end loop;
  end loop;

  -- anonymous users cannot call record_consent
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  v_msg := null;
  begin
    perform public.record_consent('analytics', true, '2026-10-29', 'banner');
  exception when insufficient_privilege then
    v_msg := 'blocked';
  end;
  reset role;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: anon could call record_consent';
  end if;

  -- another user sees none of user 1's consents
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = 2), 'role', 'authenticated')::text, true);
  set local role authenticated;
  if (select count(*) from public.consent_records) <> 0 then
    raise exception 'ASSERT FAILED: user 2 can read user 1 consents';
  end if;
  reset role;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Privacy requests: anyone can file, 3 per email per day, only admins can read
-- ---------------------------------------------------------------------------
do $$
declare
  v_id uuid;
  v_msg text;
  i integer;
  v_count integer;
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;

  for i in 1..3 loop
    v_id := public.submit_privacy_request('Waitlist.Person@example.invalid', 'access', 'please send my data');
  end loop;

  begin
    perform public.submit_privacy_request('waitlist.person@example.invalid', 'deletion', null);
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'too_many_requests' then
    raise exception 'ASSERT FAILED: 4th request in a day gave "%"', coalesce(v_msg, 'success');
  end if;

  v_msg := null;
  begin
    perform public.submit_privacy_request('not-an-email', 'access', null);
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'invalid_email' then
    raise exception 'ASSERT FAILED: bad email gave "%"', coalesce(v_msg, 'success');
  end if;

  v_msg := null;
  begin
    perform count(*) from public.privacy_requests;
  exception when insufficient_privilege then
    v_msg := 'blocked';
  end;
  reset role;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: anon could read privacy_requests';
  end if;

  select count(*) into v_count from public.privacy_requests where email = 'waitlist.person@example.invalid';
  if v_count <> 3 then
    raise exception 'ASSERT FAILED: expected 3 stored requests, found %', v_count;
  end if;
  if (select due_at - received_at from public.privacy_requests limit 1) <> interval '30 days' then
    raise exception 'ASSERT FAILED: due_at is not received_at + 30 days';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Breach register is admin only
-- ---------------------------------------------------------------------------
do $$
declare
  v_msg text;
  v_n integer;
begin
  insert into public.breach_register (discovered_at, description) values (now(), 'test');

  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_u where n = 1), 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.breach_register;
  if v_n <> 0 then
    raise exception 'ASSERT FAILED: a normal user can read the breach register';
  end if;
  begin
    insert into public.breach_register (discovered_at, description) values (now(), 'sneaky');
  exception when others then
    v_msg := 'blocked';
  end;
  reset role;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: a normal user inserted into the breach register';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Waitlist marketing consent defaults to false
-- ---------------------------------------------------------------------------
do $$
declare
  v boolean;
begin
  insert into public.early_access (email, name, plan) values ('wait@example.invalid', 'Wait', 'Founding Member');
  select marketing_consent into v from public.early_access where email = 'wait@example.invalid';
  if v is distinct from false then
    raise exception 'ASSERT FAILED: marketing_consent default is %', v;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Deleting an account anonymises the profile and the hash chain still verifies
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v_fix uuid;
  v_open_hash text;
  r record;
  v_prev text := repeat('0', 64);
  v_expected text;
  v_rows integer;
  v_msg text;
begin
  select id into v_uid from t_u where n = 3;

  insert into public.fixtures (sport, competition, home, away, kickoff_at, provider, provider_ref)
  values ('soccer', 'Priv League', 'A', 'B', now() + interval '1 day', 'test', 'priv') returning id into v_fix;

  insert into public.early_access (email, name, plan, phone) values ('p3@example.invalid', 'Priv 3', 'Founding Member', '0821234567');

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  perform public.create_prediction(v_fix, '1X2', 'home', null, 2.2, 3, 'keep me');
  perform public.create_prediction(v_fix, 'BTTS', 'yes', null, 1.8, 3, null);
  reset role;

  -- a signed-in client cannot call the anonymiser
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.anonymise_account(v_uid, 'p3@example.invalid');
  exception when insufficient_privilege then
    v_msg := 'blocked';
  end;
  reset role;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: a client could call anonymise_account';
  end if;

  select count(*) into v_rows from public.predictions where user_id = v_uid;

  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
  perform public.anonymise_account(v_uid, 'p3@example.invalid');
  reset role;

  if not exists (select 1 from public.profiles where id = v_uid and username like 'deleted-%'
                 and display_name = 'Deleted user' and birth_year is null and not marketing_opt_in and referral_code is null) then
    raise exception 'ASSERT FAILED: profile was not anonymised';
  end if;
  if exists (select 1 from public.early_access where email = 'p3@example.invalid') then
    raise exception 'ASSERT FAILED: waitlist row (email, phone) still exists';
  end if;

  -- the auth user (which holds the email) can now be deleted without touching the picks
  delete from auth.users where id = v_uid;
  if (select count(*) from public.predictions where user_id = v_uid) <> v_rows then
    raise exception 'ASSERT FAILED: picks changed after the auth user was deleted';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'ASSERT FAILED: profile row vanished with the auth user';
  end if;

  -- no analytics or tracking consent is left behind
  if exists (select 1 from public.current_consents where user_id = v_uid and granted) then
    raise exception 'ASSERT FAILED: a consent is still granted after deletion';
  end if;

  -- recompute the whole chain
  for r in select * from public.predictions order by seq loop
    if r.prev_hash <> v_prev then
      raise exception 'ASSERT FAILED: chain broken at seq %', r.seq;
    end if;
    v_expected := encode(sha256(convert_to(
      r.prev_hash || r.user_id::text || r.fixture_id::text || r.market || r.selection
      || coalesce(r.line::text, '') || r.odds::text
      || to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'), 'UTF8')), 'hex');
    if v_expected <> r.hash then
      raise exception 'ASSERT FAILED: hash mismatch at seq % after account deletion', r.seq;
    end if;
    v_prev := r.hash;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Data export contains the user's own rows only
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
  v jsonb;
begin
  select id into v_uid from t_u where n = 1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  v := public.export_my_data();
  reset role;

  if v #>> '{profile,id}' <> v_uid::text then
    raise exception 'ASSERT FAILED: export profile is not the caller';
  end if;
  if jsonb_array_length(v -> 'consents') <> 3 then
    raise exception 'ASSERT FAILED: expected 3 consent rows in export, got %', jsonb_array_length(v -> 'consents');
  end if;
  if (v -> 'profile') ? 'role' then
    raise exception 'ASSERT FAILED: export leaks role';
  end if;
end $$;

do $$ begin raise notice 'ALL PRIVACY TESTS PASSED'; end $$;

rollback;
