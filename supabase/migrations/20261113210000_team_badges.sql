-- 13 Nov 2026: real team badges for every team the platform shows.
-- Owner rule: every team must carry its real badge, found with Parallel Search, before it is surfaced.
-- The resolver (/api/cron/team-badges) finds the club's Wikipedia article with Parallel Search, takes the crest from
-- the article summary, checks it, and mirrors it to the public `media` bucket (teams/<sport>/<slug>.png) so visitors'
-- browsers never call third parties. Fixtures whose teams have no verified badge are not listed (fixtures.ts).

create table if not exists public.team_badges (
  id uuid primary key default gen_random_uuid(),
  sport text not null default 'soccer',
  team_key text not null check (char_length(team_key) between 1 and 80),
  team_name text not null check (char_length(team_name) between 1 and 120),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  source_page text,
  source_image text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'rejected')),
  method text check (method is null or method in ('parallel_wikipedia', 'manual')),
  attempts integer not null default 0,
  last_error text,
  checked_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport, team_key)
);

create index if not exists team_badges_status_idx on public.team_badges (status);

alter table public.team_badges enable row level security;

drop policy if exists team_badges_public_read on public.team_badges;
create policy team_badges_public_read on public.team_badges
  for select to anon, authenticated
  using (status = 'verified' or public.is_admin());

revoke all on public.team_badges from anon, authenticated;
grant select on public.team_badges to anon, authenticated;
grant select, insert, update, delete on public.team_badges to service_role;

create or replace function public.team_badges_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists team_badges_touch on public.team_badges;
create trigger team_badges_touch before update on public.team_badges
  for each row execute function public.team_badges_touch();

-- Every 30 minutes: resolve badges for teams that appeared in new fixtures.
do $$
begin
  perform cron.unschedule('team-badges');
exception when others then null;
end $$;
select cron.schedule('team-badges', '7,37 * * * *', $$select public.invoke_cron('/api/cron/team-badges')$$);
