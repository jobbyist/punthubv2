-- 15 Nov 2026: Puntr staff accounts (a confirmed email at @puntr.co.za) are admins automatically.
--
-- Safety: the email must be CONFIRMED (anyone can type an address at signup; only the mailbox owner can confirm it),
-- the domain must match exactly (no subdomains, one "@"), and a banned profile stays locked out because is_admin()
-- still checks is_banned and MFA. Nobody is demoted automatically; demotions stay an explicit admin action.
-- Every automatic grant writes an admin_actions row (admin_id is null: the system made the change).

create or replace function public.is_staff_email(p_email text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select p_email is not null
     and length(p_email) - length(replace(p_email, '@', '')) = 1
     and split_part(lower(btrim(p_email)), '@', 2) = 'puntr.co.za'
     and split_part(p_email, '@', 1) <> '';
$$;

-- Grants admin to one profile when its auth user is a confirmed staff address. Returns true when a grant happened.
create or replace function public.grant_staff_admin(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_email text;
  v_confirmed timestamptz;
  v_changed integer;
begin
  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = p_user;
  if v_confirmed is null or not public.is_staff_email(v_email) then
    return false;
  end if;
  update public.profiles set role = 'admin' where id = p_user and role <> 'admin';
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    insert into public.admin_actions (admin_id, action, target_user, target, detail)
    values (null, 'staff_auto_admin', p_user, 'profiles', jsonb_build_object('rule', 'confirmed @puntr.co.za email'));
  end if;
  return v_changed > 0;
end;
$$;
revoke all on function public.grant_staff_admin(uuid) from public, anon, authenticated;
grant execute on function public.grant_staff_admin(uuid) to service_role;

-- Profile created after the email was already confirmed. Runs after a_profiles_guard (which forces role = 'user' for
-- client sessions), so this assignment is the one that sticks.
create or replace function public.profiles_staff_admin_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if exists (
    select 1 from auth.users u
    where u.id = new.id and u.email_confirmed_at is not null and public.is_staff_email(u.email)
  ) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;
revoke all on function public.profiles_staff_admin_on_insert() from public, anon, authenticated;

drop trigger if exists c_profiles_staff_admin on public.profiles;
create trigger c_profiles_staff_admin
  before insert on public.profiles
  for each row execute function public.profiles_staff_admin_on_insert();

-- Profile already existed and the email gets confirmed (or changed to a confirmed staff address) later.
create or replace function public.auth_users_staff_admin()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  perform public.grant_staff_admin(new.id);
  return null;
end;
$$;
revoke all on function public.auth_users_staff_admin() from public, anon, authenticated;

drop trigger if exists staff_admin_sync on auth.users;
create trigger staff_admin_sync
  after insert or update of email, email_confirmed_at on auth.users
  for each row execute function public.auth_users_staff_admin();

-- Backfill existing staff accounts.
select public.grant_staff_admin(p.id)
from public.profiles p
where p.role <> 'admin';
