-- Assign new members a unique Puntr-style handle when signup leaves username blank.
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
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_email text;
  v_meta jsonb;
  v_name text;
  v_local text;
  v_parts text[];
  v_first text;
  v_last_initial text;
  v_attempt integer;
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

  if v_username = '' then
    select email, raw_user_meta_data
      into v_email, v_meta
      from auth.users
      where id = v_uid;

    v_name := nullif(btrim(coalesce(v_meta->>'full_name', v_meta->>'name', '')), '');
    if v_name is not null then
      v_parts := regexp_split_to_array(
        regexp_replace(lower(v_name), '[^a-z0-9 ]+', ' ', 'g'),
        '\s+'
      );
    else
      v_local := lower(split_part(coalesce(v_email, ''), '@', 1));
      v_local := split_part(v_local, '+', 1);
      v_local := regexp_replace(v_local, '[^a-z0-9._-]', '', 'g');
      v_parts := regexp_split_to_array(v_local, '[._-]+');
    end if;

    v_first := left(regexp_replace(coalesce(v_parts[1], ''), '[0-9]+$', '', 'g'), 12);
    if v_first = '' then v_first := 'puntr'; end if;
    v_last_initial := 'x';
    if coalesce(array_length(v_parts, 1), 0) >= 2 then
      v_last_initial := left(regexp_replace(v_parts[array_length(v_parts, 1)], '[^a-z0-9]', '', 'g'), 1);
      if v_last_initial = '' then v_last_initial := 'x'; end if;
    end if;

    for v_attempt in 1..100 loop
      v_username := v_first || '_' || v_last_initial || lpad(floor(random() * 100)::integer::text, 2, '0');
      exit when not exists (
        select 1 from public.profiles where username = v_username::citext
      );
    end loop;
    if exists (select 1 from public.profiles where username = v_username::citext) then
      raise exception 'username_taken' using errcode = 'unique_violation';
    end if;
  elsif v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = 'check_violation';
  elsif exists (select 1 from public.profiles where username = v_username::citext) then
    raise exception 'username_taken' using errcode = 'unique_violation';
  end if;

  if p_birth_year is null
     or p_birth_year < 1900
     or p_birth_year > extract(year from now())::integer - 18 then
    raise exception 'under_18' using errcode = 'check_violation';
  end if;
  if p_language is null or p_language not in ('en-ZA', 'af', 'zu', 'xh') then
    raise exception 'invalid_language' using errcode = 'check_violation';
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
$function$;

create or replace function public.update_my_username(p_username text)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_username text := lower(btrim(coalesce(p_username, '')));
  v_old_username text;
  v_old_display_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid_username' using errcode = 'check_violation';
  end if;

  select username::text, display_name
    into v_old_username, v_old_display_name
    from public.profiles
    where id = v_uid
      and coalesce(is_ai_participant, false) = false
      and coalesce(is_banned, false) = false;
  if not found then
    raise exception 'not_editable' using errcode = 'P0001';
  end if;
  if v_old_username = v_username then
    return v_username;
  end if;
  if exists (
    select 1 from public.profiles
    where username = v_username::citext and id <> v_uid
  ) then
    raise exception 'username_taken' using errcode = 'unique_violation';
  end if;

  update public.profiles
    set username = v_username::citext,
        display_name = case when display_name = v_old_username then v_username else display_name end
    where id = v_uid
      and coalesce(is_ai_participant, false) = false;

  return v_username;
exception
  when unique_violation then
    raise exception 'username_taken' using errcode = 'unique_violation';
end;
$function$;

revoke all on function public.update_my_username(text) from public;
grant execute on function public.update_my_username(text) to authenticated;
