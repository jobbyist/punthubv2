# Puntr PWA follow-up audit — proposed scope

Date: 22 November 2026

This is deliberately outside PR #204. Do not implement until the product owner approves a separate branch and PR.

## Candidate improvements

1. Queue-backed push delivery with retries, backoff, idempotency and resumable campaigns; current sends are synchronous batches.
2. Scheduled campaigns, timezone-aware delivery and saved audience segments.
3. Delivery observability: provider response breakdowns, dead-letter handling, retry controls and exports.
4. Granular notification categories, quiet hours and frequency caps instead of one global switch.
5. Event-triggered notifications for followed competitions, predictions, duels and account/security events.
6. Device management: list devices, last-seen timestamps and per-device revocation.
7. Real-device QA on Android Chrome and installed iOS PWAs, including foreground/background delivery, permission denial, deep links, account switching and logout.
8. Offline/update resilience: stale service-worker upgrades, cache eviction and interrupted update recovery.
9. Accessibility and localization review for prompts, settings and admin controls.
10. Privacy/retention review for endpoints, campaign logs, consent records and delivery metadata.

## Release gate

Obtain explicit approval, create a dedicated feature branch and PR, then run Vercel Sandbox lint, typecheck, tests and build plus a Vercel preview.