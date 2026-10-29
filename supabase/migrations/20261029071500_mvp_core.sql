-- Puntr MVP core data model (P3).
-- Keeps public.early_access untouched. RLS is enabled on every table below.
--
-- HASH CHAIN FORMAT (the /verify page must reproduce this exactly)
--   hash = lower-case hex sha256 of the UTF-8 text made by joining these parts with NO separators:
--     prev_hash                  64 hex chars; 64 zeros for the very first prediction
--     user_id::text              lower-case canonical uuid
--     fixture_id::text           lower-case canonical uuid
--     market                     '1X2' | 'OU25' | 'HCP' | 'BTTS' | 'DC'
--     selection                  as stored (lower-case, except DC which is upper-case: '1X','X2','12')
--     coalesce(line::text, '')   line is numeric(5,2), e.g. '-7.50'; empty string when null
--     odds::text                 odds is numeric(6,2), always two decimals, e.g. '2.10'
--     created_at                 UTC, fixed format YYYY-MM-DD"T"HH24:MI:SS.US"Z", e.g. '2026-11-02T09:15:03.123456Z'
--   Chain order is the identity column predictions.seq (ascending). All inserts are serialised by
--   pg_advisory_xact_lock(7001002), so prev_hash is always the previous row's hash.
--
-- APPEND-ONLY NOTE
--   predictions and settlement_events reject UPDATE, DELETE and TRUNCATE for every role (service_role
--   included). Because of that, predictions.user_id uses ON DELETE RESTRICT: erasing a user is done by
--   anonymising the profile (handled in P4), never by deleting the row chain.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only: % is not allowed', tg_table_name, tg_op
    using errcode = 'restrict_violation';
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique
    constraint profiles_username_format check (username::text ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    constraint profiles_display_name_len check (char_length(display_name) between 1 and 40),
  is_18_attested boolean not null
    constraint profiles_must_be_18 check (is_18_attested),
  birth_year integer,
  popia_consent_at timestamptz not null,
  marketing_opt_in boolean not null default false,
  founding_number integer unique
    constraint profiles_founding_range check (founding_number between 1 and 100),
  referral_code text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  referred_by uuid references public.profiles (id),
  role text not null default 'user' check (role in ('user', 'admin')),
  is_banned boolean not null default false,
  posting_paused_until timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_not_self_referred check (referred_by is null or referred_by <> id)
);

create index profiles_referred_by_idx on public.profiles (referred_by);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and not p.is_banned);
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Guard: age check for everyone; clients (anon/authenticated) cannot set privileged columns.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_client boolean := coalesce(auth.role(), '') in ('anon', 'authenticated');
begin
  if new.birth_year is not null
     and new.birth_year > extract(year from now())::integer - 18 then
    raise exception 'birth_year must be at least 18 years ago' using errcode = 'check_violation';
  end if;

  if v_client then
    if tg_op = 'INSERT' then
      new.role := 'user';
      new.founding_number := null;
      new.is_banned := false;
      new.posting_paused_until := null;
    else
      if new.role is distinct from old.role
         or new.founding_number is distinct from old.founding_number
         or new.is_banned is distinct from old.is_banned
         or new.posting_paused_until is distinct from old.posting_paused_until
         or new.referral_code is distinct from old.referral_code
         or new.referred_by is distinct from old.referred_by
         or new.popia_consent_at is distinct from old.popia_consent_at
         or new.created_at is distinct from old.created_at
         or new.id is distinct from old.id then
        raise exception 'protected profile columns cannot be changed' using errcode = 'insufficient_privilege';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger names sort alphabetically: guard runs first, then founding assignment.
