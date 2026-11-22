## 22 November 2026 â€” PWA authentication and Web Push foundation

- Preserve the originating internal route through password, OTP, Google OAuth, email confirmation, onboarding, MFA and password recovery.
- Add the PKCE OAuth callback route and reject unsafe external/auth/admin return destinations.
- Replace the Predictions guest-gate signup iframe with first-party navigation.
- Add opt-in Web Push subscriptions, account-wide opt-out and auditable consent events.
- Add a Vercel server-side push API, VAPID configuration, notification click deep links and expired endpoint cleanup.
- Add the Admin > Community > Push notifications campaign console and delivery metrics.
- Add database migrations and operational documentation in `docs/PWA_PUSH_NOTIFICATIONS.md`.
- GitHub Actions remains disabled as a verification dependency due to the account billing issue; use Vercel Sandbox for lint, typecheck, tests and production build.

# Changelog

Implementation log for the master brief (13 November 2026). Newest first. Earlier history is in the Git log and
`docs/HANDOFF.md`.

## 15 Nov 2026 â€“ Archive: club names Wikipedia spells differently
- The archive import now matches Athletic Club, PSV, NEC Nijmegen, AZ Alkmaar and Sparta R. to their Wikipedia names (archive-only; badge and fixture names unchanged). No legal copy change.

## 15 Nov 2026 â€“ Current-season tables: tolerant table reader + diagnostics
- The Wikipedia league-table reader now accepts `Team vte` headers and rows whose em¶»§q«^