-- PFIE fixtures provider: audit trail for fixtures and results sourced with Parallel Search + Gemini.
-- Additive. public.fixtures is unchanged: verified fixtures are written there with provider = 'pfie' by the existing
-- sync. These two tables keep what every source said, what was rejected and why, and what was decided.
-- To undo: drop pfie_observations, pfie_runs and the purge job.

create table if not exists public.pfie_runs (
  id uuid primary key default gen_random_uuid(),
  competition text not null,
  kind text not null check (kind in ('fixtures', 'results')),
  started_at timestamptz not null default now(),
  ok boolean not null,
  error text,
  model text,
  sources jsonb not null default '[]'::jsonb,
  decisions jsonb not null default '[]'::jsonb,
  accepted_count integer not null default 0,
  rejected_count integer not null default 0
);
create index if not exists pfie_runs_recent_idx on public.pfie_runs (competition, kind, started_at desc);

create table if not exists public.pfie_observations (
  id bigint generated always as identity primary key,
  run_id uuid not null references public.pfie_runs (id) on delete cascade,
  competition text not null,
  source_url text,
  domain text,
  tier text check (tier is null or tier in ('official', 'trusted', 'other')),
  home text not null,
  away text not null,
  match_date date,
  kickoff_utc timestamptz,
  status text not null,
  home_score integer,
  away_score integer,
  quote text not null,
  accepted boolean not null,
  reject_reason text,
  created_at timestamptz not null default now()
);
create index if not exists pfie_observations_run_idx on public.pfie_observations (run_id);
create index if not exists pfie_observations_match_idx on public.pfie_observations (competition, match_date);

alter table public.pfie_runs enable row level security;
alter table public.pfie_observations enable row level security;
revoke all on public.pfie_runs, public.pfie_observations from anon, authenticated;
grant select on public.pfie_runs, public.pfie_observations to authenticated;
grant select, insert, update, delete on public.pfie_runs, public.pfie_observations to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists pfie_runs_admin_read on public.pfie_runs;
create policy pfie_runs_admin_read on public.pfie_runs for select to authenticated using (public.is_admin());
drop policy if exists pfie_observations_admin_read on public.pfie_observations;
create policy pfie_observations_admin_read on public.pfie_observations
  for select to authenticated using (public.is_admin());

-- Keep 60 days of audit rows (observations go with their run).
select cron.unschedule('pfie-purge') where exists (select 1 from cron.job where jobname = 'pfie-purge');
select cron.schedule('pfie-purge', '30 1 * * *',
  $$delete from public.pfie_runs where started_at < now() - interval '60 days'$$);
