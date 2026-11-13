-- The content store saves an article with `upsert ... on conflict (generation_job_id)`. Postgres cannot use the
-- existing PARTIAL unique index (where generation_job_id is not null) for that, so every generated article failed
-- to save ("there is no unique or exclusion constraint matching the ON CONFLICT specification"; first run,
-- 13 Nov 2026). A plain unique index works and still allows any number of rows without a job (NULLs are distinct).
create unique index if not exists newsroom_articles_generation_job_key on public.newsroom_articles (generation_job_id);
drop index if exists public.newsroom_articles_generation_job_idx;
