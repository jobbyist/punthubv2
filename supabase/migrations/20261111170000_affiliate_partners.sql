-- Affiliate partner registry (admin only) + activity log.
-- A bookmaker can only be 'live' once a provincial licence check is recorded (CLAUDE.md, Affiliates).
-- Tracking links are partner-issued and must never carry personal information.

create table public.affiliate_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  category text not null default 'bookmaker' check (category in ('bookmaker', 'retail', 'other')),
  status text not null default 'applied'
    check (status in ('applied', 'info_requested', 'approved', 'live', 'paused', 'declined', 'terminated')),
  network text,
  website_url text,
  dashboard_url text,
  tracking_link text,
  contact_name text,
  contact_email text,
  commission_summary text,
  min_payout_zar integer check (min_payout_zar is null or min_payout_zar >= 0),
  applied_at date,
  response_due_at date,
  responded_at date,
  approved_at date,
  went_live_at date,
  terms_accepted_at date,
  licence_checked_at date,
  licence_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint affiliate_bookmaker_live_needs_licence
    check (status <> 'live' or category <> 'bookmaker' or licence_checked_at is not null)
);

create table public.affiliate_partner_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.affiliate_partners (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'status', 'email', 'call', 'payment')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index affiliate_partner_events_partner_idx
  on public.affiliate_partner_events (partner_id, created_at desc);

alter table public.affiliate_partners enable row level security;
alter table public.affiliate_partner_events enable row level security;

create policy affiliate_partners_admin_select on public.affiliate_partners
  for select to authenticated using (public.is_admin());
create policy affiliate_partners_admin_insert on public.affiliate_partners
  for insert to authenticated with check (public.is_admin());
create policy affiliate_partners_admin_update on public.affiliate_partners
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy affiliate_events_admin_select on public.affiliate_partner_events
  for select to authenticated using (public.is_admin());
create policy affiliate_events_admin_insert on public.affiliate_partner_events
  for insert to authenticated with check (public.is_admin());

-- No DELETE for authenticated on purpose: partners and their activity log are a record.
-- Retire a partner with status 'terminated' or 'declined'; remove test rows as service_role only.
revoke all on public.affiliate_partners, public.affiliate_partner_events from anon, authenticated;
grant select, insert, update on public.affiliate_partners to authenticated;
grant select, insert on public.affiliate_partner_events to authenticated;
grant select, insert, update, delete on public.affiliate_partners, public.affiliate_partner_events
  to service_role;

create or replace function public.affiliate_partners_touch()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger affiliate_partners_touch
  before update on public.affiliate_partners
  for each row execute function public.affiliate_partners_touch();

-- Seed (11 Nov 2026). Hollywoodbets asked for a questionnaire within 7 working days of 11 Nov.
insert into public.affiliate_partners
  (slug, name, category, status, network, website_url, commission_summary, min_payout_zar,
   applied_at, response_due_at, notes)
values
  ('hollywoodbets', 'Hollywoodbets', 'bookmaker', 'info_requested', 'Direct (Hollywoodbets Affiliates)',
   'https://www.hollywoodbets.net',
   'Revenue share on Net Profit, lifetime: 20% (0-299 FTDs/month), 25% (300+). Negative months carry forward. Paid by the 15th working day; R500 minimum; invoice required.',
   500, '2026-11-11', '2026-11-20',
   'Questionnaire and T&Cs received 11 Nov. Reply due within 7 working days or the application is declined.'),
  ('yesplay', 'Yesplay.bet', 'bookmaker', 'approved', null, 'https://www.yesplay.bet',
   null, null, null, null, 'Confirmed by owner 11 Nov 2026. Terms and commission to be added.'),
  ('supabets', 'Supabets', 'bookmaker', 'applied', null, 'https://www.supabets.co.za',
   null, null, null, null, 'Application pending.'),
  ('playbet', 'Playbet', 'bookmaker', 'applied', null, null,
   null, null, null, null, 'Application pending.');

insert into public.affiliate_partner_events (partner_id, kind, body)
select id, 'status', 'Added to the registry (' || status || ').' from public.affiliate_partners;