create trigger a_profiles_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- Founding numbers: the lowest free number from 1 to 100, serialised with an advisory lock.
-- (BEFORE INSERT so the row is written once; the lock is held until the inserting transaction ends.)
create or replace function public.profiles_assign_founding()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_n integer;
begin
  if new.founding_number is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(7001001);

  select min(g) into v_n
  from generate_series(1, 100) g
  where not exists (select 1 from public.profiles p where p.founding_number = g);

  new.founding_number := v_n; -- null once all 100 are taken
  return new;
end;
$$;

create trigger b_profiles_founding
  before insert on public.profiles
  for each row execute function public.profiles_assign_founding();

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Public, non-sensitive profile fields. Definer view on purpose: it is the only public door to profiles.
-- Banned users are left out, which also removes them from leaderboards and stats.
create view public.public_profiles as
  select id, username::text as username, display_name, founding_number, created_at
  from public.profiles
  where not is_banned;

grant select on public.public_profiles to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- fixtures
-- ---------------------------------------------------------------------------

create table public.fixtures (
  id uuid primary key default gen_random_uuid(),
  sport text not null check (sport in ('soccer', 'rugby')),
  competition text not null,
  home text not null,
  away text not null,
  kickoff_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'finished', 'postponed', 'abandoned', 'cancelled')),
  home_score integer,
  away_score integer,
  provider text not null,
  provider_ref text not null,
  updated_at timestamptz not null default now(),
  unique (provider, provider_ref)
);

create index fixtures_kickoff_idx on public.fixtures (kickoff_at);
create index fixtures_status_idx on public.fixtures (status, kickoff_at);

create trigger fixtures_touch_updated_at
  before update on public.fixtures
  for each row execute function public.touch_updated_at();

alter table public.fixtures enable row level security;

create policy fixtures_public_select on public.fixtures
  for select to anon, authenticated
  using (true);

revoke all on public.fixtures from anon, authenticated;
grant select on public.fixtures to anon, authenticated;
grant all on public.fixtures to service_role;

-- ---------------------------------------------------------------------------
-- predictions (append-only)
-- ---------------------------------------------------------------------------

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  user_id uuid not null references public.profiles (id) on delete restrict,
  fixture_id uuid not null references public.fixtures (id) on delete restrict,
  market text not null check (market in ('1X2', 'OU25', 'HCP', 'BTTS', 'DC')),
  selection text not null,
  line numeric(5, 2),
  odds numeric(6, 2) not null check (odds between 1.01 and 50),
  confidence smallint not null check (confidence between 1 and 5),
  reasoning text check (reasoning is null or char_length(reasoning) <= 280),
  created_at timestamptz not null default now(),
  prev_hash text not null check (prev_hash ~ '^[0-9a-f]{64}$'),
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  unique (user_id, fixture_id, market)
);

create index predictions_user_idx on public.predictions (user_id, created_at desc);
create index predictions_fixture_idx on public.predictions (fixture_id);
create index predictions_created_idx on public.predictions (created_at desc);

create trigger predictions_append_only
  before update or delete on public.predictions
  for each row execute function public.forbid_mutation();

create trigger predictions_no_truncate
  before truncate on public.predictions
  for each statement execute function public.forbid_mutation();

alter table public.predictions enable row level security;

create policy predictions_public_select on public.predictions
  for select to anon, authenticated
  using (true);

-- No insert policy: rows are created only by create_prediction() below.
revoke all on public.predictions from anon, authenticated;
grant select on public.predictions to anon, authenticated;
grant all on public.predictions to service_role;

-- ---------------------------------------------------------------------------
-- settlement_events (append-only)
-- ---------------------------------------------------------------------------

create table public.settlement_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  prediction_id uuid not null references public.predictions (id) on delete restrict,
  result text not null check (result in ('won', 'lost', 'void')),
  units numeric(8, 2) not null,
  source text not null check (source in ('auto', 'admin')),
  reason text,
  admin_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint settlement_admin_needs_who check (source <> 'admin' or (admin_id is not null and reason is not null))
);

create index settlement_events_prediction_idx on public.settlement_events (prediction_id, seq desc);

