-- A directory landing page is a discovery reference, not per-operator licence evidence.
update public.bookmaker_odds_permissions
set licence_evidence_url = null
where licence_evidence_url = 'https://www.ngb.org.za/verified-operators/'
  and licence_status <> 'verified';
