# Founding Annual Pass reservation flow

The Founding Annual Pass is reserved on Puntr without collecting payment on the website.

## Runtime configuration

Set these variables in Vercel for Production, Preview and Development as appropriate:

- `RESEND_API_KEY`: Resend API key used by the existing transactional email sender.
- `RESEND_FROM`: optional verified sender override; otherwise the shared Puntr sender/fallback is used.
- `ANNUAL_PASS_PAYFAST_URL`: the HTTPS hosted PayFast payment link for the R299 Annual Pass. The server accepts only HTTPS URLs on `payfast.co.za` or `payfast.io` hosts.

Do not place PayFast credentials, Resend keys or Supabase service credentials in client-side/VITE variables or commit them to the repository.

## Reservation lifecycle

1. An authenticated, non-admin member selects **Reserve my Annual Pass**.
2. The server calls the existing `public.claim_annual_pass()` RPC. Its transaction creates or returns a 48-hour pending hold and enforces the 20-place allocation.
3. Resend emails the account's verified-auth email address with the configured PayFast hosted link and the exact SAST hold expiry.
4. The member completes R299 payment directly with PayFast. No payment form or payment details are collected by Puntr.
5. Unpaid pending holds stop counting toward availability after 48 hours. The member can retry while the offer remains open; an existing unexpired hold is reused and the payment email can be resent.

The PayFast URL is configured by the owner in the PayFast dashboard and supplied as an environment variable. This implementation does not create PayFast payment links, receive PayFast ITN callbacks, or automatically reconcile a payment against a member. Confirm received payments through the existing approved operations process before marking an Annual Pass paid. Do not describe a reservation as paid until payment has been verified.

## Operational checks

- Verify the PayFast link is the correct R299 product/link before setting `ANNUAL_PASS_PAYFAST_URL`.
- Verify the sender domain in Resend and test the transactional email with a real controlled reservation.
- Test the 48-hour expiry and capacity behaviour against the active Supabase project before production use.
- If Resend fails, the reservation remains held until its database expiry; the member can use **Resend payment instructions**.