create trigger settlement_events_append_only
  before update or delete on public.settlement_events
  for each row execute function public.forbid_mutation();

create trigger settlement_events_no_truncate
  before truncate on public.settlement_events
  for each statement execute function public.forbid_mutation();

alter table public.settlement_events enable row level security;

create policy settlement_events_public_select on public.settlement_events
  for select to anon, authenticated
  using (true);

revoke all on public.settlement_events from anon, authenticated;
grant select on public.settlement_events to anon, authenticated;
grant all on public.settlement_events to service_role;

-- ---------------------------------------------------------------------------
-- chain_heads (one row per Johannesburg day)
-- ---------------------------------------------------------------------------

create table public.chain_heads (
  day date primary key,
  last_prediction_id uuid not null references public.predictions (id) on delete restrict,
  hash text not null,
  pick_count integer not null,
  created_at timestamptz not null default now()
);

alter table public.chain_heads enable row level security;

create policy chain_heads_public_select on public.chain_heads
  for select to anon, authenticated
  using (true);

revoke all on public.chain_heads from anon, authenticated;
grant select on public.chain_heads to anon, authenticated;
grant all on public.chain_heads to service_role;

-- ---------------------------------------------------------------------------
-- hidden_predictions, reports
-- ---------------------------------------------------------------------------

create table public.hidden_predictions (
  prediction_id uuid primary key references public.predictions (id) on delete restrict,
  admin_id uuid not null references public.profiles (id),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.hidden_predictions enable row level security;

create policy hidden_predictions_admin_select on public.hidden_predictions
  for select to authenticated
  using (public.is_admin());

create policy hidden_predictions_admin_insert on public.hidden_predictions
  for insert to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

revoke all on public.hidden_predictions from anon, authenticated;
grant select, insert on public.hidden_predictions to authenticated;
grant all on public.hidden_predictions to service_role;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete restrict,
  prediction_id uuid not null references public.predictions (id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, prediction_id)
);

create index reports_open_idx on public.reports (created_at) where resolved_at is null;

alter table public.reports enable row level security;

create policy reports_select_own_or_admin on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and resolved_at is null);

create policy reports_admin_update on public.reports
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.reports from anon, authenticated;
grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;

-- Feed view: predictions minus the ones moderation has hidden. Definer view on purpose, because
-- hidden_predictions is admin-only and the public feed still needs to exclude its rows.
create view public.visible_predictions as
  select p.*
  from public.predictions p
  where not exists (select 1 from public.hidden_predictions h where h.prediction_id = p.id);

grant select on public.visible_predictions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- create_prediction RPC
-- ---------------------------------------------------------------------------

