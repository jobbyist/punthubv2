# Puntr synthetic QA experiment

This is a labelled, read-only QA system, not a fake-customer acquisition system. It contains 50 synthetic data personas and stores all activity in isolated experiment tables.

## Production scheduler

Vercel Cron runs `/api/cron/synthetic-run` at 06:00, 09:00, 13:00, 17:00 and 20:00 SAST. It performs server-side GET/HTML checks on one least-recently-tested persona per run, then invokes the daily fixture-research allocator after successful route checks. The route requires the production `CRON_SECRET` Bearer header.

The scheduled runner is deliberately an HTTP/HTML smoke test, not a full browser. It does not execute page JavaScript or interact with controls. The Playwright suite below remains available for manual/local browser-level regression tests; GitHub Actions is not used for scheduling.

## Isolation and safety

- Every route check sends `x-puntr-synthetic-test: true`, `x-puntr-experiment` and the `puntr_synthetic_qa=1` cookie.
- The analytics helper rejects the synthetic cookie before GA4/GTM, first-party `campaign_events`, or session analytics writes, even if analytics consent exists.
- The Playwright suite sets the same cookie before navigation.
- Synthetic sessions, research and budget entries live only in the service-role-only synthetic tables.
- No Auth users, fake registrations, founding memberships, public picks, PuntPoints, referrals, rewards, payments or wagers are created.
- No stealth, CAPTCHA bypass, proxy rotation or bot-detection evasion is used.

## Schedule and budget

Experiment window: 27 November–26 December 2026 (SAST). The production experiment row remains paused until deployment and analytics checks pass. The separate provider budget ceiling is US$50, with every request also subject to Puntr's existing Parallel quota/budget guard and shared cache. The owner has confirmed sufficient funding beyond 7 December 2026.

## Manual Playwright checks

From `experiments/synthetic`:

```bash
npm install
npx playwright install chromium
SYNTHETIC_WORKERS=1 npm test
SYNTHETIC_PERSONA_IDS=puntr-synth-01,puntr-synth-02 npm test
```

Set `PUNTR_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SYNTHETIC_EXPERIMENT_ID` only in a secure local environment if session persistence is required. Never commit secrets.

## Admin monitoring

Open `/admin` → Overview → Synthetic QA. It shows experiment status, persona coverage, route-check sessions, forecast research and the isolated US$50 budget ledger.
