# Payments: PayFast by Network

Status: PayFast checkout is the current payment route. The production `app_settings.payments_enabled` flag was verified as `true` on 23 November 2026. A checkout still requires valid PayFast environment variables and a successful provider response. No live test transaction was performed during this code review. Ozow is planned but has no integration and is not an available payment method.

## How it works
1. Member opens `/wallet`, picks a pack (`PACKS` in `src/lib/economics.ts`: R25/25, R60/65, R120/140).
2. `startCreditPurchase` (members only, not admins) writes a `payment_orders` row (pending) and returns a signed PayFast form. No personal information is sent to PayFast: only the order id, amount and item name.
3. PayFast by Network calls `POST /api/payfast/itn`. Credits are granted only if the source address is PayFast's, the signature matches, PayFast's own `/eng/query/validate` answers VALID, and `grant_credit_purchase()` finds the amount equal to the order. It writes one `credit_ledger` purchase row keyed on `pf_payment_id`; a repeat ITN grants nothing.
4. `/wallet` shows the new balance.

## Security notes
- Source-address check: relies on `x-real-ip` / `x-forwarded-for`, which Vercel's edge overwrites with the real connecting address. If Puntr ever moves behind another proxy or CDN, that proxy must overwrite both headers, or the check must change. The signature (with passphrase), PayFast's `/eng/query/validate` postback and the exact amount match still protect the grant on their own.
- `payments_enabled()` is executable by the service role only (migration `20261114210000`).
- An ITN that cannot be matched to an order or whose amount differs returns 500, so it is logged and PayFast retries. A COMPLETE after an earlier FAILED/CANCELLED for the same order is still credited, because the buyer can retry on PayFast's page and that payment is real.

## Environment (Vercel, Production)
`PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, optional `PAYFAST_SANDBOX=true`, optional `SITE_URL` (default https://puntr.co.za). In the PayFast dashboard the passphrase must match and ITN must be enabled.

## Go-live checklist
- [ ] Sandbox test: pay a Starter pack, see credits once; replay the ITN, see no second grant; pay the wrong amount, see none.
- [x] Legal copy updated in Terms r24, Privacy r22 and Refunds on 23 Nov 2026. PayFast by Network is named as the current processor; Ozow is explicitly marked planned/not integrated.
- [ ] Owner switches `payments_enabled` to true in Admin > System.
- [ ] Puntr Pro sandbox test: subscribe, see Pro on `/wallet` with a renewal date; replay the ITN (no second month);
      cancel in `/wallet` (PayFast shows it cancelled, Pro stays to the period end); a FAILED ITN marks it past due.

## Puntr Pro (monthly subscription)
1. `startProSubscription` writes a `pro_subscriptions` row (pending) and returns a signed PayFast subscription form
   (`subscription_type=1`, `frequency=3` monthly, `cycles=0` until cancelled, `custom_str1=pro`).
2. Every renewal sends an ITN to the same `/api/payfast/itn`. `custom_str1=pro` routes it to `grant_pro_payment()`:
   one month per `pf_payment_id`, exact amount, entitlement `pro` extended to period end + 3 days.
3. FAILED -> `past_due`; CANCELLED -> `cancelled`. Access runs out on its own; `pro-lapse` (03:20 SAST) marks
   subscriptions `ended` and returns the profile to free.
4. Cancel: `/wallet` > Cancel Pro calls PayFast `PUT /subscriptions/{token}/cancel` (signed headers).
5. Fair use: `spend_credits()` counts included Pro actions in `pro_usage` (90/month, 15/day by default:
   `pro_cap_monthly`, `pro_cap_daily`, `pro_cap_annual_pass` in `app_settings`). Past the cap the action is charged in
   credits (`fair_use_charged`), or refused with `fair_use_reached` when the member has none.
6. Annual Pass: every paid claim gets a `pro` entitlement from 1 Dec 2026 to 1 Dec 2027 (trigger on
   `annual_pass_claims`). Offline payments must be recorded as paid claims to get it.

## Economics
`docs/PAYG_ECONOMICS.md`. The USD/ZAR rate used there is `app_settings.usd_zar`, editable in Admin > System.


## Payment providers

- **Current:** PayFast by Network. The platform receives order/subscription identifiers, payment references, amount, status and relevant dates. Full card and bank credentials are handled by PayFast's checkout and are not stored by Puntr.
- **Planned:** Ozow. It is not integrated, is not available at checkout and does not currently receive Puntr payment or customer data. Update the Terms, Privacy Notice, Refunds page and this document before enabling it.
- Legal pages: `/terms`, `/privacy`, `/refunds`. Notice versions r24/r22 are recorded in migration `20261123010000_terms_r24_privacy_r22_payment_processing.sql`.
