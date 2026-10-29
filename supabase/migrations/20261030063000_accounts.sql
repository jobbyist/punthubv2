-- P6: accounts. Profile creation and its consent evidence happen in one transaction, so a Founding number is
-- only ever shown for an account whose consent rows exist. An under-18 attempt raises before anything is
-- written (the caller then deletes the bare auth user, which is the only place the email lives).

-- ---------------------------------------------------------------------------
-- username_available: live check on the onboarding screen. Usernames are public, so this leaks nothing new.
-- ---------------------------------------------------------------------------
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
  select p_username is not null
     and lower(p_username) ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(p_username)::citext);
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- complete_signup: creates the caller's profile and consent rows. Returns the founding number
-- (null once all 100 are taken). Errors: not_authenticated, already_has_profile, invalid_username,
-- username_taken, under_18, invalid_language.
-- ---------------------------------------------------------------------------
create or replace function public.complete_signup(
  p_username text,
  p_birth_year integer,
  p_language text,
  p_marketing_email boolean,
  p_marketing_whatsapp boolean,
  p_ref text
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_referrer uuid;
  v_terms text;
  v_privacy text;
  v_marketing text;
  v_founding integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_has_profile' using errcode = 'P0001';
  end if;
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = 'check_violation';
  end if;
  if p_birth_year is null
     or p_birth_year < 1900
     or p_birth_year > extract(year from now())::integer - 18 then
    raise exception 'under_18' using errcode = 'check_violation';
  end if;
  if p_language is null or p_language not in ('en-ZA', 'af', 'zu', 'xh') then
    raise exception 'invalid_language' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles where username = v_username::citext) then
    raise exception 'username_taken' using errcode = 'unique_violation';
  end if;

  if p_ref is not null and btrim(p_ref) <> '' then
    select id into v_referrer from public.profiles where referral_code = btrim(p_ref);
  end if;

  select version into v_terms from public.notice_versions where kind = 'terms' order by effective_at desc limit 1;
  select version into v_privacy from public.notice_versions where kind = 'privacy' order by effective_at desc limit 1;
  select version into v_marketing from public.notice_versions where kind = 'marketing' order by effective_at desc limit 1;

  insert into public.profiles (
    id, username, display_name, is_18_attested, birth_year, popia_consent_at,
    marketing_opt_in, referred_by, language
  ) values (
    v_uid, v_username, v_username, true, p_birth_year, now(),
    coalesce(p_marketing_email, false), v_referrer, p_language
  )
  returning founding_number into v_founding;

  insert into public.consent_records (user_id, purpose, granted, notice_version, source) values
    (v_uid, 'terms', true, v_terms, 'join'),
    (v_uid, 'privacy_notice', true, v_privacy, 'join'),
    (v_uid, 'marketing_email', coalesce(p_marketing_email, false), v_marketing, 'join'),
    (v_uid, 'marketing_whatsapp', coalesce(p_marketing_whatsapp, false), v_marketing, 'join');

  return v_founding;
end;
$$;

revoke execute on function public.complete_signup(text, integer, text, boolean, boolean, text) from public, anon;
grant execute on function public.complete_signup(text, integer, text, boolean, boolean, text) to authenticated, service_role;
