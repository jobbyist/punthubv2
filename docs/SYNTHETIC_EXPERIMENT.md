# Puntr 30-day synthetic QA experiment

## Scope

A controlled, explicitly labelled QA experiment for 27 November–26 December 2026 (SAST), using 50 synthetic persona profiles. The production scheduler is Vercel Cron. The scheduled runner performs server-side, read-only HTTP/HTML checks against the public application and calls the daily research allocator. It does not run a headless browser inside a Vercel Function.

The Playwright suite remains available for manual/local browser testing, but is no longer scheduled by GitHub Actions.

## Vercel orchestration

`vercel.json` invokes `/api/cron/synthetic-run` at 06:00, 09:00, 13:00, 17:00 and 20:00 SAST (04:00, 07:00, 11:00, 15:00 and 18:00 UTC). Vercel Cron sends GET requests and includes the configured `CRON_SECRET` as a Bearer token. The route validates the secret, reads the paused/active experiment state, selects one least-recently-tested persona, and visits only its allowlisted public paths using GET requests. A short database lease prevents duplicate cron deliveries from testing the same persona concurrently.

After a successful route check, the runner invokes the existing daily fixture allocator. That allocator is idempotent per persona/SAST day and uses the existing Parallel quota, cache and US$50 experiment budget guard. Failed route checks are recorded in the synthetic session table and do not trigger research for that invocation.

Vercel Cron is best-effort scheduling; runs can be delayed, duplicated or missed. The runner is idempotent and records session timestamps so later invocations can continue round-robin coverage.

## QA method and limitations

The scheduled Vercel runner checks that each allowlisted public route returns same-origin HTML with a successful HTTP status. It does not execute client-side JavaScript, render interactions, submit forms, or behave like a full browser. This is intentionally lighter and more reliable within serverless function limits. Use the retained Playwright suite for manual browser-level regression checks.

The allowed paths are `/`, `/founding`, `/predictions`, `/fixtures`, `/results`, `/newsroom` and `/roadmap`. No writes, registration submissions, public picks, PuntPoints, referrals, rewards, payments or wagering actions are performed.

## Isolated telemetry and analytics exclusion

- All synthetic records are written to `synthetic_experiments`, `synthetic_personas`, `synthetic_sessions`, `synthetic_research` and `synthetic_budget_ledger`.
- These tables have RLS enabled and no anon/authenticated table privileges; only trusted server-side service-role code can access them.
- Scheduled route checks send `x-puntr-synthetic-test: true`, `x-puntr-experiment` and the `puntr_synthetic_qa=1` cookie.
- The client analytics helper rejects the synthetic cookie before writing to GA4/GTM, session analytics storage or `campaign_events`, even if an analytics consent cookie is present.
- The retained Playwright suite sets the same synthetic cookie before navigation.
- Synthetic QA route-check personas remain isolated from member analytics. The separate AI community programme provisions 50 real Supabase Auth identities as explicitly labelled AI participants, assigns each a unique founding number, and counts them in the public 100-place founding allocation.
- The admin-only Synthetic QA tab reads only the isolated experiment tables. It does not combine synthetic activity with member analytics or campaign conversion metrics.

## Personas and research

`experiments/synthetic/personas.json` contains 50 distinct data-only profiles. The daily allocator assigns due personas an upcoming fixture in a followed competition and creates one or two preferred-market Decisions API questions per persona, capped at 100 named questions per shared-evidence request. Forecasts are informational QA outputs, not betting advice, and are never published as picks.

The Decisions API route uses Puntr's existing Parallel cache and provider-family quota/budget guard, plus the separate US$50 experiment hard ceiling. The owner has confirmed sufficient Parallel funding beyond 7 December 2026; requests still remain subject to those controls.

## Admin monitoring and AI member provisioning

Open `/admin` → Overview → Synthetic QA to monitor experiment state and dates, active persona coverage, route-check sessions and failures, forecast batches, source counts, the budget ledger, and linked AI founding-member count. Provision the 50 AI community accounts from **Founding HQ** using the admin-only Supabase Auth Admin action. Each receives a sequential founding number and a visible AI participant label on its public profile, community posts and H2H leaderboard rows. AI identities use non-deliverable `.invalid` email addresses, have no interactive login credentials exposed, and are operated only by trusted server-side jobs. AI accounts are not represented as human signups.

## Activation requirements

The production Supabase telemetry migration and 50-persona seed are already applied. The production Vercel project already has `CRON_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` configured. Keep the experiment paused until the Vercel deployment registers the Cron schedule and the production route-check plus analytics-exclusion tests have been verified.
