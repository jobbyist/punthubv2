# Puntr PWA implementation

## Included
- Installable web app manifest with standalone display mode, black launch background and the supplied Puntr brand image as the application icon, favicon and Apple touch icon.
- Custom black-and-green install card with native Android install flow and iOS Safari Add to Home Screen guidance.
- Service worker registration and a branded offline fallback.
- Conservative cache policy: only static build assets, the manifest and app icon are cached. Navigation requests are network-first and fall back to the offline page. Auth, account, Supabase, betting, payment and live-data requests are never cached.
- Standalone launch treatment based on the existing preloader: supplied Puntr wordmark, brand line, green progress indicator and community descriptor.

## Important behaviour
- The browser and operating system own the native installation flow and generated launch screen. Android uses the manifest background colour and icon; iOS uses the Apple touch icon and its platform-generated launch screen. The branded in-app preloader is shown when the installed app opens.
- The service worker does not make live odds, scores, predictions, account data or betting operations available offline.
- Push notifications are intentionally not enabled in this foundation. They require a separate consent UX, VAPID keys, a secure server-side sender, a subscription table with RLS and privacy/legal review before activation.

## QA
Run bun run lint, bun run typecheck, bun run test and bun run build. Verify installation on Android Chrome and iOS Safari, standalone relaunch, offline navigation, cache update behaviour and authenticated flows. Confirm no API or private response is present in Cache Storage.

## Authentication and push notification extensions
See [PWA, authentication return paths and Web Push](./PWA_PUSH_NOTIFICATIONS.md) for the current architecture, database rollout, consent ledger, VAPID environment variables, admin console and release checklist.

The installed app continues to use `/predictions?source=pwa` as its manifest entry point. Auth gates now preserve the full internal destination in a validated `next` parameter through OAuth, email confirmation, password login, OTP, onboarding and password recovery. Push notification clicks validate same-origin URLs and route back into the app.

Push subscriptions are never cached. Only the server-side Vercel endpoint can read or mutate subscription records. Push opt-in is explicit; Account settings can withdraw consent and remove all account subscriptions.
