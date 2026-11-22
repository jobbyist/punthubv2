# PWA hardening — approved pre-launch programme

Owner approval: 22 November 2026

All ten candidate workstreams below are approved for implementation before launch. They will be delivered as separate, reviewable feature branches and pull requests rather than one oversized change.

1. **Reliable delivery pipeline:** queue-backed delivery, retries, exponential backoff, idempotency, resumable campaigns, dead-letter handling, retry controls and exports.
2. **Campaign scheduling and targeting:** timezone-aware scheduled sends, saved audience segments and reusable templates.
3. **Granular preferences:** notification categories, quiet hours, frequency caps and preference-aware targeting.
4. **Event-triggered notifications:** followed competitions, prediction updates, duels, account and security events.
5. **Device management:** registered devices, last-seen timestamps, per-device revocation and account-wide cleanup.
6. **Cross-platform QA:** Android Chrome and installed iOS PWA tests covering foreground/background delivery, denied permissions, deep links, account switching and logout.
7. **Offline/update resilience:** service-worker upgrades, stale-cache handling, cache eviction and interrupted update recovery.
8. **Accessibility/localization:** accessible prompts/settings, keyboard and screen-reader review, localization.
9. **Privacy/retention:** minimization and retention rules for endpoints, consent, campaigns and delivery metadata, including deletion workflows.
10. **Operations/observability:** provider-level delivery metrics, alerting, audit trail, runbooks and incident recovery.

## Delivery rules
- Each independently deployable workstream or tightly coupled group gets its own branch and PR.
- Do not enable new campaign automation or event-triggered sends until consent and preference enforcement is verified.
- Every PR must include docs/changelog updates and tests.
- Use Vercel Sandbox for lint, typecheck, tests and production build; do not rely on GitHub Actions while billing is unavailable.
- Require a READY Vercel preview and real-device acceptance evidence for PWA delivery changes.
- Final production rollout follows the owner's confirmation of Google OAuth, email authentication, push delivery on installed devices, and privacy disclosure approval.

The approved programme is surfaced in the private administrator-only `/dev` workspace.
