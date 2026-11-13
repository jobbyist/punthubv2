-- Logos/Branding: one row per logo the admin manages (footer, About, Bookmaker Directory, homepage, Puntr brand).
-- Public may read only rows that are active AND have an uploaded image; everything else is admin-only (server functions,
-- service role). Regulator and partner logos can imply endorsement, so every row starts inactive.
create table if not exists public.brand_logos (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  kind text not null check (kind in ('regulator', 'payments', 'partner', 'brand')),
  placements text[] not null default '{}'
    check (placements <@ array['footer', 'about', 'bookmakers', 'homepage', 'brand']::text[]),
  image_url text,
  link_url text check (link_url is null or link_url ~ '^https://'),
  active boolean not null default false,
  sort_order integer not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.brand_logos enable row level security;

drop policy if exists brand_logos_public_read on public.brand_logos;
create policy brand_logos_public_read on public.brand_logos for select to anon, authenticated
  using (active and image_url is not null);

revoke all on public.brand_logos from anon, authenticated;
grant select on public.brand_logos to anon, authenticated;
grant select, insert, update, delete on public.brand_logos to service_role;

create or replace function public.brand_logos_touch() returns trigger language plpgsql
set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists brand_logos_touch on public.brand_logos;
create trigger brand_logos_touch before update on public.brand_logos
  for each row execute function public.brand_logos_touch();

insert into public.brand_logos (code, name, kind, placements, sort_order) values
  ('wcgrb', 'Western Cape Gambling and Racing Board', 'regulator', '{footer,about}', 10),
  ('nlc', 'National Lotteries Commission', 'regulator', '{footer,about}', 20),
  ('ngb', 'National Gambling Board of South Africa', 'regulator', '{footer,about}', 30),
  ('sargf', 'South African Responsible Gambling Foundation', 'regulator', '{footer,about}', 40),
  ('payfast', 'PayFast by Network', 'payments', '{footer,about}', 50),
  ('ozow', 'Ozow', 'payments', '{footer,about}', 60),
  ('hollywoodbets', 'Hollywoodbets', 'partner', '{footer,bookmakers}', 70),
  ('1voucher', '1Voucher', 'partner', '{footer,about}', 80),
  ('ott', 'OTT', 'partner', '{footer,about}', 90),
  ('admarula', 'AdMarula', 'partner', '{footer,about}', 100),
  ('track360', 'Track360', 'partner', '{footer,about}', 110),
  ('puntr-logo', 'Puntr logo (light)', 'brand', '{brand}', 200),
  ('puntr-logo-dark', 'Puntr logo (dark)', 'brand', '{brand}', 210),
  ('puntr-icon', 'Puntr icon', 'brand', '{brand}', 220)
on conflict (code) do nothing;