create or replace function public.create_prediction(
  p_fixture_id uuid,
  p_market text,
  p_selection text,
  p_line numeric,
  p_odds numeric,
  p_confidence integer,
  p_reasoning text
)
returns public.predictions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_fix public.fixtures;
  v_sel text;
  v_line numeric(5, 2);
  v_odds numeric(6, 2);
  v_created timestamptz;
  v_prev text;
  v_hash text;
  v_day_start timestamptz;
  v_row public.predictions;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if v_profile.is_banned then
    raise exception 'banned' using errcode = 'P0001';
  end if;
  if not v_profile.is_18_attested then
    raise exception 'age_not_attested' using errcode = 'P0001';
  end if;
  if v_profile.posting_paused_until is not null and v_profile.posting_paused_until > clock_timestamp() then
    raise exception 'posting_paused' using errcode = 'P0001';
  end if;

  select * into v_fix from public.fixtures where id = p_fixture_id;
  if not found then
    raise exception 'fixture_not_found' using errcode = 'P0001';
  end if;
  if v_fix.status <> 'scheduled' then
    raise exception 'fixture_not_open' using errcode = 'P0001';
  end if;

  -- Server clock only. The client never supplies a time.
  if clock_timestamp() >= v_fix.kickoff_at then
    raise exception 'kickoff_passed' using errcode = 'P0001';
  end if;

  if p_market not in ('1X2', 'OU25', 'HCP', 'BTTS', 'DC') then
    raise exception 'invalid_market' using errcode = 'P0001';
  end if;
  if p_market in ('OU25', 'BTTS', 'DC') and v_fix.sport <> 'soccer' then
    raise exception 'invalid_market_for_sport' using errcode = 'P0001';
  end if;
  if p_market = 'HCP' and v_fix.sport <> 'rugby' then
    raise exception 'invalid_market_for_sport' using errcode = 'P0001';
  end if;

  v_sel := case when p_market = 'DC' then upper(btrim(p_selection)) else lower(btrim(p_selection)) end;
  if not (
    (p_market = '1X2' and v_sel in ('home', 'draw', 'away'))
    or (p_market = 'OU25' and v_sel in ('over', 'under'))
    or (p_market = 'HCP' and v_sel in ('home', 'away'))
    or (p_market = 'BTTS' and v_sel in ('yes', 'no'))
    or (p_market = 'DC' and v_sel in ('1X', 'X2', '12'))
  ) then
    raise exception 'invalid_selection' using errcode = 'P0001';
  end if;

  -- The line is used by the handicap market only.
  if p_market = 'HCP' then
    if p_line is null or p_line < -60 or p_line > 60 or p_line <> round(p_line, 2) then
      raise exception 'invalid_line' using errcode = 'P0001';
    end if;
    v_line := p_line;
  else
    if p_line is not null then
      raise exception 'invalid_line' using errcode = 'P0001';
    end if;
    v_line := null;
  end if;

  if p_odds is null or p_odds < 1.01 or p_odds > 50 or p_odds <> round(p_odds, 2) then
    raise exception 'invalid_odds' using errcode = 'P0001';
  end if;
  v_odds := p_odds;

  if p_confidence is null or p_confidence < 1 or p_confidence > 5 then
    raise exception 'invalid_confidence' using errcode = 'P0001';
  end if;
  if p_reasoning is not null and char_length(p_reasoning) > 280 then
    raise exception 'reasoning_too_long' using errcode = 'P0001';
  end if;

  -- Serialise the whole chain.
  perform pg_advisory_xact_lock(7001002);

  -- Max 30 picks per user per Johannesburg day.
  v_day_start := date_trunc('day', clock_timestamp() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg';
  if (select count(*) from public.predictions where user_id = v_uid and created_at >= v_day_start) >= 30 then
    raise exception 'daily_limit' using errcode = 'P0001';
  end if;

  select hash into v_prev from public.predictions order by seq desc limit 1;
  v_prev := coalesce(v_prev, repeat('0', 64));

  v_created := clock_timestamp();
  v_hash := encode(
    sha256(convert_to(
      v_prev
      || v_uid::text
      || p_fixture_id::text
      || p_market
      || v_sel
      || coalesce(v_line::text, '')
      || v_odds::text
      || to_char(v_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
      'UTF8'
    )),
    'hex'
  );

  insert into public.predictions
    (user_id, fixture_id, market, selection, line, odds, confidence, reasoning, created_at, prev_hash, hash)
  values
    (v_uid, p_fixture_id, p_market, v_sel, v_line, v_odds, p_confidence::smallint, p_reasoning, v_created, v_prev, v_hash)
  returning * into v_row;

  insert into public.chain_heads (day, last_prediction_id, hash, pick_count)
  values ((v_created at time zone 'Africa/Johannesburg')::date, v_row.id, v_hash, 1)
  on conflict (day) do update
    set last_prediction_id = excluded.last_prediction_id,
        hash = excluded.hash,
        pick_count = public.chain_heads.pick_count + 1;

  return v_row;
end;
$$;

revoke execute on function public.create_prediction(uuid, text, text, numeric, numeric, integer, text) from public, anon;
grant execute on function public.create_prediction(uuid, text, text, numeric, numeric, integer, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Views (security_invoker: they read only public-select tables and public_profiles)
-- ---------------------------------------------------------------------------

-- A pick's current result is its latest settlement event.
create view public.prediction_results with (security_invoker = true) as
  select distinct on (se.prediction_id)
    se.prediction_id, se.result, se.units, se.source, se.created_at as settled_at
  from public.settlement_events se
  order by se.prediction_id, se.seq desc;

-- "settled" = won + lost. Void picks add 0 units and are left out of settled, win_rate and roi.
-- form_last_10 is newest first: W won, L lost, V void.
create view public.tipster_stats with (security_invoker = true) as
  with p as (
    select pr.id, pr.user_id, r.result, r.units, r.settled_at
    from public.predictions pr
    left join public.prediction_results r on r.prediction_id = pr.id
  ),
  form as (
    select user_id,
           string_agg(case result when 'won' then 'W' when 'lost' then 'L' else 'V' end, '' order by rn) as form_last_10
    from (
      select user_id, result,
             row_number() over (partition by user_id order by settled_at desc, id desc) as rn
      from p
      where result is not null
    ) x
    where rn <= 10
    group by user_id
  )
  select
    p.user_id,
    u.username,
    count(*)::integer as picks,
    (count(*) filter (where p.result in ('won', 'lost')))::integer as settled,
    (count(*) filter (where p.result = 'won'))::integer as wins,
    coalesce(sum(p.units), 0)::numeric(10, 2) as units,
    case when count(*) filter (where p.result in ('won', 'lost')) > 0
      then round(coalesce(sum(p.units), 0) / (count(*) filter (where p.result in ('won', 'lost'))), 4) end as roi,
    case when count(*) filter (where p.result in ('won', 'lost')) > 0
      then round((count(*) filter (where p.result = 'won'))::numeric / (count(*) filter (where p.result in ('won', 'lost'))), 4) end as win_rate,
    coalesce(f.form_last_10, '') as form_last_10
  from p
  join public.public_profiles u on u.id = p.user_id
  left join form f on f.user_id = p.user_id
  group by p.user_id, u.username, f.form_last_10;

-- Weeks start Monday 00:00 Africa/Johannesburg and are assigned by the fixture's kick-off.
-- Only settled (won/lost) picks at odds >= 1.50 count. eligible = at least 10 of them.
-- rank: units, then roi, then earliest last pick. Ineligible rows have a null rank.
create view public.weekly_leaderboard with (security_invoker = true) as
  with s as (
    select
      date_trunc('week', f.kickoff_at at time zone 'Africa/Johannesburg')::date as week_start,
      pr.user_id, pr.created_at, r.result, r.units
    from public.predictions pr
    join public.fixtures f on f.id = pr.fixture_id
    join public.prediction_results r on r.prediction_id = pr.id
    where pr.odds >= 1.50 and r.result in ('won', 'lost')
  ),
  agg as (
    select
      week_start, user_id,
      count(*)::integer as picks_settled,
      (count(*) filter (where result = 'won'))::integer as wins,
      sum(units)::numeric(10, 2) as units,
      round(sum(units) / count(*), 4) as roi,
      max(created_at) as last_pick_at,
      count(*) >= 10 as eligible
    from s
    group by week_start, user_id
  )
  select
    a.week_start, a.user_id, u.username, a.picks_settled, a.wins, a.units, a.roi, a.last_pick_at, a.eligible,
    (case when a.eligible
      then rank() over (partition by a.week_start, a.eligible order by a.units desc, a.roi desc, a.last_pick_at asc)
    end)::integer as rank
  from agg a
  join public.public_profiles u on u.id = a.user_id;

grant select on public.prediction_results, public.tipster_stats, public.weekly_leaderboard
  to anon, authenticated, service_role;
