-- Add an explicit reconciliation ledger for score-driven standings updates.
alter table public.standings_applied
  add column if not exists season text,
  add column if not exists home_team text,
  add column if not exists away_team text,
  add column if not exists applied_home_score integer,
  add column if not exists applied_away_score integer,
  add column if not exists needs_refresh boolean not null default false;

-- Legacy rows predate score snapshots and cannot safely be reversed from inferred values.
update public.standings_applied
set needs_refresh = true
where applied_home_score is null or applied_away_score is null;

comment on column public.standings_applied.needs_refresh is
  'True when a full standings refresh is required before this legacy fixture can be reconciled.';
