-- Plain SQL assertions for supabase/migrations/20261030063000_accounts.sql.
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

create temp table t_u (n int, id uuid);
insert into t_u select n, gen_random_uuid() from generate_series(1, 4) n;
insert into auth.users (id, email) select id, 'acc' || n || '@example.invalid' from t_u;
grant select on t_u to authenticated, anon, service_role;

create or replace function pg_temp.as_user(p_n int) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', (select id from t_u where n = p_n), 'role', 'authenticated')::text, true);
end $$;

set local role authenticated;

-- 1. Happy path: profile, four consent rows, a founding number, language stored.
do $$
declare
  v_founding integer;
  v_consents integer;
  v_lang text;
begin
  perform pg_temp.as_user(1);
  v_founding := public.complete_signup('Tip_One', 1990, 'en-ZA', true, false, null);
  if v_founding is null or v_founding < 1 then
    raise exception 'ASSERT FAILED: no founding number returned';
  end if;
  select count(*) into v_consents from public.consent_records where user_id = auth.uid() and source = 'join';
  if v_consents <> 4 then
    raise exception 'ASSERT FAILED: expected 4 consent rows, got %', v_consents;
  end if;
  if not (select granted from public.consent_records where user_id = auth.uid() and purpose = 'marketing_email') then
    raise exception 'ASSERT FAILED: marketing_email should be granted';
  end if;
  if (select granted from public.consent_records where user_id = auth.uid() and purpose = 'marketing_whatsapp') then
    raise exception 'ASSERT FAILED: marketing_whatsapp should default to not granted';
  end if;
  select language into v_lang from public.profiles where id = auth.uid();
  if v_lang <> 'en-ZA' then raise exception 'ASSERT FAILED: language not stored'; end if;
  if (select username::text from public.profiles where id = auth.uid()) <> 'tip_one' then
    raise exception 'ASSERT FAILED: username should be lower-cased';
  end if;
end $$;

-- 2. A second call for the same user is refused.
do $$
declare v_msg text;
begin
  perform pg_temp.as_user(1);
  begin
    perform public.complete_signup('tip_two', 1990, 'en-ZA', false, false, null);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'already_has_profile' then
    raise exception 'ASSERT FAILED: second signup for the same user was not refused (%)', v_msg;
  end if;
end $$;

-- 3. Under 18 stores nothing: no profile, no consent rows.
do $$
declare v_msg text; v_profiles int; v_consents int;
begin
  perform pg_temp.as_user(2);
  begin
    perform public.complete_signup('young_one', extract(year from now())::int - 10, 'en-ZA', true, true, null);
  exception when others then v_msg := sqlerrm;
  end;
  if v_msg is distinct from 'under_18' then
    raise exception 'ASSERT FAILED: under-18 birth year was not refused (%)', v_msg;
  end if;
  select count(*) into v_profiles from public.profiles where id = auth.uid();
  select count(*) into v_consents from public.consent_records where user_id = auth.uid();
  if v_profiles <> 0 or v_consents <> 0 then
    raise exception 'ASSERT FAILED: under-18 attempt stored data (% profiles, % consents)', v_profiles, v_consents;
  end if;
  -- the exact 18th-birthday year boundary is allowed
  perform public.complete_signup('boundary_one', extract(year from now())::int - 18, 'en-ZA', false, false, null);
end $$;

-- 4. Username rules and availability.
do $$
declare v_msg text;
begin
  perform pg_temp.as_user(3);
  begin perform public.complete_signup('TIP_ONE', 1990, 'en-ZA', false, false, null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'username_taken' then
    raise exception 'ASSERT FAILED: duplicate username (different case) was accepted (%)', v_msg;
  end if;
  v_msg := null;
  begin perform public.complete_signup('a b', 1990, 'en-ZA', false, false, null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'invalid_username' then
    raise exception 'ASSERT FAILED: invalid username accepted (%)', v_msg;
  end if;
  v_msg := null;
  begin perform public.complete_signup('good_name', 1990, 'fr', false, false, null);
  exception when others then v_msg := sqlerrm; end;
  if v_msg is distinct from 'invalid_language' then
    raise exception 'ASSERT FAILED: invalid language accepted (%)', v_msg;
  end if;
  if public.username_available('tip_one') then raise exception 'ASSERT FAILED: taken name reported free'; end if;
  if not public.username_available('free_name') then raise exception 'ASSERT FAILED: free name reported taken'; end if;
  if public.username_available('x') then raise exception 'ASSERT FAILED: too-short name reported free'; end if;
end $$;

-- 5. Referral code attaches referred_by; an unknown code is ignored.
do $$
declare v_code text; v_ref uuid; v_by uuid;
begin
  perform pg_temp.as_user(1);
  select referral_code into v_code from public.profiles where id = auth.uid();
  v_ref := auth.uid();
  perform pg_temp.as_user(3);
  perform public.complete_signup('referred_one', 1990, 'en-ZA', false, false, v_code);
  select referred_by into v_by from public.profiles where id = auth.uid();
  if v_by is distinct from v_ref then raise exception 'ASSERT FAILED: referred_by not attached'; end if;
  perform pg_temp.as_user(4);
  perform public.complete_signup('unreferred_one', 1990, 'en-ZA', false, false, 'nonexistent');
  if (select referred_by from public.profiles where id = auth.uid()) is not null then
    raise exception 'ASSERT FAILED: unknown referral code attached a referrer';
  end if;
end $$;

-- 6. Anonymous callers cannot sign up.
reset role;
set local role anon;
do $$
declare v_msg text;
begin
  begin perform public.complete_signup('anon_one', 1990, 'en-ZA', false, false, null);
  exception when insufficient_privilege then v_msg := 'blocked'; end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: anon could call complete_signup';
  end if;
end $$;
reset role;

rollback;
