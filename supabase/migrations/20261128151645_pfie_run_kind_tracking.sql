alter table public.pfie_runs drop constraint if exists pfie_runs_kind_check;
alter table public.pfie_runs
  add constraint pfie_runs_kind_check
  check (kind = any (array['fixtures','results','standings','history','season','archive']::text[]));
