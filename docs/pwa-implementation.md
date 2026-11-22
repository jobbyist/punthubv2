# Puntr PWA implementation

## Included
- Installable web app manifest with standalone display mode and branded icons.
- Custom install card with native Android install flow and iOS Safari Add to Home Screen guidance.
- Service worker registration and a branded offline fallback.
- Conservative cache policy: only static build assets and install artwork are cached. Navigation requests are network-first and fall back to the offline page. Auth, account, Supabase, betting, payment and live-data requests are never cached.
- Black launch background and a portrait Puntr splash artwork inspired by the existing preloader.

## Important behaviour
- The browser and operating system own the native installation flow and generated launch screen. Android uses the manifest background colour and icon; iOS uses the Apple touch icon and its platform-generated launch screen. The in-app preloader remains the branded loading experience after the app opens.
- The service worker does not make live odds, scores, predictions, account data or betting operations available offline.
- Push notifications are intentionally not enabled in this foundation. They require a separate consent UX, VAPID keys, a secure server-side sender, a subscription table with RLS and privacy/legal review before activation.

## QA
Run bun run lint, bun run typecheck, bun run test and bun run build. Verify installation on Android Chrome and iOS Safari, standalone relaunch, offline navigation, cache update behaviour and authenticated flows. Confirm no API or private response is present in Cache Storage.
