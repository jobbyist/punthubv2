-- Plain SQL assertions for supabase/migrations/20261030110000_launch_notify.sql (and ..110500). One transaction,
-- rolled back. Failures start with "ASSERT FAILED". Uses only invalid-domain emails.
begin;

-- Real early-access rows may exist on the live project; this removes them for the test only (rolled back).
delete from public.early_access;

-- Fill 98 of the 100 numbers with ordinary members so only 2 are left.
create temp table t_fill (n int, id uuid);
insert into t_fill select n, gen_random_uuid() from generate_series(1, 98) n;
insert into auth.users (id, email) select id, 'fill' || n || '@example.invalid' from t_fill;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'fill_' || n, 'Fill ' || n, true, 1990, now() from t_fill;

-- Two early-access people hold the last two spots.
insert into public.early_access (email, name, plan, founding_reserved, marketing_consent)
values ('early1@example.invalid', 'Early One', 'free', true, true),
       ('early2@example.invalid', 'Early Two', 'free', true, false);

do $$
begin
  if public.founding_spots_taken() <> 100 then
    raise exception 'ASSERT FAILED: 98 members + 2 held spots should read 100 taken, got %', public.founding_spots_taken();
  end if;
end $$;

-- 1. A stranger who signs up now gets no number: the last two are held.
create temp table t_x (id uuid);
insert into t_x values (gen_random_uuid());
insert into auth.users (id, email) select id, 'stranger@example.invalid' from t_x;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'stranger', 'Stranger', true, 1990, now() from t_x;
do $$
begin
  if (select founding_number from public.profiles where username = 'stranger') is not null then
    raise exception 'ASSERT FAILED: a stranger took a held Founding spot';
  end if;
end $$;

-- 2. The early-access person signs up (email in a different case) and gets the lowest free number.
create temp table t_e (id uuid);
insert into t_e values (gen_random_uuid());
insert into auth.users (id, email) select id, 'Early1@Example.invalid' from t_e;
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
select id, 'early_one', 'Early One', true, 1990, now() from t_e;
do $$
begin
  if (select founding_number from public.profiles where username = 'early_one') is distinct from 99 then
    raise exception 'ASSERT FAILED: reserved member did not get number 99, got %',
      (select founding_number from public.profiles where username = 'early_one');
  end if;
  if public.founding_spots_held() <> 1 then
    raise exception 'ASSERT FAILED: one spot should still be held, got %', public.founding_spots_held();
  end if;
end $$;

-- 3. launch_recipients: wave 1 is everyone not yet signed up; waves 2 and 3 need marketing consent;
--    unsubscribes and logged sends are skipped; a failed send waits an hour.
do $$
declare v_n int;
begin
  select count(*) into v_n from public.launch_recipients(1);
  if v_n <> 1 then raise exception 'ASSERT FAILED: wave 1 should have 1 recipient (early2), got %', v_n; end if;
  select count(*) into v_n from public.launch_recipients(2);
  if v_n <> 0 then raise exception 'ASSERT FAILED: wave 2 needs marketing consent, got %', v_n; end if;

  insert into public.launch_email_sends (email, wave, status, detail) values ('early2@example.invalid', 1, 'failed', '500 x');
  select count(*) into v_n from public.launch_recipients(1);
  if v_n <> 0 then raise exception 'ASSERT FAILED: a fresh failure was retried straight away'; end if;
  update public.launch_email_sends set sent_at = now() - interval '2 hours' where email = 'early2@example.invalid';
  select count(*) into v_n from public.launch_recipients(1);
  if v_n <> 1 then raise exception 'ASSERT FAILED: an hour-old failure was not retried'; end if;
  update public.launch_email_sends set status = 'sent' where email = 'early2@example.invalid';
  select count(*) into v_n from public.launch_recipients(1);
  if v_n <> 0 then raise exception 'ASSERT FAILED: a sent email was sent again'; end if;

  delete from public.launch_email_sends;
  insert into public.waitlist_unsubscribes (email) values ('early2@example.invalid');
  select count(*) into v_n from public.launch_recipients(1);
  if v_n <> 0 then raise exception 'ASSERT FAILED: an unsubscribed person was emailed'; end if;
end $$;

-- 4. Admin notifications: only admins read or finish them; clients cannot insert.
insert into public.admin_notifications (kind, dedupe_key, title, body) values ('t', 'k1', 'T', 'B');
do $$
declare v_n int; v_admin uuid := (select id from t_fill where n = 1);
begin
  update public.profiles set role = 'admin' where id = v_admin;
  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_fill where n = 2), 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.admin_notifications;
  if v_n <> 0 then raise exception 'ASSERT FAILED: a member can read admin notifications'; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_n from public.admin_notifications;
  if v_n <> 1 then raise exception 'ASSERT FAILED: admin cannot read notifications'; end if;
  update public.admin_notifications set done_at = now(), done_by = v_admin;
  begin
    insert into public.admin_notifications (kind, dedupe_key, title, body) values ('t', 'k2', 'T', 'B');
    raise exception 'ASSERT FAILED: a client inserted a notification';
  exception when insufficient_privilege then null;
  end;
  select count(*) into v_n from public.launch_audience();
  if v_n <> 2 then raise exception 'ASSERT FAILED: launch_audience should list 2 people, got %', v_n; end if;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', (select id from t_fill where n = 2), 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform * from public.launch_audience();
    raise exception 'ASSERT FAILED: a member listed the audience';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

select 'launch_notify: all assertions passed' as result;
rollback;
