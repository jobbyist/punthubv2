-- AI community participants are first-class, explicitly labelled members.
-- Existing genuine members and held reservations retain their founding numbers.
alter table public.profiles
  add column if not exists is_ai_participant boolean not null default false,
  add column if not exists ai_persona_key text;

alter table public.profiles alter column popia_consent_at drop not null;
alter table public.profiles drop constraint if exists profiles_must_be_18;
alter table public.profiles add constraint profiles_must_be_18
  check (is_ai_participant or is_18_attested);
alter table public.profiles add constraint profiles_popia_consent_required
  check (is_ai_participant or popia_consent_at is not null);
alter table public.profiles add constraint profiles_ai_persona_consistency
  check (
    (is_ai_participant and ai_persona_key is not null)
    or (not is_ai_participant and ai_persona_key is null)
  );
create unique index if not exists profiles_ai_persona_key
  on public.profiles (ai_persona_key) where ai_persona_key is not null;

alter table public.synthetic_personas
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;
create unique index if not exists synthetic_personas_profile_id_key
  on public.synthetic_personas(profile_id) where profile_id is not null;

create or replace view public.public_profiles as
  select id,
    username::text as username,
    display_name,
    founding_number,
    created_at,
    avatar_url,
    is_ai_participant
  from public.profiles
  where not is_banned;

-- Only the service-role provisioning workflow can create AI profiles. The normal founding-number
-- trigger assigns the next number under its existing advisory lock, preserving the single numbered list.
create or replace function public.provision_ai_community_member(
  p_persona_key text,
  p_user_id uuid,
  p_username text,
  p_display_name text
) returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_persona public.synthetic_personas%rowtype;
  v_user auth.users%rowtype;
  v_number integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_persona_key !~ '^puntr-synth-[0-9]{2}$'
     or p_username !~ '^[a-z0-9_]{3,20}$'
     or length(btrim(coalesce(p_display_name, ''))) not between 1 and 40 then
    raise exception 'invalid_ai_member_profile' using errcode = '22023';
  end if;

  select * into v_persona
  from public.synthetic_personas
  where persona_key = p_persona_key and active = true
  for update;
  if not found then
    raise exception 'active_persona_not_found' using errcode = 'P0002';
  end if;

  select * into v_user from auth.users where id = p_user_id;
  if not found
     or v_user.email is null
     or lower(v_user.email) <> lower(p_persona_key || '@ai.puntr.invalid')
     or coalesce(v_user.raw_user_meta_data ->> 'is_ai_participant', 'false') <> 'true'
     or coalesce(v_user.email_confirmed_at is not null, false) = false then
    raise exception 'synthetic_auth_identity_not_verified' using errcode = '42501';
  end if;

  select founding_number into v_number
  from public.profiles where id = p_user_id;
  if found then
    if not exists (
      select 1 from public.profiles
      where id = p_user_id and is_ai_participant and ai_persona_key = p_persona_key
    ) then
      raise exception 'profile_exists_with_different_identity' using errcode = '23505';
    end if;
    update public.synthetic_personas set profile_id = p_user_id where id = v_persona.id;
    return v_number;
  end if;

  if v_persona.profile_id is not null and v_persona.profile_id <> p_user_id then
    raise exception 'persona_already_linked' using errcode = '23505';
  end if;

  insert into public.profiles (
    id, username, display_name, is_18_attested, birth_year, popia_consent_at,
    marketing_opt_in, language, is_ai_participant, ai_persona_key
  ) values (
    p_user_id, lower(p_username), btrim(p_display_name), false, null, null,
    false, 'en-ZA', true, p_persona_key
  )
  returning founding_number into v_number;

  update public.synthetic_personas
  set profile_id = p_user_id,
      persona = jsonb_set(
        jsonb_set(persona, '{account_mode}', '"ai_member"'::jsonb, true),
        '{notes}',
        '"AI community participant. Public profile is labelled AI. Synthetic activity must be excluded from genuine-user PFIE training and acquisition metrics."'::jsonb,
        true
      )
  where id = v_persona.id;

  return v_number;
end;
$$;

revoke all on function public.provision_ai_community_member(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_ai_community_member(text, uuid, text, text) to service_role;

-- Avoid sending fifty synthetic signup notifications to the human support inbox.
create or replace function public.enqueue_support_signup_notification()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if coalesce(new.raw_user_meta_data ->> 'is_ai_participant', 'false') = 'true' then
    return new;
  end if;

  insert into public.email_outbox (
    user_id, to_email, kind, subject, body, priority, event_key
  )
  values (
    null,
    'support@puntr.co.za',
    'service',
    'New Puntr signup',
    'A new user registered with Puntr South Africa.' || E'\n\n' ||
    'Email: ' || coalesce(new.email, '(not provided)') || E'\n' ||
    'Account ID: ' || new.id::text || E'\n' ||
    'Registered: ' || to_char(new.created_at at time zone 'Africa/Johannesburg', 'YYYY-MM-DD HH24:MI:SS') || ' SAST' ||
    E'\n\n' || 'Open Admin > Users to review the account details.',
    1,
    'signup:' || new.id::text
  )
  on conflict (event_key) where event_key is not null do nothing;

  return new;
exception when others then
  raise warning 'Could not queue Puntr signup notification for auth user %: %', new.id, sqlerrm;
  return new;
end;
$function$;
