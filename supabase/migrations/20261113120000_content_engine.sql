-- Content engine (master brief, phase one): research -> AI draft -> quality gate -> newsroom.
--
-- Additive only. The newsroom keeps its table (`newsroom_articles` is the brief's "content_articles") and its
-- category check (the brief's "content_categories"); this file adds the AI metadata, the job, log, source, settings,
-- usage and project-update tables, and the daily schedule. Nothing existing is dropped or rewritten.
--
-- Safe to apply before any key exists: `content_settings.enabled` starts false, so the daily job records nothing
-- and calls no provider until an administrator switches it on. Automatic publishing is a second, separate switch.
--
-- To undo: unschedule 'content-daily'; drop content_api_usage, content_project_updates, content_sources,
-- content_generation_logs, content_generation_jobs, content_settings; drop the added newsroom_articles columns;
-- restore the previous category check and newsroom_after_publish (20261106130000).

-- 1. Newsroom: new category and AI metadata -------------------------------------------------------------------

alter table public.newsroom_articles drop constraint if exists newsroom_articles_category_check;
alter table public.newsroom_articles add constraint newsroom_articles_category_check
  check (category in ('company', 'product', 'pfie', 'features', 'community', 'launch', 'sports'));

alter table public.newsroom_articles
  add column if not exists tags text[] not null default '{}',
  add column if not exists reading_minutes integer check (reading_minutes is null or reading_minutes between 1 and 60),
  add column if not exists origin text not null default 'human' check (origin in ('human', 'ai')),
  add column if not exists ai_model text,
  add column if not exists quality_score integer check (quality_score is null or quality_score between 0 and 100),
  add column if not exists quality_issues jsonb not null default '[]'::jsonb,
  add column if not exists image_attribution text,
  add column if not exists generation_job_id uuid;

-- One article per generation job: a retried save can never create a second article.
create unique index if not exists newsroom_articles_generation_job_idx
  on public.newsroom_articles (generation_job_id) where generation_job_id is not null;

create or replace function public.newsroom_after_publish()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'PUBLISHED'
     and (tg_op = 'INSERT' or old.status is distinct from 'PUBLISHED') then
    insert into public.notifications (title, message, category, target_url, newsroom_article_id, published_at)
    values (
      left(new.title, 140), left(new.excerpt, 400),
      case new.category when 'company' then 'Company Updates' when 'product' then 'Product Development'
        when 'pfie' then 'PFIE & Technology' when 'features' then 'Features & Improvements'
        when 'community' then 'Community' when 'sports' then 'Sports Intelligence'
        else 'Launch Announcements' end,
      '/newsroom/' || new.slug, new.id, new.published_at)
    on conflict (newsroom_article_id) do nothing;
  end if;
  return new;
end;
$$;

-- 2. Settings (one row) ----------------------------------------------------------------------------------------

create table if not exists public.content_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  auto_publish boolean not null default false,
  min_quality integer not null default 85 check (min_quality between 50 and 100),
  schedule_mode text not null default 'alternate' check (schedule_mode in ('alternate', 'sports', 'development')),
  next_kind_override text check (next_kind_override in ('sports', 'development')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);
insert into public.content_settings (id) values (true) on conflict (id) do nothing;

-- 3. Jobs, logs, sources ---------------------------------------------------------------------------------------

create table if not exists public.content_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,
  kind text not null check (kind in ('sports', 'development')),
  trigger text not null check (trigger in ('cron', 'manual')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'skipped')),
  attempt integer not null default 1 check (attempt between 1 and 10),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  article_id uuid references public.newsroom_articles (id) on delete set null,
  model text,
  error text,
  report jsonb
);
create index if not exists content_generation_jobs_started_idx on public.content_generation_jobs (started_at desc);

alter table public.newsroom_articles drop constraint if exists newsroom_articles_generation_job_fk;
alter table public.newsroom_articles add constraint newsroom_articles_generation_job_fk
  foreign key (generation_job_id) references public.content_generation_jobs (id) on delete set null;

create table if not exists public.content_generation_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.content_generation_jobs (id) on delete cascade,
  at timestamptz not null default now(),
  stage text not null,
  level text not null check (level in ('info', 'warn', 'error')),
  message text not null,
  data jsonb
);
create index if not exists content_generation_logs_job_idx on public.content_generation_logs (job_id, id);

create table if not exists public.content_sources (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.content_generation_jobs (id) on delete cascade,
  article_id uuid references public.newsroom_articles (id) on delete cascade,
  ordinal integer not null,
  url text not null check (url ~ '^https://'),
  domain text not null,
  title text not null,
  source_published_at text,
  via text not null check (via in ('search', 'extract', 'project')),
  cited boolean not null default false,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (job_id, ordinal)
);
create index if not exists content_sources_article_idx on public.content_sources (article_id, ordinal);

-- 4. Approved project updates: the only material a "Puntr development" article may be written from -------------

create table if not exists public.content_project_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  detail text not null check (char_length(detail) between 10 and 4000),
  happened_on date not null,
  approved boolean not null default false,
  used_in_article uuid references public.newsroom_articles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists content_project_updates_pending_idx
  on public.content_project_updates (happened_on) where approved and used_in_article is null;

-- 5. Provider usage per UTC day (quota monitoring) -------------------------------------------------------------

