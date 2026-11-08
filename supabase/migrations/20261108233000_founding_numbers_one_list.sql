-- One Founding Member list. Early-access reservations and registered members share one numbering, in order of
-- sign-up. The admin account (support@puntr.co.za) is not a founding member and holds no number.
-- Result on 8 Nov 2026: 5 early-access members #1-#5, 6 registered members #6-#11, next number #12.

alter table public.early_access add column if not exists founding_number integer;
alter table public.early_access drop constraint if exists early_access_founding_range;
alter table public.early_access add constraint early_access_founding_range
  check (founding_number is null or (founding_number >= 1 and founding_number <= 100));
create unique index if not exists early_access_founding_number_key
  on public.early_access (founding_number) where founding_number is not null;

-- Renumber everyone once, by sign-up time.
do $$
begin
  create temp table _fm on commit drop as
  select 'e'::text as src, e.id::text as ref, e.created_at as at
  from public.early_access e
  where e.founding_reserved
    and not exists (
      select 1 from public.profiles p join auth.users u on u.id = p.id
      where lower(u.email) = lower(e.email) and p.founding_number is not null and p.role <> 'admin'
    )
  union all
  select 'p', p.id::text, p.created_at
  from public.profiles p
  where p.founding_number is not null and p.role <> 'admin';

  update public.profiles set founding_number = null where founding_number is not null;
  update public.early_access set founding_number = null where founding_number is not null;

  update public.early_access e set founding_number = r.n
  from (select ref, row_number() over (order by at, ref) as n from _fm) r
  where e.id::text = r.ref and exists (select 1 from _fm f where f.ref = r.ref and f.src = 'e');

  update public.profiles p set founding_number = r.n
  from (select ref, row_number() over (order by at, ref) as n from _fm) r
  where p.id::text = r.ref and exists (select 1 from _fm f where f.ref = r.ref and f.src = 'p');
end $$;

create or replace function public.next_founding_number()
returns integer language sql stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select greatest(
    coalesce((select max(founding_number) from public.profiles), 0),
    coalesce((select max(founding_number) from public.early_access), 0)
  ) + 1;
$$;
revoke all on function public.next_founding_number() from public, anon, authenticated;
grant execute on function public.next_founding_number() to service_role;

create or replace function public.claim_reserved_founding(p_user uuid)
returns integer language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
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

  select e.founding_number into v_n
  from auth.users u join public.early_access e on lower(e.email) = lower(u.email)
  where u.id = p_user and u.email_confirmed_at is not null and e.founding_reserved;
  if not found then
    return null;
  end if;

  if v_n is null then
    v_n := public.next_founding_number();
  end if;
  if v_n > 100 then
    return null;
  end if;

  update public.profiles set founding_number = v_n where id = p_user;
  return v_n;
end;
$$;

create or replace function public.profiles_assign_founding()
returns trigger language plpgsql security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_n integer;
  v_taken integer;
  v_reserved boolean := false;
  v_held integer;
begin
  if new.founding_number is not null or new.role = 'admin' then
    return new;
  end if;

  perform pg_advisory_xact_lock(7001001);

  select true, e.founding_number into v_reserved, v_held
  from auth.users u
  join public.early_access e on lower(e.email) = lower(u.email)
  where u.id = new.id and e.founding_reserved and u.email_confirmed_at is not null;
  v_reserved := coalesce(v_reserved, false);

  if v_reserved and v_held is not null then
    new.founding_number := v_held;
    return new;
  end if;

  v_n := public.next_founding_number();
  select count(founding_number) into v_taken from public.profiles;

  if v_n <= 100 and (v_reserved or (100 - v_taken) > public.founding_spots_held()) then
    new.founding_number := v_n;
  end if;
  return new;
end;
$$;

create or replace function public.admin_founding_members()
returns table(founding_number integer, first_name text, surname text, email text, phone text,
              signed_up_at timestamptz, status text)
language plpgsql stable security definer
set search_path to 'public', 'auth', 'pg_temp'
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
    select e.founding_number as fn, e.email as em, e.phone as ph, e.name as nm, e.created_at as at
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
