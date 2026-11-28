-- Bookmaker reviews: signed-in members rate a bookmaker in the directory (overall, ease of use, payouts,
-- support) and may add a short comment. One review per member per bookmaker; members edit or delete their own.
-- Public reads go through views that show the reviewer's public username only, never the user id.
-- Idempotent so it can be re-run safely.

create table if not exists public.bookmaker_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bookmaker_slug text not null check (bookmaker_slug ~ '^[a-z0-9-]{1,60}$'),
  overall smallint not null check (overall between 1 and 5),
  ease_of_use smallint not null check (ease_of_use between 1 and 5),
  payouts smallint not null check (payouts between 1 and 5),
  support smallint not null check (support between 1 and 5),
  body text check (body is null or char_length(body) <= 600),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, bookmaker_slug)
);

create index if not exists bookmaker_reviews_slug_idx
  on public.bookmaker_reviews (bookmaker_slug, created_at desc)
  where status = 'published';

alter table public.bookmaker_reviews enable row level security;

drop policy if exists "bookmaker_reviews_own_select" on public.bookmaker_reviews;
create policy "bookmaker_reviews_own_select" on public.bookmaker_reviews
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "bookmaker_reviews_own_insert" on public.bookmaker_reviews;
create policy "bookmaker_reviews_own_insert" on public.bookmaker_reviews
  for insert to authenticated with check (user_id = auth.uid() and status = 'published');

-- Members can edit their own review but cannot un-hide one a moderator hid.
drop policy if exists "bookmaker_reviews_own_update" on public.bookmaker_reviews;
create policy "bookmaker_reviews_own_update" on public.bookmaker_reviews
  for update to authenticated
  using (user_id = auth.uid() and status = 'published')
  with check (user_id = auth.uid() and status = 'published');

drop policy if exists "bookmaker_reviews_admin_update" on public.bookmaker_reviews;
create policy "bookmaker_reviews_admin_update" on public.bookmaker_reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "bookmaker_reviews_own_delete" on public.bookmaker_reviews;
create policy "bookmaker_reviews_own_delete" on public.bookmaker_reviews
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

grant select, insert, update, delete on public.bookmaker_reviews to authenticated;

create or replace function public.bookmaker_reviews_touch()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists bookmaker_reviews_touch on public.bookmaker_reviews;
create trigger bookmaker_reviews_touch
  before update on public.bookmaker_reviews
  for each row execute function public.bookmaker_reviews_touch();

-- Published reviews with the reviewer's public profile (banned members are excluded by public_profiles).
create or replace view public.public_bookmaker_reviews as
  select r.id,
    r.bookmaker_slug,
    r.overall,
    r.ease_of_use,
    r.payouts,
    r.support,
    r.body,
    r.created_at,
    r.updated_at,
    p.username,
    p.display_name,
    p.avatar_url
  from public.bookmaker_reviews r
  join public.public_profiles p on p.id = r.user_id
  where r.status = 'published';

create or replace view public.bookmaker_review_stats as
  select r.bookmaker_slug,
    count(*)::int as review_count,
    round(avg(r.overall), 1) as avg_overall,
    round(avg(r.ease_of_use), 1) as avg_ease_of_use,
    round(avg(r.payouts), 1) as avg_payouts,
    round(avg(r.support), 1) as avg_support
  from public.bookmaker_reviews r
  join public.public_profiles p on p.id = r.user_id
  where r.status = 'published'
  group by r.bookmaker_slug;

grant select on public.public_bookmaker_reviews to anon, authenticated;
grant select on public.bookmaker_review_stats to anon, authenticated;

-- Privacy notice version for the new optional bookmaker reviews.
insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-28-bookmaker-reviews', now(), '/privacy')
on conflict (kind, version) do nothing;
