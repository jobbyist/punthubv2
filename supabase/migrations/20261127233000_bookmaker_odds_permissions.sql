-- Automated odds collection is opt-in only after both licence and data-use rights are verified.
create table if not exists public.bookmaker_odds_permissions (
  id uuid primary key default gen_random_uuid(),
  bookmaker_name text not null,
  domain text not null unique,
  affiliate_partner_slug text,
  affiliate_status text not null default 'none'
    check (affiliate_status in ('none', 'applied', 'approved')),
  affiliate_priority integer not null default 100,
  licence_reference_candidate text,
  licence_status text not null default 'pending_review'
    check (licence_status in ('pending_review', 'verified', 'rejected')),
  data_rights_status text not null default 'pending'
    check (data_rights_status in ('pending', 'approved', 'denied')),
  rights_evidence_url text,
  rights_reviewed_at timestamptz,
  rights_reviewed_by uuid references auth.users(id) on delete set null,
  automated_access_allowed boolean not null default false,
  enabled boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookmaker_odds_enable_requires_approval check (
    not enabled
    or (
      licence_status = 'verified'
      and data_rights_status = 'approved'
      and rights_evidence_url is not null
      and rights_reviewed_at is not null
      and automated_access_allowed
    )
  )
);

create index if not exists bookmaker_odds_permissions_enabled_priority
  on public.bookmaker_odds_permissions (enabled, affiliate_priority, bookmaker_name);

alter table public.bookmaker_odds_permissions enable row level security;
revoke all on public.bookmaker_odds_permissions from anon;
revoke all on public.bookmaker_odds_permissions from authenticated;
grant select, update on public.bookmaker_odds_permissions to authenticated;
grant all on public.bookmaker_odds_permissions to service_role;

drop policy if exists bookmaker_odds_permissions_admin_select on public.bookmaker_odds_permissions;
create policy bookmaker_odds_permissions_admin_select
  on public.bookmaker_odds_permissions for select to authenticated
  using (public.is_admin());

drop policy if exists bookmaker_odds_permissions_admin_update on public.bookmaker_odds_permissions;
create policy bookmaker_odds_permissions_admin_update
  on public.bookmaker_odds_permissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.bookmaker_odds_permissions (
  bookmaker_name, domain, affiliate_partner_slug, affiliate_status, affiliate_priority,
  licence_reference_candidate, licence_status, data_rights_status, automated_access_allowed,
  enabled, notes
) values
  ('Hollywoodbets', 'hollywoodbets.net', 'hollywoodbets', 'approved', 1, '10110547-021',
   'pending_review', 'pending', false, false,
   'Top affiliate priority. Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('SupaBets', 'supabets.co.za', 'supabets', 'approved', 2, 'FSGLA/BML/002',
   'pending_review', 'pending', false, false,
   'Approved affiliate partner. Candidate register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('YesPlay', 'yesplay.bet', 'yesplay', 'approved', 3, '10180204-013',
   'pending_review', 'pending', false, false,
   'Approved affiliate partner. Candidate register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('Easybet', 'easybet.co.za', 'easybet', 'applied', 4, '10191733-004',
   'pending_review', 'pending', false, false,
   'Affiliate application in progress. Candidate register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('Playbet', 'playbet.co.za', 'playbet', 'applied', 5, null,
   'pending_review', 'pending', false, false,
   'Affiliate application in progress. Domain and licence-holder match require verification; no automated collection until written rights are documented.'),
  ('Betway', 'betway.co.za', null, 'none', 10, '10181496-012',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('Sportingbet SA', 'sportingbet.co.za', null, 'none', 11, '10125193-019',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('G-Bets', 'gbets.co.za', null, 'none', 12, '10179096-014',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('Playabets', 'playabets.co.za', null, 'none', 13, '10141335-018',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('World Sports Betting', 'wsb.co.za', null, 'none', 14, '10181495-013',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('10Bet', '10bet.co.za', null, 'none', 15, '9-2-1-09661',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('BetXchange', 'betxchange.co.za', null, 'none', 16, '10180408-012',
   'pending_review', 'pending', false, false,
   'Candidate NGB register reference only; verify current licence, domain mapping, written odds-feed rights and reuse terms before enabling.'),
  ('LottoStar', 'lottostar.co.za', null, 'none', 17, null,
   'pending_review', 'pending', false, false,
   'Candidate domain; confirm current operator, licence-holder and domain mapping, then obtain written odds-feed rights before enabling.')
on conflict (domain) do nothing;
