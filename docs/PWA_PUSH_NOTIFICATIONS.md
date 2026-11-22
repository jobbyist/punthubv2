# Puntr PWA, authentication return paths and Web Push

## Scope
This milestone makes the installed Puntr app open on `/predictions`, preserves a user's intended destination through authentication, replaces the Predictions signup iframe with first-party navigation, and adds opt-in Web Push with account-level opt-out and an admin delivery console.

## Authentication continuation
- The current in-app URL is captured by protected-page and Predictions guest gates and passed to `/join?next=...`.
- `safeNext()` accepts same-site internal paths only and rejects protocol-relative paths, encoded slash/backslash tricks, credentials, and auth/admin/API destinations.
- Password, email OTP, email confirmation, Google OAuth PKCE, onboarding and password recovery preserve the original path.
- OAuth returns through `/auth/callback`, exchanges the PKCE code, then resumes `/join` so profile completion and MFA checks remain in the normal flow.
- Email confirmation links still require a user tap; link scanners cannot consume the token automatically.
- The Predictions guest gate navigates to the first-party `/join` route. It no longer embeds the auth app in an iframe.

## Web Push architecture
- Browser subscription is created only after an explicit user gesture and browser permission grant.
- `PushNotificationPrompt` is shown to signed-in users in installed standalone mode when permission is still `default`; dismissals are remembered for 14 days.
- Account home includes a push settings control. Turning push off removes all active subscriptions for the signed-in account and records withdrawal of consent. Normal sign-out removes the current device subscription before ending the session, without withdrawing account-wide consent.
- The append-only `consent_records` ledger records `push_notifications` grant/withdrawal events with notice version `push-notifications-v1`.
- `push_subscriptions` stores per-device endpoint and encryption keys. RLS is enabled and direct anon/authenticated table access is revoked. Only the Vercel server endpoint uses the service-role key.
- `POST /api/push` authenticates the bearer session with Supabase, enforces an active profile, and checks the admin role for campaign operations.
- Web Push uses VAPID and the `web-push` package. The private key is a sensitive Vercel environment variable and is never sent to the browser.
- Service worker `push` events display a branded notification. `notificationclick` validates the same-origin destination, focuses/navigates an existing client, or opens a new window.
- Expired (404/410) endpoints are removed. Campaigns and per-subscription outcomes are logged for operational review.

## Admin control panel
The Admin > Community > Push notifications tab provides:
- active subscription count;
- 30-day sent and failed/expired delivery totals;
- test send to the signed-in admin's own active devices;
- campaigns to all opted-in users, Founding Members, or one username;
- title/body/target URL preview and character limits;
- recent campaign history and attempted/sent/failed counts.

Push campaigns are separate from in-app notifications. The panel sends only to members with active browser subscriptions and does not bypass opt-in.

## Environment configuration
Vercel project `punthubv2`:
- `VITE_WEB_PUSH_PUBLIC_KEY`: public VAPID key used by the browser subscription API.
- `VAPID_PUBLIC_KEY`: server-side public key.
- `VAPID_PRIVATE_KEY`: sensitive/server-only VAPID signing key.
- `VAPID_SUBJECT`: `mailto:support@puntr.co.za`.
- Existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required by the server endpoint.

Do not expose `VAPID_PRIVATE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in client code, public docs, logs or support tickets. VAPID public/private keys must always be a matching pair.

## Database rollout
Apply migration `20261122230000_pwa_push_notifications.sql` to the linked Puntr Supabase project before enabling the production endpoint. It creates the subscription, campaign and delivery tables, enables RLS, revokes direct client access and extends the existing consent-purpose constraint.

## Browser/platform notes
- Web Push requires HTTPS and a supporting browser.
- On iOS/iPadOS, Web Push is available to web apps added to the Home Screen on supported OS versions; the permission request must follow a user gesture.
- Browser/OS settings can revoke permission independently. Account settings report browser permission and active server subscriptions separately.
- Push delivery is best-effort; the sender logs provider outcomes but cannot guarantee a notification is displayed or read.
- Live odds, scores, account data and betting actions remain online-only. The service worker does not cache private API responses.

## QA and release
Run the QA sequence in a Vercel Sandbox, not GitHub Actions (the GitHub Actions billing issue is known):
1. `bun install --frozen-lockfile`
2. `bun run lint:fix` (apply safe ESLint/Prettier fixes), then `bun run lint` (verify no errors)
3. `bun run typecheck`
4. `bun run test`
5. `bun run build`
6. Inspect the Vercel preview and exercise authentication return paths, push opt-in/out, test notifications and notification deep links on supported devices.

Before production enablement, confirm Supabase redirect allow-list includes `https://puntr.co.za/auth/callback` and the preview callback URL if preview OAuth is tested. Review the updated privacy notice and responsible-notification policy with the appropriate legal owner.


## Known gaps and proposed follow-up (not part of this PR)
The following items were identified during the PWA review. They are intentionally not implemented in this milestone and require owner approval before a separate branch/PR is opened:

1. **Queued campaign delivery:** current admin dispatch is synchronous and uses the PostgREST default result window. Add a durable queue, pagination, retry/backoff, idempotency and progress reporting before sending to large audiences.
2. **Subscription lifecycle reconciliation:** handle `pushsubscriptionchange`, periodically reconcile browser permission/subscription state, and expose stale-device cleanup metrics.
3. **Delivery observability:** show per-campaign delivery failure categories and retryable failures in the admin console, with safe export and retention controls.
4. **Notification preferences:** add optional categories (service updates, matchday reminders, product announcements) and quiet hours if user research supports them. Keep promotional messaging separate from this service-notification consent.
5. **Offline experience:** assess a safe, read-only offline shell and optional public content caching. Do not cache account, private predictions, betting, payment or live odds data.
6. **PWA lifecycle polish:** add cache size/age controls, update-available UX and device-specific native splash assets where supported.
7. **Device verification:** complete real iOS Home Screen and Android Chrome installation, push permission, notification tap, account switch, sign-out and offline tests. The current validation is a Vercel preview/build plus automated QA, not a physical-device certification.

No separate follow-up PR has been created. The owner must approve the selected improvements first.
