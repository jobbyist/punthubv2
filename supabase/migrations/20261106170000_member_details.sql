-- Optional personal details a member can save during or after sign-up. Kept in its own table (not profiles)
-- so it can never reach public_profiles. Only the member and admins can read it.
create table if not exists public.member_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  first_name text check (char_length(first_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  phone text check (phone ~ '^\+?[0-9 ]{9,16}$'),
  date_of_birth date,
  province text check (province in ('Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape','Outside South Africa')),
  updated_at timestamptz not null default now()
);
create or replace function public.member_details_before_write() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.date_of_birth is not null and new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'must be 18 or older' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists member_details_before_write on public.member_details;
create trigger member_details_before_write before insert or update on public.member_details
  for each row execute function public.member_details_before_write();
alter table public.member_details enable row level security;
drop policy if exists member_details_select on public.member_details;
create policy member_details_select on public.member_details for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists member_details_insert on public.member_details;
create policy member_details_insert on public.member_details for insert to authenticated with check (user_id = auth.uid());
drop policy if exists member_details_update on public.member_details;
create policy member_details_update on public.member_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists member_details_delete on public.member_details;
create policy member_details_delete on public.member_details for delete to authenticated using (user_id = auth.uid());

-- Admin founding list gains the saved details.
create or replace function public.admin_member_details()
returns table (user_id uuid, first_name text, last_name text, phone text, date_of_birth date, province text)
language sql stable security definer set search_path = public, pg_temp as $$
  select d.user_id, d.first_name, d.last_name, d.phone, d.date_of_birth, d.province
  from public.member_details d where public.is_admin();
$$;
revoke all on function public.admin_member_details() from public, anon;
grant execute on function public.admin_member_details() to authenticated;
