-- Email + password sign-up without a confirmation step, with email confirmation and two-factor sign-in
-- encouraged afterwards.
--
-- 1. An unconfirmed email can never take a Founding spot held for an early-access person. The spot stays held
--    until its owner confirms the email, then claim_reserved_founding() assigns the number.
-- 2. Once a member turns on two-factor sign-in, the database itself refuses their writes unless the session
--    has passed the second factor (aal2). Members without a factor are unaffected.

-- ---------------------------------------------------------------------------
-- Two-factor enforcement
-- ---------------------------------------------------------------------------
create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is null
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1 from auth.mfa_factors f
        where f.user_id = auth.uid() and f.status = 'verified'
      );
$$;

revoke all on function public.mfa_ok() from public;
grant execute on function public.mfa_ok() to anon, authenticated, service_role;

-- Posting a pick needs the second factor. A trigger keeps the hash-chain function untouched.
create or replace function public.predictions_require_mfa()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.mfa_ok() then
    raise exception 'mfa_required' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger a_predictions_mfa
  before insert on public.predictions
  for each row execute function public.predictions_require_mfa();

-- Restrictive policies are ANDed with the existing ones: profile changes and reports need the second factor too.
create policy profiles_mfa on public.profiles
  as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

create policy reports_mfa on public.reports
  as restrictive for all to authenticated
  using (public.mfa_ok()) with check (public.mfa_ok());

-- ---------------------------------------------------------------------------
-- Founding spots held for early-access people now need a CONFIRMED email
-- ---------------------------------------------------------------------------
-- Held = reserved early-access emails that do not yet own a Founding number.
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
      select 1
      from auth.users u join public.profiles p on p.id = u.id
      where lower(u.email) = lower(e.email) and p.founding_number is not null
    );
$$;

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
    where u.id = new.id and e.founding_reserved and u.email_confirmed_at is not null
  ) into v_reserved;

  select min(g), count(g) into v_n, v_free
  from generate_series(1, 100) g
  where not exists (select 1 from public.profiles p where p.founding_number = g);

  if v_n is not null and (v_reserved or v_free > public.founding_spots_held()) then
    new.founding_number := v_n;
  end if;
  return new;
end;
$$;

-- Gives a member with a confirmed, reserved email the lowest free number. Service role only: the server
-- function calls it after checking the signed-in user. Returns the number, or null when nothing applies.
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

  if not exists (select 1 from public.profiles where id = p_user and founding_number is null) then
    return null;
  end if;
  if not exists (
    select 1
    from auth.users u join public.early_access e on lower(e.email) = lower(u.email)
    where u.id = p_user and u.email_confirmed_at is not null and e.founding_reserved
  ) then
    return null;
  end if;

  select min(g) into v_n
  from generate_series(1, 100) g
  where not exists (select 1 from public.profiles p where p.founding_number = g);
  if v_n is null then
    return null;
  end if;

  update public.profiles set founding_number = v_n where id = p_user;
  return v_n;
end;
$$;

revoke all on function public.claim_reserved_founding(uuid) from public, anon, authenticated;
grant execute on function public.claim_reserved_founding(uuid) to service_role;
