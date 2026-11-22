-- PFIE verified data products: source registry, evidence ledger, match statistics,
-- team/player roster records, bookmaker observations and a two-bookmaker reference read model.
-- No source is enabled by default. Ingestion requires an explicit human-reviewed source record.
create table if not exists public.pfie_data_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  display_name text not null,
  domain text not null,
  data_kinds text[] not null default '{}',
  tier text not null check (tier in ('official','trusted','licensed_bookmaker','other')),
  jurisdiction text,
  licence_reference text,
  licence_checked_at timestamptz,
  ingestion_mode text not null check (ingestion_mode in ('official_api','affiliate_feed','terms_approved_public_page','public_research')),
  terms_reviewed_at timestamptz,
  affiliate_partner_id uuid references public.affiliate_partners(id) on delete set null,
  branding_allowed boolean not null default false,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pfie_data_sources_domain_nonempty check (length(trim(domain)) > 0),
  constraint pfie_bookmaker_source_review check (
    tier <> 'licensed_bookmaker'
    or (jurisdiction is not null and jurisdiction = 'ZA'
        and licence_reference is not null and length(trim(licence_reference)) > 0
        and licence_checked_at is not null and terms_reviewed_at is not null
        and ingestion_mode in ('official_api','affiliate_feed','terms_approved_public_page'))
  )
);

