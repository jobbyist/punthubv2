create or replace function public.provision_ai_community_member(
  p_persona_key text,
  p_user_id uuid,
  p_username text,
  p_display_name text
) returns integer
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $function$
declare
  v_persona public.synthetic_personas%rowtype;
  v_user auth.users%rowtype;
  v_number integer;
  v_next integer;
  v_taken integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_persona_key !~ '^puntr-synth-[0-9][0-9]$'
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
     or coalesce(v_user.raw_app_meta_data ->> 'is_ai_participant', 'false') <> 'true'
     or coalesce(v_user.raw_app_meta_data ->> 'synthetic_persona_key', '') <> p_persona_key
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
    if v_number is null then
      perform pg_advisory_xact_lock(7001001);
      v_next := public.next_founding_number();
      select count(founding_number) into v_taken from public.profiles;
      if v_next > 100 or (100 - v_taken) <= public.founding_spots_held() then
        raise exception 'founding_capacity_full' using errcode = 'P0001';
      end if;
      update public.profiles
      set founding_number = v_next
      where id = p_user_id and founding_number is null
      returning founding_number into v_number;
    end if;
    update public.synthetic_personas
    set profile_id = p_user_id,
        persona = persona || jsonb_build_object(
          'account_mode', 'ai_community_member',
          'notes', 'AI community participant. Public profile is labelled AI participant. May create discussions, reply to human members and participate in zero-stake H2H duels. Excluded from genuine-member acquisition metrics and PFIE human-learning metrics.'
        )
    where id = v_persona.id;
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

  if v_number is null then
    raise exception 'founding_capacity_full' using errcode = 'P0001';
  end if;

  update public.synthetic_personas
  set profile_id = p_user_id,
      persona = persona || jsonb_build_object(
        'account_mode', 'ai_community_member',
        'notes', 'AI community participant. Public profile is labelled AI participant. May create discussions, reply to human members and participate in zero-stake H2H duels. Excluded from genuine-member acquisition metrics and PFIE human-learning metrics.'
      )
  where id = v_persona.id;

  return v_number;
end;
$function$;

revoke all on function public.provision_ai_community_member(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.provision_ai_community_member(text, uuid, text, text) to service_role;
