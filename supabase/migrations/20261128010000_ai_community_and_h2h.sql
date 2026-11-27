-- Public, moderated community threads with explicitly labelled AI participants.
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  parent_id uuid references public.community_posts(id) on delete cascade,
  title text,
  body text not null,
  category text not null default 'matchday_chat'
    check (category in ('matchday_chat', 'south_african_football', 'tactics', 'puntr_feedback')),
  status text not null default 'published'
    check (status in ('published', 'hidden', 'removed')),
  is_ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_post_title_length check (title is null or char_length(title) between 10 and 120),
  constraint community_post_body_length check (char_length(body) between 5 and 1000),
  constraint community_post_thread_reply_shape check (
    (parent_id is null and title is not null)
    or (parent_id is not null and title is null)
  )
);

create index if not exists community_posts_feed_idx
  on public.community_posts (parent_id, status, created_at desc);
create index if not exists community_posts_author_idx
  on public.community_posts (author_id, created_at desc);

create or replace function public.community_can_post()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and not p.is_ai_participant
      and public.member_can_transact(p) is null
  );
$function$;

revoke all on function public.community_can_post() from public, anon;
grant execute on function public.community_can_post() to authenticated;

create or replace function public.community_posts_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_is_ai boolean;
  v_parent public.community_posts;
begin
  select p.is_ai_participant into v_is_ai
  from public.profiles p
  where p.id = new.author_id;
  if not found then raise exception 'community_author_not_found' using errcode = '23503'; end if;
  if new.is_ai_generated is distinct from coalesce(v_is_ai, false) then
    raise exception 'community_ai_label_mismatch' using errcode = '23514';
  end if;
  if new.parent_id is null then
    if char_length(coalesce(new.title, '')) not between 10 and 120
       or char_length(new.body) < 30 then
      raise exception 'community_thread_too_short' using errcode = '23514';
    end if;
  else
    select * into v_parent from public.community_posts where id = new.parent_id;
    if not found or v_parent.parent_id is not null or v_parent.status <> 'published' then
      raise exception 'community_reply_target_unavailable' using errcode = '23514';
    end if;
    if new.title is not null then
      raise exception 'community_reply_title_not_allowed' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end;
$function$;

drop trigger if exists community_posts_guard on public.community_posts;
create trigger community_posts_guard
  before insert or update on public.community_posts
  for each row execute function public.community_posts_guard();

alter table public.community_posts enable row level security;
revoke all on public.community_posts from anon, authenticated;
grant select on public.community_posts to anon, authenticated;
grant insert on public.community_posts to authenticated;
grant all on public.community_posts to service_role;

drop policy if exists community_posts_public_read on public.community_posts;
create policy community_posts_public_read
  on public.community_posts for select to anon, authenticated
  using (status = 'published');

drop policy if exists community_posts_member_insert on public.community_posts;
create policy community_posts_member_insert
  on public.community_posts for insert to authenticated
  with check (
    author_id = auth.uid()
    and is_ai_generated = false
    and public.community_can_post()
    and (
      parent_id is null
      or exists (
        select 1 from public.community_posts parent
        where parent.id = community_posts.parent_id
          and parent.parent_id is null
          and parent.status = 'published'
      )
    )
  );

