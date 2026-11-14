-- Favourite sports, competitions and teams (batch 1, Task 1, 14 Nov 2026). Optional; used only to personalise the
-- member's own home Matchday card and fixture shortcuts. Not shown to anyone else. Privacy r17.
create table if not exists public.member_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  sports text[] not null default '{}' check (
    cardinality(sports) <= 8
    and sports <@ array['soccer', 'rugby', 'basketball', 'tennis', 'cricket', 'combat', 'athletics', 'horse-racing']::text[]),
  competitions text[] not null default '{}' check (cardinality(competitions) <= 10),
  teams text[] not null default '{}' check (cardinality(teams) <= 10),
  updated_at timestamptz not null default now()
);

create or replace function public.member_preferences_before_write()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if exists (select 1 from unnest(new.competitions) c where c !~ '^[a-z0-9-]{2,40}$') then
    raise exception 'invalid_competition' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(new.teams) x where char_length(btrim(x)) not between 2 and 60) then
    raise exception 'invalid_team' using errcode = '22023';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create or replace trigger member_preferences_before_write before insert or update on public.member_preferences
  for each row execute function public.member_preferences_before_write();

alter table public.member_preferences enable row level security;
drop policy if exists member_preferences_own on public.member_preferences;
create policy member_preferences_own on public.member_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.member_preferences from anon, authenticated;
grant select, insert, update, delete on public.member_preferences to authenticated;
grant select, insert, update, delete on public.member_preferences to service_role;

-- Account deletion keeps the anonymised profile row, so the cascade never fires: delete preferences explicitly.
create or replace function public.preferences_on_anonymise()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.username::text like 'deleted-%' and old.username::text not like 'deleted-%' then
    delete from public.member_preferences where user_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.preferences_on_anonymise() from public, anon, authenticated;
create or replace trigger preferences_on_anonymise after update of username on public.profiles
  for each row execute function public.preferences_on_anonymise();

insert into public.notice_versions (kind, version, effective_at, url)
values ('privacy', '2026-11-14-r17', now(), '/privacy')
on conflict (kind, version) do nothing;
