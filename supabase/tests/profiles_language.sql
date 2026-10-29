-- Plain SQL assertions for supabase/migrations/20261030060000_profiles_language.sql.
-- One transaction, rolled back at the end. Failures start with "ASSERT FAILED".

begin;

insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000a1', 'lang@example.invalid');
insert into public.profiles (id, username, display_name, is_18_attested, birth_year, popia_consent_at)
values ('00000000-0000-4000-8000-0000000000a1', 'lang_one', 'Lang One', true, 1990, now());

do $$
declare
  v_lang text;
  v_msg text;
begin
  select language into v_lang from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  if v_lang is distinct from 'en-ZA' then
    raise exception 'ASSERT FAILED: default language should be en-ZA, got %', v_lang;
  end if;

  update public.profiles set language = 'zu' where id = '00000000-0000-4000-8000-0000000000a1';
  select language into v_lang from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';
  if v_lang is distinct from 'zu' then
    raise exception 'ASSERT FAILED: language update did not stick';
  end if;

  begin
    update public.profiles set language = 'fr' where id = '00000000-0000-4000-8000-0000000000a1';
  exception when check_violation then
    v_msg := 'blocked';
  end;
  if v_msg is distinct from 'blocked' then
    raise exception 'ASSERT FAILED: an unknown language code was accepted';
  end if;
end $$;

-- A member can change their own language (it is not a protected column).
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
do $$
declare
  v_lang text;
begin
  update public.profiles set language = 'xh' where id = auth.uid();
  select language into v_lang from public.profiles where id = auth.uid();
  if v_lang is distinct from 'xh' then
    raise exception 'ASSERT FAILED: member could not change their own language';
  end if;
end $$;
reset role;

rollback;
