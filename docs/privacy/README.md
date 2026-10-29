# Privacy docs (POPIA)

Drafts for attorney review. Open TODOs:

- Name the Information Officer and register with the Information Regulator.
- Create privacy@puntr.co.za and decide who monitors it (30-day target is our own, not statutory).
- Attorney review of retention periods marked [attorney review] in /privacy.
- Email notification on new rows in `privacy_requests` (currently admins read the table; no email is sent).
- `/account/privacy` (export, correct, delete) arrives with accounts in P6; the RPCs `export_my_data` and `anonymise_account` already exist.
- Retire the old Lovable Supabase project and the FormBackend processor.
- App-level tests (no test runner installed yet).

## Processors
Supabase (EU, eu-west-1), Vercel, email provider (TBD). Cross-border: POPIA s72.

## Data map
early_access (waitlist), profiles, predictions (public, permanent, pseudonymous after deletion), settlement_events, consent_records, privacy_requests, breach_register.

## Breach runbook
1. Contain. 2. Record in `breach_register`. 3. Tell the Information Regulator and affected people as soon as reasonably possible (internal target 72 hours). 4. Review.

## Affiliate data rules
No personal information in partner links. Tracking only with consent. No ads for non-18+ or users on a break.
