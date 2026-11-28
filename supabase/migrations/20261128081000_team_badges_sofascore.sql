-- Team badges: SofaScore crests (owner request, 27 Nov 2026).
-- The badge job now looks for a team's SofaScore page first (found through Parallel search) and mirrors its crest to
-- our own storage; Wikipedia stays the fallback. Existing Wikipedia badges are upgraded once each, tracked by
-- upgrade_checked_at, so a team SofaScore cannot match is not searched again.
-- No personal information is involved: rows are club names and public crest images.

alter table public.team_badges drop constraint if exists team_badges_method_check;
alter table public.team_badges
  add constraint team_badges_method_check
  check (method is null or method in ('parallel_wikipedia', 'manual', 'parallel_sofascore'));

alter table public.team_badges add column if not exists upgrade_checked_at timestamptz;

comment on column public.team_badges.upgrade_checked_at is
  'When the job last tried to replace a Wikipedia badge with the SofaScore crest (one try per team).';