create table if not exists public.ai_community_runs (
  activity_date date primary key,
  status text not null default 'started'
    check (status in ('started', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  posts_created integer not null default 0,
  replies_created integer not null default 0,
  duels_created integer not null default 0,
  error text,
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_community_activity (
  id uuid primary key default gen_random_uuid(),
  persona_key text not null,
  activity_date date not null,
  activity_type text not null
    check (activity_type in ('thread', 'reply', 'duel')),
  post_id uuid references public.community_posts(id) on delete set null,
  target_post_id uuid references public.community_posts(id) on delete set null,
  duel_id uuid references public.duels(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (persona_key, activity_date, activity_type)
);

create index if not exists ai_community_activity_recent_idx
  on public.ai_community_activity (activity_date desc, created_at desc);

create table if not exists public.ai_duel_challenges (
  persona_key text not null,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  duel_id uuid not null unique references public.duels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (persona_key, fixture_id)
);

alter table public.ai_community_runs enable row level security;
alter table public.ai_community_activity enable row level security;
alter table public.ai_duel_challenges enable row level security;
revoke all on public.ai_community_runs, public.ai_community_activity, public.ai_duel_challenges from anon, authenticated;
grant all on public.ai_community_runs, public.ai_community_activity, public.ai_duel_challenges to service_role;

-- Reclassify the 50 seeded research personas as labelled AI community participants.
update public.synthetic_personas
set persona = persona || jsonb_build_object(
  'account_mode', 'ai_community_member',
  'notes', 'AI community participant. Public profile and community activity are labelled AI participant. May create discussions, reply to human members and enter zero-stake H2H duels. Excluded from genuine-member acquisition metrics and PFIE human-learning metrics. Never places bets or receives rewards.',
  'persona_label', 'Puntr AI Member ' || right(persona_key, 2)
)
where persona_key like 'puntr-synth-%';

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

-- Create an open, zero-stake AI challenge from the service-role community runner.
create or replace function public.create_ai_open_duel(
  p_persona_key text,
  p_fixture_id uuid,
  p_picks jsonb,
  p_message text default 'AI participant challenge · free-to-play'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $function$
declare
  v_profile_id uuid;
  v_is_ai boolean;
  v_fixture public.fixtures;
  v_markets text[];
  v_duel_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if p_persona_key is null or p_fixture_id is null then
    raise exception 'invalid_ai_duel_input' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(7003001, hashtext(p_persona_key || ':' || p_fixture_id::text));

  select sp.profile_id into v_profile_id
  from public.synthetic_personas sp
  where sp.persona_key = p_persona_key and sp.active and sp.profile_id is not null;
  if v_profile_id is null then raise exception 'ai_persona_not_provisioned' using errcode = 'P0001'; end if;

  select p.is_ai_participant into v_is_ai
  from public.profiles p where p.id = v_profile_id;
  if v_is_ai is distinct from true then raise exception 'ai_profile_required' using errcode = 'P0001'; end if;

  select * into v_fixture from public.fixtures where id = p_fixture_id for share;
  if not found or v_fixture.sport <> 'soccer' or v_fixture.status <> 'scheduled' or v_fixture.kickoff_at <= now() then
    raise exception 'fixture_not_eligible' using errcode = 'P0001';
  end if;

  v_markets := public.duel_check_picks(p_picks);

  select challenge.duel_id into v_duel_id
  from public.ai_duel_challenges challenge
  where challenge.persona_key = p_persona_key and challenge.fixture_id = p_fixture_id;
  if v_duel_id is not null then return v_duel_id; end if;

  insert into public.duels (fixture_id, challenger, opponent, stake, markets, message, status)
  values (
    p_fixture_id,
    v_profile_id,
    null,
    0,
    v_markets,
    left(coalesce(p_message, 'AI participant challenge · free-to-play'), 140),
    'pending'
  )
  returning id into v_duel_id;

  insert into public.duel_picks (duel_id, user_id, market, selection)
  select v_duel_id, v_profile_id, item->>'market', item->>'selection'
  from jsonb_array_elements(p_picks) item;

  insert into public.ai_duel_challenges (persona_key, fixture_id, duel_id)
  values (p_persona_key, p_fixture_id, v_duel_id);

  return v_duel_id;
end;
$function$;

revoke all on function public.create_ai_open_duel(text, uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_ai_open_duel(text, uuid, jsonb, text) to service_role;

-- Extend existing public H2H payloads with explicit AI-participant disclosure.
create or replace function public.duel_detail(p_duel uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select jsonb_build_object(
    'id', d.id, 'status', d.status, 'stake', d.stake, 'markets', d.markets, 'message', d.message,
    'created_at', d.created_at, 'accepted_at', d.accepted_at, 'settled_at', d.settled_at,
    'challenger_correct', d.challenger_correct, 'opponent_correct', d.opponent_correct,
    'winner', w.username,
    'challenger', jsonb_build_object('username', c.username, 'founding_number', c.founding_number, 'avatar_url', c.avatar_url,
      'is_ai_participant', c.is_ai_participant),
    'opponent', case when o.id is null then null else
      jsonb_build_object('username', o.username, 'founding_number', o.founding_number, 'avatar_url', o.avatar_url,
        'is_ai_participant', o.is_ai_participant) end,
    'fixture', jsonb_build_object('id', f.id, 'sport', f.sport, 'competition', f.competition, 'home', f.home,
      'away', f.away, 'kickoff_at', f.kickoff_at, 'status', f.status, 'home_score', f.home_score, 'away_score', f.away_score),
    'revealed', f.kickoff_at <= now(),
    'me', case when auth.uid() = d.challenger then 'challenger' when auth.uid() = d.opponent then 'opponent' else null end,
    'picks', coalesce((select jsonb_agg(jsonb_build_object(
        'side', case when p.user_id = d.challenger then 'challenger' else 'opponent' end,
        'market', p.market, 'selection', p.selection, 'correct', p.correct) order by p.market)
      from public.duel_picks p
      where p.duel_id = d.id and (f.kickoff_at <= now() or p.user_id = auth.uid())), '[]'::jsonb),
    'votes', public.duel_vote_totals(d.id))
  from public.duels d
  join public.fixtures f on f.id = d.fixture_id
  join public.profiles c on c.id = d.challenger
  left join public.profiles o on o.id = d.opponent
  left join public.profiles w on w.id = d.winner
  where d.id = p_duel;
$function$;

create or replace function public.duels_feed(p_scope text, p_fixture uuid default null, p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce(jsonb_agg(row order by sort_at desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', d.id, 'status', d.status, 'stake', d.stake, 'markets', d.markets,
      'challenger', c.username, 'opponent', o.username, 'winner', w.username,
      'challenger_is_ai', c.is_ai_participant,
      'opponent_is_ai', coalesce(o.is_ai_participant, false),
      'challenger_correct', d.challenger_correct, 'opponent_correct', d.opponent_correct,
      'fixture', jsonb_build_object('id', f.id, 'sport', f.sport, 'competition', f.competition, 'home', f.home,
        'away', f.away, 'kickoff_at', f.kickoff_at, 'status', f.status, 'home_score', f.home_score,
        'away_score', f.away_score),
      'votes', public.duel_vote_totals(d.id),
      'created_at', d.created_at) as row,
      coalesce(d.settled_at, d.accepted_at, d.created_at) as sort_at
    from public.duels d
    join public.fixtures f on f.id = d.fixture_id
    join public.profiles c on c.id = d.challenger
    left join public.profiles o on o.id = d.opponent
    left join public.profiles w on w.id = d.winner
    where (p_fixture is null or d.fixture_id = p_fixture)
      and case p_scope
        when 'open' then d.status = 'pending' and d.opponent is null and f.kickoff_at > now()
        when 'live' then d.status = 'active'
        when 'settled' then d.status in ('settled', 'void')
        when 'mine' then auth.uid() is not null and auth.uid() in (d.challenger, d.opponent)
        else false end
    order by coalesce(d.settled_at, d.accepted_at, d.created_at) desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ) x;
$function$;

drop function if exists public.duel_leaderboard(integer, integer);
create function public.duel_leaderboard(p_days integer default null, p_limit integer default 50)
returns table(
  username text,
  founding_number integer,
  is_ai_participant boolean,
  played integer,
  wins integer,
  draws integer,
  losses integer,
  xp integer,
  points_won integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with rows as (
    select d.id, d.stake, d.winner, unnest(array[d.challenger, d.opponent]) as player
    from public.duels d
    where d.status = 'settled' and (p_days is null or d.settled_at > now() - make_interval(days => p_days))
  )
  select p.username::text, p.founding_number, p.is_ai_participant,
         count(*)::integer,
         count(*) filter (where r.winner = r.player)::integer,
         count(*) filter (where r.winner is null)::integer,
         count(*) filter (where r.winner is not null and r.winner <> r.player)::integer,
         (3 * count(*) filter (where r.winner = r.player) + count(*) filter (where r.winner is null))::integer,
         coalesce(sum(r.stake) filter (where r.winner = r.player), 0)::integer
  from rows r join public.profiles p on p.id = r.player
  where p.username::text not like 'deleted-%'
  group by p.id, p.username, p.founding_number, p.is_ai_participant
  order by 8 desc, 5 desc, 4 asc, 1
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$function$;

grant execute on function public.duel_leaderboard(integer, integer) to anon, authenticated, service_role;
