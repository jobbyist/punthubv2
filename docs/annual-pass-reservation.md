# Founding Annual Pass reservation flow

The Founding Annual Pass is reserved on Puntr without collecting payment on the website.

## Runtime configuration

Set these variables in Vercel for Production, Preview and Development as appropriate:

- `RESEND_API_KEY`: Resend API key used by the existing transactional email sender.
- `RESEND_FROM`: optional verified sender override; otherwise the shared Puntr sender/fallback is used.
- `ANNUAL_PASS_PAYFAST_URL`: the HTTPS hosted PayFast payment link for the R299 Annual Pass. The server accepts only HTTPS URLs on `payfast.co.za` or `payfast.io` hosts.
- `ANNUAL_PASS_LINK_SECRET`: a private random secret of at least 32 characters used to sign each member's expiring payment redirect.

Do not place PayFast credentials, Resend keys or Supabase service credentials in client-side/VITE variables or commit them to the repository.

## Reservation lifecycle

1. An authenticated, non-admin member selects **Reserve my Annual Pass**.
2. The server calls the existing `public.claim_annual_pass()` RPC. Its transaction creates or returns a 48-hour pending hold and enforces the 20-place allocation.
3. Resend emails the authenticated account email address with a signed Puntr payment link and the exact SAST hold expiry. The signed link is valid only while the matching database hold remains pending and unexpired.
4. The member completes R299 payment directly with PayFast. No payment form or payment details are collected by Puntr.
5. Unpaid pending holds stop counting toward availability after 48 hours. The member can retry while the offer remains open; an existing unexpired hold is reused and the payment email can be resent.

The PayFast URL is configured by the owner in the PayFast dashboard and supplied as a server-only environment variable. The email contains a signed Puntr redirect, not the underlying PayFast URL; the redirect checks the signature, member reservation and database expiry before forwarding to PayFast. This implementation does not create PayFast payment links, receive PayFast ITN callbacks, or automatically reconcile a payment against a member. Confirm received payments through the existing approved operations process before marking an Annual Pass paid. Do not describe a reservation as paid until payment has been verified.

## Database prerequisite\n\nConfirm that migration `20261106220000_annual_pass_payment_avatars.sql` has been applied to the active Supabase project. It adds the pending/paid state and 48-hour hold logic used by this flow.\n\n## Operational checks

- Verify the PayFast link is the correct R299 product/link before setting `ANNUAL_PASS_PAYFAST_URL`.
- Generate a high-entropy `ANNUAL_PASS_LINK_SECRET` (at least 32 characters) and store it only in Vercel server-side environment variables.
- Verify the sender domain in Resend and test the transactional email with a real controlled reservation.
- Test the 48-hour expiry and capacity behaviour against the active Supabase project before production use.
- If Resend fails, the reservation remains held until its database expiry; the member can use **Resend payment instructions**.
