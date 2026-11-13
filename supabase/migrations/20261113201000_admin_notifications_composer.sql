-- 13 Nov 2026: in-app notifications sent by hand from Admin > Notifications.
-- Adds an audience (everyone or Founding Members only) and the sending admin to notifications, and tightens the read
-- policy so a Founding-only notice is seen only by Founding Members (and admins).

alter table public.notifications
  add column if not exists audience text not null default 'all',
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

do $$
begin
  alter table public.notifications
    add constraint notifications_audience_check check (audience in ('all', 'founding'));
exception when duplicate_object then null;
end $$;

-- Helper: is the caller a Founding Member? (stable, definer so the policy does not depend on profiles RLS)
create or replace function public.is_founding_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and founding_number is not null
  );
$$;

revoke all on function public.is_founding_member() from public, anon;
grant execute on function public.is_founding_member() to authenticated;

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications
  for select to authenticated
  using (
    published_at <= now()
    and (recipient_id is null or recipient_id = auth.uid() or public.is_admin())
    and (audience = 'all' or recipient_id is not null or public.is_admin() or public.is_founding_member())
  );

create index if not exists notifications_created_by_idx on public.notifications (created_by)
  where created_by is not null;
