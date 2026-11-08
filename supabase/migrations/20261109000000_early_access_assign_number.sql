-- A new early-access sign-up that reserves a Founding spot is numbered straight away, in sign-up order, from the
-- same sequence as registered members. Existing rows were numbered in 20261108233000.
create or replace function public.early_access_assign_founding()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_n integer;
begin
  if not new.founding_reserved or new.founding_number is not null then
    return new;
  end if;
  perform pg_advisory_xact_lock(7001001);
  v_n := public.next_founding_number();
  if v_n <= 100 then
    new.founding_number := v_n;
  end if;
  return new;
end;
$$;

drop trigger if exists early_access_assign_founding on public.early_access;
create trigger early_access_assign_founding
  before insert or update of founding_reserved on public.early_access
  for each row execute function public.early_access_assign_founding();