-- Canonical team identity registry used by date-effective roster membership.
-- team_key is a stable normalized identity key, not a display label or a source-specific alias.
create table if not exists public.pfie_teams (
  id uuid primary key default gen_random_uuid(),
  team_key text not null unique check (length(trim(team_key)) > 0),
  display_name text not null check (length(trim(display_name)) > 0),
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pfie_data_runs (
  id uuid primary key default gen_random_uuid(),
  data_kind text not null check (data_kind in ('fixtures','results','standings','match_stats','odds','rosters','player_availability')),
  scope text not null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  ok boolean not null default false,
  model text,
  sources jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  accepted_count integer not null default 0 check (accepted_count >= 0),
  rejected_count integer not null default 0 check (rejected_count >= 0),
  error text,
  started_at timestamptz not null default now()
);
create index if not exists pfie_data_runs_kind_scope_started_idx
  on public.pfie_data_runs(data_kind, scope, started_at desc);
create index if not exists pfie_data_runs_fixture_idx
  on public.pfie_data_runs(fixture_id, started_at desc) where fixture_id is not null;

create table if not exists public.pfie_data_observations (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.pfie_data_runs(id) on delete cascade,
  source_id uuid references public.pfie_data_sources(id) on delete set null,
  data_kind text not null check (data_kind in ('fixtures','results','standings','match_stats','odds','rosters','player_availability')),
  entity_type text not null,
  entity_ref text not null,
  fixture_id uuid references public.fixtures(id) on delete set null,
  metric_key text,
  metric_value jsonb,
  unit text,
  source_url text,
  domain text,
  content_hash text,
  quote text not null,
  observed_at timestamptz,
  accepted boolean not null default false,
  reject_reason text,
  created_at timestamptz not null default now(),
  constraint pfie_data_observations_quote_nonempty check (length(trim(quote)) > 0)
);
create index if not exists pfie_data_observations_run_idx on public.pfie_data_observations(run_id);
create index if not exists pfie_data_observations_entity_idx
  on public.pfie_data_observations(data_kind, entity_type, entity_ref, created_at desc);
create index if not exists pfie_data_observations_fixture_idx
  on public.pfie_data_observations(fixture_id, data_kind, created_at desc) where fixture_id is not null;

create table if not exists public.pfie_match_stats (
  id bigint generated always as identity primary key,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  metric_key text not null,
  scope text not null default 'match',
  value numeric not null,
  unit text not null,
  source_count integer not null check (source_count >= 1),
  source_domains text[] not null,
  verified_at timestamptz not null,
  fresh_until timestamptz not null,
  run_id uuid references public.pfie_data_runs(id) on delete set null,
  unique (fixture_id, metric_key, scope),
  constraint pfie_match_stats_freshness check (fresh_until >= verified_at)
);
create index if not exists pfie_match_stats_fixture_idx on public.pfie_match_stats(fixture_id, metric_key);

create table if not exists public.pfie_players (
  id uuid primary key default gen_random_uuid(),
  player_key text not null unique,
  display_name text not null,
  position text,
  nationality text,
  external_ids jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  source_count integer not null default 0 check (source_count >= 0),
  source_domains text[] not null default '{}',
  run_id uuid references public.pfie_data_runs(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pfie_team_rosters (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.pfie_players(id) on delete cascade,
  team_id uuid not null references public.pfie_teams(id) on delete restrict,
  competition text,
  squad_number integer check (squad_number between 1 and 99),
  position text,
  roster_status text not null check (roster_status in ('registered','loaned','released','unknown')),
  valid_from date,
  valid_to date,
  source_count integer not null check (source_count >= 1),
  source_domains text[] not null,
  verified_at timestamptz not null,
  run_id uuid references public.pfie_data_runs(id) on delete set null,
  constraint pfie_roster_validity check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create index if not exists pfie_team_rosters_team_idx
  on public.pfie_team_rosters(team_id, roster_status, valid_from desc);
create index if not exists pfie_team_rosters_player_idx
  on public.pfie_team_rosters(player_id, valid_from desc);

create table if not exists public.pfie_bookmaker_prices (
  id bigint generated always as identity primary key,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  source_id uuid not null references public.pfie_data_sources(id) on delete restrict,
  market text not null,
  selection text not null,
  decimal_odds numeric(10,4) not null check (decimal_odds > 1 and decimal_odds <= 1000),
  market_status text not null default 'open' check (market_status in ('open','suspended','closed','in_play')),
  captured_at timestamptz not null,
  source_url text,
  evidence_quote text not null,
  content_hash text,
  run_id uuid references public.pfie_data_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint pfie_bookmaker_price_quote_nonempty check (length(trim(evidence_quote)) > 0)
);
create index if not exists pfie_bookmaker_prices_fixture_market_idx
  on public.pfie_bookmaker_prices(fixture_id, market, selection, captured_at desc);
create index if not exists pfie_bookmaker_prices_source_idx
  on public.pfie_bookmaker_prices(source_id, captured_at desc);


-- Every raw bookmaker price must point to a currently enabled, reviewed South African bookmaker source.
-- The application performs the same checks, but this trigger protects service-role writes and future workers.
create or replace function public.pfie_validate_bookmaker_price_source()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $pfie$
begin
  if not exists (
    select 1
    from public.pfie_data_sources s
    where s.id = new.source_id
      and s.tier = 'licensed_bookmaker'
      and s.enabled is true
      and s.jurisdiction = 'ZA'
      and nullif(trim(s.licence_reference), '') is not null
      and s.licence_checked_at is not null
      and s.terms_reviewed_at is not null
      and s.ingestion_mode in ('official_api', 'affiliate_feed', 'terms_approved_public_page')
  ) then
    raise exception 'PFIE bookmaker prices require an enabled, reviewed South African licensed bookmaker source';
  end if;
  return new;
end;
$pfie$;

drop trigger if exists pfie_bookmaker_prices_source_guard on public.pfie_bookmaker_prices;
create trigger pfie_bookmaker_prices_source_guard
  before insert or update of source_id on public.pfie_bookmaker_prices
  for each row execute function public.pfie_validate_bookmaker_price_source();

revoke all on function public.pfie_validate_bookmaker_price_source() from PUBLIC, anon, authenticated;
grant execute on function public.pfie_validate_bookmaker_price_source() to service_role;

-- This is the future aggregate reference-price model. Keep it service-role-only until a reviewed
-- public read view is deliberately added. A row requires two independently permitted sources.
create table if not exists public.pfie_reference_prices (
  id bigint generated always as identity primary key,
  fixture_id uuid not null references public.fixtures(id) on delete cascade,
  market text not null,
  selection text not null,
  decimal_odds numeric(10,4) not null check (decimal_odds > 1 and decimal_odds <= 1000),
  bookmaker_count integer not null check (bookmaker_count >= 2),
  source_ids uuid[] not null check (cardinality(source_ids) >= 2),
  source_domains text[] not null check (cardinality(source_domains) >= 2),
  constraint pfie_reference_price_source_counts_match check (
    bookmaker_count = cardinality(source_ids)
    and bookmaker_count = cardinality(source_domains)
  ),
  captured_at timestamptz not null,
  verified_at timestamptz not null,
  run_id uuid references public.pfie_data_runs(id) on delete set null,
  unique (fixture_id, market, selection)
);
create index if not exists pfie_reference_prices_fixture_idx
  on public.pfie_reference_prices(fixture_id, captured_at desc);

create or replace function public.pfie_validate_reference_price_sources()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $pfie$
declare
  distinct_source_count integer;
  distinct_domain_count integer;
  permitted_source_count integer;
  registry_domain_count integer;
begin
  select count(distinct u.source_id)
    into distinct_source_count
    from unnest(new.source_ids) as u(source_id);

  select count(distinct lower(regexp_replace(trim(u.domain), '^www[.]', '')))
    into distinct_domain_count
    from unnest(new.source_domains) as u(domain);

  select count(distinct lower(regexp_replace(trim(s.domain), '^www[.]', '')))
    into registry_domain_count
    from public.pfie_data_sources s
    where s.id = any(new.source_ids);

  if new.bookmaker_count < 2
    or new.bookmaker_count <> cardinality(new.source_ids)
    or new.bookmaker_count <> cardinality(new.source_domains)
    or distinct_source_count <> cardinality(new.source_ids)
    or distinct_domain_count <> cardinality(new.source_domains)
    or registry_domain_count <> cardinality(new.source_ids) then
    raise exception 'PFIE reference prices require at least two distinct source IDs and publisher domains matching bookmaker_count';
  end if;

  select count(*)
    into permitted_source_count
    from public.pfie_data_sources s
    where s.id = any(new.source_ids)
      and s.tier = 'licensed_bookmaker'
      and s.enabled is true
      and s.jurisdiction = 'ZA'
      and nullif(trim(s.licence_reference), '') is not null
      and s.licence_checked_at is not null
      and s.terms_reviewed_at is not null
      and s.ingestion_mode in ('official_api', 'affiliate_feed', 'terms_approved_public_page');

  if permitted_source_count <> cardinality(new.source_ids) then
    raise exception 'PFIE reference prices may only use distinct, permitted South African bookmaker sources';
  end if;

  if exists (
    select 1
    from unnest(new.source_ids) as selected(source_id)
    join public.pfie_data_sources s on s.id = selected.source_id
    where not exists (
      select 1
      from unnest(new.source_domains) as supplied(domain)
      where lower(regexp_replace(trim(s.domain), '^www[.]', '')) =
        lower(regexp_replace(trim(supplied.domain), '^www[.]', ''))
    )
  ) or exists (
    select 1
    from unnest(new.source_domains) as supplied(domain)
    where not exists (
      select 1
      from public.pfie_data_sources s
      where s.id = any(new.source_ids)
        and lower(regexp_replace(trim(s.domain), '^www[.]', '')) =
          lower(regexp_replace(trim(supplied.domain), '^www[.]', ''))
    )
  ) then
    raise exception 'PFIE reference-price publisher domains must match one-to-one with the selected source IDs';
  end if;

  return new;
end;
$pfie$;

drop trigger if exists pfie_reference_prices_source_guard on public.pfie_reference_prices;
create trigger pfie_reference_prices_source_guard
  before insert or update of bookmaker_count, source_ids, source_domains
  on public.pfie_reference_prices
  for each row execute function public.pfie_validate_reference_price_sources();

revoke all on function public.pfie_validate_reference_price_sources() from PUBLIC, anon, authenticated;
grant execute on function public.pfie_validate_reference_price_sources() to service_role;

-- All ingestion and audit tables are service-role only until reviewed public/admin read views are added.
alter table public.pfie_data_sources enable row level security;
alter table public.pfie_teams enable row level security;
alter table public.pfie_data_runs enable row level security;
alter table public.pfie_data_observations enable row level security;
alter table public.pfie_match_stats enable row level security;
alter table public.pfie_players enable row level security;
alter table public.pfie_team_rosters enable row level security;
alter table public.pfie_bookmaker_prices enable row level security;
alter table public.pfie_reference_prices enable row level security;

revoke all on public.pfie_data_sources, public.pfie_teams, public.pfie_data_runs, public.pfie_data_observations,
  public.pfie_match_stats, public.pfie_players, public.pfie_team_rosters,
  public.pfie_bookmaker_prices, public.pfie_reference_prices from PUBLIC, anon, authenticated;
grant all on public.pfie_data_sources, public.pfie_teams, public.pfie_data_runs, public.pfie_data_observations,
  public.pfie_match_stats, public.pfie_players, public.pfie_team_rosters,
  public.pfie_bookmaker_prices, public.pfie_reference_prices to service_role;
grant usage, select on sequence public.pfie_data_observations_id_seq to service_role;
grant usage, select on sequence public.pfie_match_stats_id_seq to service_role;
grant usage, select on sequence public.pfie_team_rosters_id_seq to service_role;
grant usage, select on sequence public.pfie_bookmaker_prices_id_seq to service_role;
grant usage, select on sequence public.pfie_reference_prices_id_seq to service_role;
