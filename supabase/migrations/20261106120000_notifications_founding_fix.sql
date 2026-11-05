-- 6 Nov 2026: (1) in-app notification centre tables for the header bell; (2) Founding Member numbering and counter fix.
-- RLS is on for every table.

-- ---------------------------------------------------------------------------
-- 1. Notifications: one row per team update; read state per member.
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 140),
  message text not null check (char_length(message) between 1 and 400),
  category text,
  target_url text,
  newsroom_article_id uuid unique,
  visibility text not null default 'members' check (visibility in ('members', 'public')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_id uuid not null references public.notifications (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, notification_id)
);

create index if not exists notifications_published_idx on public.notifications (published_at desc);
create index if not exists user_notifications_user_idx on public.user_notifications (user_id);

alter table public.notifications enable row level security;
alter table public.user_notifications enable row level security;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (published_at <= now());

drop policy if exists notifications_admin_write on public.notifications;
create policy notifications_admin_write on public.notifications
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists user_notifications_select_own on public.user_notifications;
create policy user_notifications_select_own on public.user_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_notifications_insert_own on public.user_notifications;
create policy user_notifications_insert_own on public.user_notifications
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_notifications_update_own on public.user_notifications;
create policy user_notifications_update_own on public.user_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime for the bell (skip quietly if already added).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Founding numbers.
-- Cause of "#3 when 6 have signed up": the assigner gave the LOWEST unused number (min free), so a gap left by a
-- deleted/cleared profile or an admin test account was refilled, and the public counter added held early-access
-- emails and counted the admin account. New rule: numbers are never reused (next = highest ever + 1), admin
-- accounts never take a number, and the counter is the live count of members who hold a number.
-- ---------------------------------------------------------------------------
create or replace function public.profiles_assign_founding()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_n integer;
  v_taken integer;
  v_reserved boolean;
begin
  if new.founding_number is not null or new.role = 'admin' then
    return new;
  end if;

  perform pg_advisory_xact_lock(7001001);

  select exists (
    select 1
    from auth.users u
    join public.early_access e on lower(e.email) = lower(u.email)
    where u.id = new.id and e.founding_reserved and u.email_confirmed_at is not null
  ) into v_reserved;

  select coalesce(max(founding_number), 0) + 1, count(founding_number)
    into v_n, v_taken
  from public.profiles;

  if v_n <= 100 and (v_reserved or (100 - v_taken) > public.founding_spots_held()) then
    new.founding_number := v_n;
  end if;
  return new;
end;
$$;

create or replace function public.claim_reserved_founding(p_user uuid)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_n integer;
begin
  perform pg_advisory_xact_lock(7001001);

  if not exists (
    select 1 from public.profiles where id = p_user and founding_number is null and role <> 'admin'
  ) then
    return null;
  end if;
  if not exists (
    select 1
    from auth.users u join public.early_access e on lower(e.email) = lower(u.email)
    where u.id = p_user and u.email_confirmed_at is not null and e.founding_reserved
  ) then
    return null;
  end if;

  select coalesce(max(founding_number), 0) + 1 into v_n from public.profiles;
  if v_n > 100 then
    return null;
  end if;

  update public.profiles set founding_number = v_n where id = p_user;
  return v_n;
end;
$$;
revoke all on function public.claim_reserved_founding(uuid) from public, anon, authenticated;

-- Public counter = live count of Founding Members (admin accounts hold no number).
create or replace function public.founding_spots_taken()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer from public.profiles where founding_number is not null and role <> 'admin';
$$;
revoke all on function public.founding_spots_taken() from public;
grant execute on function public.founding_spots_taken() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. One-off repair of EXISTING numbers. Run this part only after checking the diagnostic below.
--    DIAGNOSTIC (read-only, run first):
--      select username, role, founding_number, created_at from public.profiles
--      order by created_at;
--    If the numbers should simply follow sign-up order, un-comment and run the block below once.
--    Note: members were already told their number by email/UI, so tell them if theirs changes.
-- ---------------------------------------------------------------------------
-- with ordered as (
--   select id, row_number() over (order by created_at) as n
--   from public.profiles where role <> 'admin' and founding_number is not null
-- ), cleared as (
--   update public.profiles set founding_number = null
--   where id in (select id from ordered) returning id
-- )
-- update public.profiles p set founding_number = o.n
-- from ordered o where p.id = o.id;
