-- Distinguish Parallel-discovered third-party logo repositories from genuinely official club/league pages.
alter table public.team_badges drop constraint if exists team_badges_method_check;
alter table public.team_badges
  add constraint team_badges_method_check
  check (method is null or method = any (array[
    'parallel_wikipedia'::text,
    'parallel_sofascore'::text,
    'parallel_official'::text,
    'parallel_source'::text,
    'manual'::text
  ]));

update public.team_badges
set method = 'parallel_source',
    updated_at = now()
where method = 'parallel_official'
  and (
    source_page ilike '%footylogos.com%'
    or source_page ilike '%football-logos.cc%'
  );
