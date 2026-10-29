-- Launch notifications: reserved Founding spots for early-access sign-ups, launch email tracking,
-- admin notifications (Supabase Realtime) and the daily launch-notify cron.

-- ---------------------------------------------------------------------------
-- 1. Reserved Founding spots. A row in early_access with founding_reserved = true holds one of the 100
--    numbers for the person who signs up with that email address. The number is still assigned at sign-up,
--    in order, by the existing trigger.
-- ---------------------------------------------------------------------------
alter table public.early_access add column founding_reserved boolean not null default false;

-- Reserved spots whose owner has not created a profile yet.
create or replace function public.founding_spots_held()
returns integer
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select count(*)::integer
  from public.early_access e
  where e.founding_reserved
    and not exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(e.email)
    );
$$;

revoke all on function public.founding_spots_held() from public, anon, authenticated;
grant execute on function public.founding_spots_held() to service_role;

create or replace function public.profiles_assign_founding()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_n integer;
  v_free integer;
  v_reserved boolean;
begin
  if new.founding_number is not null then
    return new;
  end if;

  perform pg_advisory_xact_lock(7001001);

  select exists (
    select 1
    from auth.users u
    join public.early_access e on lower(e.email) = lower(u.email)
    where u.id = new.id and e.founding_reserved
  ) into v_reserved;

  select min(g), count(g) into v_n, v_free
  from generate_series(1, 100) g
  where not exists (select 1 from public.profiles p where p.founding_number = g);

  -- Everyone else may only take a number that is not held for an early-access sign-up.
  if v_n is not null and (v_reserved or v_free > public.founding_spots_held()) then
    new.founding_number := v_n;
  end if;
  return new;
end;
$$;

-- The public counter treats a held spot as unavailable.
create or replace function public.founding_spots_taken()
returns integer
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select (select count(*)::integer from public.profiles where founding_number is not null)
       + public.founding_spots_held();
$$;

-- ---------------------------------------------------------------------------
-- 2. launch_email_sends: one row per person per wave, written after every send, so a re-run never repeats.
-- ---------------------------------------------------------------------------
create table public.launch_email_sends (
  email text not null check (email = lower(email)),
  wave smallint not null check (wave between 1 and 3),
  status text not null default 'sent' check (status in ('sent', 'failed')),
  detail text,
  sent_at timestamptz not null default now(),
  primary key (email, wave)
);

alter table public.launch_email_sends enable row level security;
create policy launch_email_sends_admin_select on public.launch_email_sends
  for select to authenticated using (public.is_admin());
revoke all on public.launch_email_sends from anon, authenticated;
grant select on public.launch_email_sends to authenticated;
grant all on public.launch_email_sends to service_role;

-- ---------------------------------------------------------------------------
-- 3. admin_notifications, delivered to the admin panel with Supabase Realtime (RLS applies to Realtime).
-- ---------------------------------------------------------------------------
create table public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  title text not null,
  body text not null,
  sms_body text,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references public.profiles (id) on delete set null
);

alter table public.admin_notifications enable row level security;
create policy admin_notifications_admin_select on public.admin_notifications
  for select to authenticated using (public.is_admin());
create policy admin_notifications_admin_update on public.admin_notifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin() and (done_by is null or done_by = auth.uid()));

revoke all on public.admin_notifications from anon, authenticated;
grant select on public.admin_notifications to authenticated;
grant update (done_at, done_by) on public.admin_notifications to authenticated;
grant all on public.admin_notifications to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'admin_notifications'
     ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Who gets the launch emails. Not yet signed up (no profile for that email), not unsubscribed, no privacy
--    request. Waves 2 and 3 go only to people who ticked marketing on the early-access form.
-- ---------------------------------------------------------------------------
create or replace function public.launch_recipients(p_wave integer)
returns table (recipient_email text, recipient_name text)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select lower(e.email), e.name
  from public.early_access e
  where (p_wave = 1 or e.marketing_consent)
    and not exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(e.email)
    )
    and not exists (select 1 from public.waitlist_unsubscribes w where w.email = lower(e.email))
    and not exists (select 1 from public.privacy_requests r where lower(r.email) = lower(e.email))
    and not exists (
      select 1 from public.launch_email_sends s
      where s.email = lower(e.email) and s.wave = p_wave and s.status = 'sent'
    );
$$;

revoke all on function public.launch_recipients(integer) from public, anon, authenticated;
grant execute on function public.launch_recipients(integer) to service_role;

-- The admin panel list for the WhatsApp and SMS message (admins only).
create or replace function public.launch_audience()
returns table (
  email_address text,
  full_name text,
  phone_number text,
  marketing_ok boolean,
  reserved boolean,
  signed_up boolean,
  unsubscribed boolean,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select e.email, e.name, e.phone, e.marketing_consent, e.founding_reserved,
    exists (
      select 1 from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(e.email)
    ),
    exists (select 1 from public.waitlist_unsubscribes w where w.email = lower(e.email)),
    e.created_at
  from public.early_access e
  order by e.created_at;
end;
$$;

revoke all on function public.launch_audience() from public, anon;
grant execute on function public.launch_audience() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Daily at 06:00 UTC (08:00 in Johannesburg). The route does nothing unless today is a launch wave date
--    and LAUNCH_EMAILS_ENABLED is set on the server.
-- ---------------------------------------------------------------------------
select cron.schedule('launch-notify', '0 6 * * *', $$select public.invoke_cron('/api/cron/launch-notify')$$);
