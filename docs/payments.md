# Payments: PAYG credit packs (PayFast)

Status: built, **off**. Nothing can be bought until all three are true: PayFast variables set, `app_settings.payments_enabled = 'true'` (Admin > System), and the legal copy below is live.

## How it works
1. Member opens `/wallet`, picks a pack (`PACKS` in `src/lib/economics.ts`: R25/25, R60/65, R120/140).
2. `startCreditPurchase` (members only, not admins) writes a `payment_orders` row (pending) and returns a signed PayFast form. No personal information is sent to PayFast: only the order id, amount and item name.
3. PayFast calls `POST /api/payfast/itn`. Credits are granted only if the source address is PayFast's, the signature matches, PayFast's own `/eng/query/validate` answers VALID, and `grant_credit_purchase()` finds the amount equal to the order. It writes one `credit_ledger` purchase row keyed on `pf_payment_id`; a repeat ITN grants nothing.
4. `/wallet` shows the new balance.

## Environment (Vercel, Production)
`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, optional `PAYFAST_SANDBOX=true`, optional `SITE_URL` (default https://puntr.co.za). In the PayFast dashboard the passphrase must match and ITN must be enabled.

## Go-live checklist
- [ ] Sandbox test: pay a Starter pack, see credits once; replay the ITN, see no second grant; pay the wrong amount, see none.
- [ ] Legal copy (see `docs/legal-changelog.md`, 14 Nov payments entry): `/terms`, `/privacy`, `/refunds`, `/pricing` no longer say "planned"; PayFast named as payment processor.
- [ ] Owner switches `payments_enabled` to true in Admin > System.
- [ ] Puntr Pro (recurring) is a separate step; it is not part of this change.

## Economics
`docs/PAYG_ECONOMICS.md`. The USD/ZAR rate used there is `app_settings.usd_zar`, editable in Admin > System.