create table if not exists public.content_api_usage (
  provider text not null,
  day date not null default (now() at time zone 'utc')::date,
  calls integer not null default 0,
  errors integer not null default 0,
  primary key (provider, day)
);

create or replace function public.content_count_usage(p_provider text, p_error boolean)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.content_api_usage (provider, day, calls, errors)
  values (p_provider, (now() at time zone 'utc')::date, 1, case when p_error then 1 else 0 end)
  on conflict (provider, day) do update
    set calls = public.content_api_usage.calls + 1,
        errors = public.content_api_usage.errors + case when p_error then 1 else 0 end;
$$;

-- Claims a job key. Returns the job id and attempt, or nothing when the key is already held or finished.
-- A `running` job older than 15 minutes is treated as dead and may be taken over.
-- A failed job may be retried (the schedule calls again at 04:20 and 04:40 UTC), at most 3 attempts per key;
-- `p_force` (an administrator's manual rerun) may go past 3 and may also rerun a skipped job. A succeeded job is
-- never taken over.
create or replace function public.content_claim_job(p_job_key text, p_kind text, p_trigger text, p_force boolean)
returns table (id uuid, attempt integer)
language plpgsql security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
begin
  return query
  insert into public.content_generation_jobs as j (job_key, kind, trigger)
  values (p_job_key, p_kind, p_trigger)
  on conflict (job_key) do update
    set status = 'running', kind = excluded.kind, trigger = excluded.trigger, attempt = j.attempt + 1,
        started_at = now(), finished_at = null, error = null
    where (j.attempt < 3 or (p_force and j.attempt < 10))
      and ((j.status = 'running' and j.started_at < now() - interval '15 minutes')
        or j.status = 'failed'
        or (p_force and j.status = 'skipped'))
  returning j.id, j.attempt;
end;
$$;

-- 6. Access: administrators read everything and edit settings and project updates; the pipeline writes as
--    service_role. No access for anon; no table is readable by ordinary members. Public article pages read their
--    sources through content_article_sources() below. ------------------------------------------------------------

alter table public.content_settings enable row level security;
alter table public.content_generation_jobs enable row level security;
alter table public.content_generation_logs enable row level security;
alter table public.content_sources enable row level security;
alter table public.content_project_updates enable row level security;
alter table public.content_api_usage enable row level security;

revoke all on public.content_settings, public.content_generation_jobs, public.content_generation_logs,
  public.content_sources, public.content_project_updates, public.content_api_usage from anon, authenticated;

grant select, update on public.content_settings to authenticated;
grant select on public.content_generation_jobs, public.content_generation_logs, public.content_sources,
  public.content_api_usage to authenticated;
grant select, insert, update on public.content_project_updates to authenticated;

grant select, insert, update, delete on public.content_settings, public.content_generation_jobs,
  public.content_generation_logs, public.content_sources, public.content_project_updates,
  public.content_api_usage to service_role;
grant usage, select on all sequences in schema public to service_role;

drop policy if exists content_settings_admin_read on public.content_settings;
create policy content_settings_admin_read on public.content_settings
  for select to authenticated using (public.is_admin());
drop policy if exists content_settings_admin_update on public.content_settings;
create policy content_settings_admin_update on public.content_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists content_jobs_admin_read on public.content_generation_jobs;
create policy content_jobs_admin_read on public.content_generation_jobs
  for select to authenticated using (public.is_admin());
drop policy if exists content_logs_admin_read on public.content_generation_logs;
create policy content_logs_admin_read on public.content_generation_logs
  for select to authenticated using (public.is_admin());
drop policy if exists content_sources_admin_read on public.content_sources;
create policy content_sources_admin_read on public.content_sources
  for select to authenticated using (public.is_admin());
drop policy if exists content_usage_admin_read on public.content_api_usage;
create policy content_usage_admin_read on public.content_api_usage
  for select to authenticated using (public.is_admin());

drop policy if exists content_updates_admin_all on public.content_project_updates;
create policy content_updates_admin_all on public.content_project_updates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.content_count_usage(text, boolean) from public, anon, authenticated;
revoke all on function public.content_claim_job(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.content_count_usage(text, boolean) to service_role;
grant execute on function public.content_claim_job(text, text, text, boolean) to service_role;

-- Sources of a published article, for the public article page (editorial transparency). Cited sources only.
create or replace function public.content_article_sources(p_slug text)
returns table (ordinal integer, url text, domain text, title text)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.ordinal, s.url, s.domain, s.title
  from public.content_sources s
  join public.newsroom_articles a on a.id = s.article_id
  where a.slug = p_slug and a.status = 'PUBLISHED' and a.published_at <= now()
    and s.cited and s.via <> 'project'
  order by s.ordinal;
$$;
revoke all on function public.content_article_sources(text) from public;
grant execute on function public.content_article_sources(text) to anon, authenticated, service_role;

-- 7. Schedule: 06:00 SAST = 04:00 UTC, every day. pg_cron + pg_net, like every other job in this project
--    (Vercel's free plan only fires a daily cron "some time within the hour"; pg_cron fires on the minute). --------

select cron.unschedule('content-daily') where exists (select 1 from cron.job where jobname = 'content-daily');
-- The 04:20 and 04:40 calls are retries: they do nothing once the day's job has succeeded.
select cron.schedule('content-daily', '0,20,40 4 * * *', $$select public.invoke_cron('/api/cron/content-daily')$$);
