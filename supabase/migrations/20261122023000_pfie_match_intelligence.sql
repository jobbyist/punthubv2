create table if not exists public.fixture_match_stats (
  fixture_id uuid primary key references public.fixtures(id) on delete cascade,
  home_stats jsonb not null default '{}'::jsonb,
  away_stats jsonb not null default '{}'::jsonb,
  source_domains text[] not null default '{}'::text[],
  sources jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fixture_lineups (
  fixture_id uuid primary key references public.fixtures(id) on delete cascade,
  home_players jsonb not null default '[]'::jsonb,
  away_players jsonb not null default '[]'::jsonb,
  source_domains text[] not null default '{}'::text[],
  sources jsonb not null default '[]'::jsonb,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fixture_match_stats_verified_at_idx
  on public.fixture_match_stats (verified_at desc);
create index if not exists fixture_lineups_verified_at_idx
  on public.fixture_lineups (verified_at desc);

alter table public.fixture_match_stats enable row level security;
alter table public.fixture_lineups enable row level security;

drop policy if exists "Public can read verified fixture stats" on public.fixture_match_stats;
create policy "Public can read verified fixture stats"
  on public.fixture_match_stats for select to anon, authenticated using (true);

drop policy if exists "Public can read verified fixture lineups" on public.fixture_lineups;
create policy "Public can read verified fixture lineups"
  on public.fixture_lineups for select to anon, authenticated using (true);

grant select on public.fixture_match_stats to anon, authenticated;
grant select on public.fixture_lineups to anon, authenticated;
grant all on public.fixture_match_stats to service_role;
grant all on public.fixture_lineups to service_role;

-- Allow the new per-fixture PFIE jobs to record their attempts in the shared sync ledger.
alter table public.sync_status drop constraint if exists sync_status_job_check;
alter table public.sync_status add constraint sync_status_job_check
  check (job in ('standings', 'history', 'season', 'odds', 'match-stats', 'match-lineups'));

-- Odds now processes one competition per bounded request; double the cadence to preserve throughput.
select cron.unschedule('sync-odds')
where exists (select 1 from cron.job where jobname = 'sync-odds');
select cron.schedule(
  'sync-odds',
  '0,5,10,15,20,25,30,35,40,45,50,55 5,12 * * *',
  $select public.invoke_cron('/api/cron/sync-odds')$
);

do $
begin
  if exists (select 1 from cron.job where jobname = 'sync-match-intelligence') then
    perform cron.unschedule('sync-match-intelligence');
  end if;
  perform cron.schedule(
    'sync-match-intelligence',
    '*/15 * * * *',
    $cron$select public.invoke_cron('/api/cron/sync-match-intelligence?max=1')$cron$
  );
end
$$;
