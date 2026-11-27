-- Expand the bookmaker register into an auditable licence and data-rights workspace.
alter table public.bookmaker_odds_permissions alter column domain drop not null;
alter table public.bookmaker_odds_permissions
  add column if not exists licence_evidence_url text,
  add column if not exists licence_verified_at timestamptz,
  add column if not exists licence_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists collection_approved boolean not null default false,
  add column if not exists storage_approved boolean not null default false,
  add column if not exists display_approved boolean not null default false,
  add column if not exists attribution_approved boolean not null default false,
  add column if not exists retention_approved boolean not null default false,
  add column if not exists redistribution_approved boolean not null default false;
create unique index if not exists bookmaker_odds_permissions_name_lower_uidx
  on public.bookmaker_odds_permissions (lower(bookmaker_name));

-- NGB Verified Operators directory cross-reference (snapshot: 20 November 2026).
-- Website domains remain NULL where the register or source review did not establish an exact domain.
insert into public.bookmaker_odds_permissions
  (bookmaker_name, domain, licence_reference_candidate, affiliate_priority, notes)
values
 ('10Bet', null, '9-2-1-09661', 15, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Apex Bets', null, '10194002-002', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('BET.co.za', null, '10145732-017 (NGB register)', 30, 'NGB/operator licence reference discrepancy previously recorded; obtain regulator confirmation before marking verified.'),
 ('BetJets', null, '10091157-111', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Betway', null, '10181496-012', 10, 'NGB directory candidate. Confirm exact trading entity and domain mapping.'),
 ('BetXchange', null, '10180408-012', 16, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Boss Bets', null, '10179821-013', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Bravobet', null, '10010857-030', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Betshezi', null, '10191121-004', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('BetOlimp', null, '10138042-020', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Easybet', null, '10191733-004', 4, 'Affiliate application in progress; NGB directory candidate. Confirm exact operator/domain mapping.'),
 ('Fanbets', null, '10191420-004', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('G-Bets', null, '10179096-014', 12, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Gameland', null, '10195520-001', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('GV Bet', null, '10192366-003', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Hollywoodbets', null, '10110547-021', 1, 'Affiliate approved. Priority outreach. Affiliate approval is not odds-data permission. Confirm current licence and exact domain.'),
 ('Interbet', null, '10083472-023', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Jabula Bets', null, '10190511-005', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('King Bets', null, '10181847-012', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Lottoland', null, '10185705-009', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Lulabets', null, '10190073-005', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Lucky Fish', null, '10192071-003', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Lotto247', null, '10189543-006', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('MBET', null, '10189800-005', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Neo.Bet', null, '10195102-001', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('OneBet', null, '10191934-003', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Pantherbet', null, '10194613-001', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Play.co.za', null, '10172287-015', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Playabets', null, '10141335-018', 13, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('PlayTsogo', null, '10190075-005', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Sportland', null, '10195524-001', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('SportPesa', null, '10183090-010', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Sportingbet SA', null, '10125193-019', 11, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('SportyBet', null, '9-2-1-09799', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('SunBet', null, '10138713-018', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('SupaBets', null, 'FSGLA/BML/002', 2, 'Affiliate approved. Confirm licence-holder, current status and domain mapping with Free State regulator.'),
 ('SuperSportBet', null, '10191097-004', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('SwiftySports', null, '10193252-002', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('Topbet SA', null, '10190445-005', 30, 'NGB directory candidate. Check differing licence suffixes across NGB/operator/regulator sources before verification.'),
 ('Vegas Bets', null, '10010453-029', 30, 'NGB directory candidate. Confirm current operator/domain mapping with the named provincial regulator.'),
 ('World Sports Betting', null, '10181495-013', 14, 'NGB directory candidate. Confirm current operator/domain mapping.'),
 ('YesPlay', null, '10180204-013', 3, 'Affiliate approved. Confirm current licence and domain mapping.'),
 ('ZARbet', null, '10010581-030', 30, 'NGB directory candidate. Check current licence suffix against operator footer and regulator.')
on conflict (lower(bookmaker_name)) do update
set licence_reference_candidate = coalesce(public.bookmaker_odds_permissions.licence_reference_candidate, excluded.licence_reference_candidate),
    notes = coalesce(public.bookmaker_odds_permissions.notes, excluded.notes);
