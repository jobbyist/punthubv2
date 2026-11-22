# Privacy docs (POPIA)

Drafts for attorney review. Open TODOs:

- Name the Information Officer and register with the Information Regulator.
- Create privacy@puntr.co.za and decide who monitors it (30-day target is our own, not statutory).
- Attorney review of retention periods marked [attorney review] in /privacy.
- Email notification on new rows in `privacy_requests` (currently admins read the table; no email is sent).
- `/account/privacy` shipped in P6: export (`export_my_data`), marketing choices (`record_consent`), delete (`anonymise_account` + auth admin delete via `deleteMyAccount`). Correction goes through `/privacy/request`. Deletion needs `SUPABASE_SERVICE_ROLE_KEY` in Vercel.
- Retire the old Lovable Supabase project and the FormBackend processor.
- Keep Vitest coverage for public form submissions, payment handling and privacy flows current.

## Processors

Supabase (EU, eu-west-1), Vercel, Resend (transactional email, including Brand Ambassador applications to partners@puntr.co.za), and PayFast by Network (South African payment processor). Ozow is planned but not integrated and does not currently receive personal or payment data through Puntr. Cross-border: POPIA s72.

## Data map

early_access (waitlist), profiles, member_details (optional name, phone, date of birth, province; deleted on account deletion), survey_responses (kept pseudonymised after deletion), predictions (public, permanent, pseudonymous after deletion), settlement_events, consent_records, privacy_requests, breach_register, form_submissions (support, privacy, survey, report and Brand Ambassador applications), payment_orders (PayFast credit pack orders), pro_subscriptions and pro_payments (PayFast subscription records). Ambassador applications contain applicant contact details, location, role, platform/profile links, audience size if supplied, content examples and application answers; they are emailed to partners@puntr.co.za.

## Breach runbook

1. Contain. 2. Record in `breach_register`. 3. Tell the Information Regulator and affected people as soon as reasonably possible (internal target 72 hours). 4. Review.

## Affiliate data rules

No personal information in partner links. Tracking only with consent. No ads for non-18+ or users on a break.
