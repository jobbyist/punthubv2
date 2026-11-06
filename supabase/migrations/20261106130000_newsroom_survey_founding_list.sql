-- 6 Nov 2026: Newsroom, member survey, admin founding-members list, and the two launch-campaign notifications.
-- RLS is on for every table.

-- ---------------------------------------------------------------------------
-- 1. Admin founding-members list: registered members (with their number) plus early-access people holding a spot
--    who have not registered yet. Admin only. The admin/support account holds no member slot and is excluded.
-- ---------------------------------------------------------------------------
create or replace function public.admin_founding_members()
returns table (
  founding_number integer,
  first_name text,
  surname text,
  email text,
  phone text,
  signed_up_at timestamptz,
  status text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with registered as (
    select p.founding_number as fn, u.email::text as em, coalesce(e.phone, u.phone) as ph,
           e.name as nm, p.created_at as at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.early_access e on lower(e.email) = lower(u.email)
    where p.founding_number is not null and p.role <> 'admin'
  ), held as (
    select null::integer as fn, e.email as em, e.phone as ph, e.name as nm, e.created_at as at
    from public.early_access e
    where e.founding_reserved
      and not exists (
        select 1 from public.profiles p join auth.users u on u.id = p.id
        where lower(u.email) = lower(e.email) and p.founding_number is not null
      )
  ), allm as (
    select r.*, 'registered'::text as st from registered r
    union all
    select h.*, 'reserved, not yet registered'::text from held h
  )
  select a.fn, nullif(split_part(btrim(a.nm), ' ', 1), ''),
         nullif(btrim(substr(btrim(a.nm), length(split_part(btrim(a.nm), ' ', 1)) + 1)), ''),
         a.em, a.ph, a.at, a.st
  from allm a
  order by a.fn nulls last, a.at;
end;
$$;
revoke all on function public.admin_founding_members() from public, anon;
grant execute on function public.admin_founding_members() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Member survey (one response per member) with an optional entry into the R500 OTT voucher draw.
-- ---------------------------------------------------------------------------
create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  liked text check (char_length(liked) <= 1000),
  improve text check (char_length(improve) <= 1000),
  wanted_features text[] not null default '{}',
  pricing_view text check (pricing_view in ('too_high', 'fair', 'good_value', 'unsure')),
  draw_entry boolean not null default false,
  contact_ok boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.survey_responses enable row level security;

drop policy if exists survey_insert_own on public.survey_responses;
create policy survey_insert_own on public.survey_responses
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists survey_select_own on public.survey_responses;
create policy survey_select_own on public.survey_responses
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Newsroom articles. Single source for /newsroom, the homepage feed and the in-app notification.
-- ---------------------------------------------------------------------------
create table if not exists public.newsroom_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 140),
  excerpt text not null check (char_length(excerpt) between 1 and 300),
  body text not null default '',
  cover_image_url text,
  category text not null check (category in
    ('company', 'product', 'pfie', 'features', 'community', 'launch')),
  author_name text not null default 'The Puntr team',
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  og_image_url text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsroom_publish_needs_date check (status not in ('SCHEDULED', 'PUBLISHED') or published_at is not null)
);
create index if not exists newsroom_published_idx on public.newsroom_articles (published_at desc)
  where status = 'PUBLISHED';
alter table public.newsroom_articles enable row level security;

drop policy if exists newsroom_public_read on public.newsroom_articles;
create policy newsroom_public_read on public.newsroom_articles
  for select to anon, authenticated
  using (status = 'PUBLISHED' and published_at <= now());
drop policy if exists newsroom_admin_all on public.newsroom_articles;
create policy newsroom_admin_all on public.newsroom_articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.newsroom_articles to anon, authenticated;

-- Publishing sets the date once; moving an article to PUBLISHED creates exactly one in-app notification
-- (notifications.newsroom_article_id is unique, so retries and re-publishes never duplicate it).
create or replace function public.newsroom_before_write()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'PUBLISHED' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists newsroom_before_write on public.newsroom_articles;
create trigger newsroom_before_write before insert or update on public.newsroom_articles
  for each row execute function public.newsroom_before_write();

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
        when 'community' then 'Community' else 'Launch Announcements' end,
      '/newsroom/' || new.slug, new.id, new.published_at)
    on conflict (newsroom_article_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists newsroom_after_publish on public.newsroom_articles;
create trigger newsroom_after_publish after insert or update of status on public.newsroom_articles
  for each row execute function public.newsroom_after_publish();

-- Scheduled articles go live when their time arrives (checked every 5 minutes).
select cron.schedule(
  'newsroom-publish-due', '*/5 * * * *',
  $$update public.newsroom_articles set status = 'PUBLISHED' where status = 'SCHEDULED' and published_at <= now()$$
);

-- ---------------------------------------------------------------------------
-- 4. Launch-campaign notifications (shown live in the bell via Realtime). Inserted once.
-- ---------------------------------------------------------------------------
insert into public.notifications (title, message, category, target_url, published_at)
select 'Founding Member sign-ups are open',
       'Join the first 100 Founding Members free. The Founding Member Annual Pass is announced: R299 once-off for 12 months of Puntr Pro from 1 December 2026, no automatic renewal.',
       'Launch Announcements', '/founding', now()
where not exists (select 1 from public.notifications where title = 'Founding Member sign-ups are open');

insert into public.notifications (title, message, category, target_url, published_at)
select 'Win a R500 OTT voucher: share your feedback',
       'Tell us what you think in our short survey for a chance to win a free R500 OTT voucher. 18+ only, T&Cs apply.',
       'Community', '/feedback', now()
where not exists (select 1 from public.notifications where title = 'Win a R500 OTT voucher: share your feedback');
