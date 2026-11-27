# Puntr 30-day synthetic QA experiment

## Scope

A controlled production QA experiment from 27 Nov to 26 Dec 2026, using 50 synthetic persona profiles. The implementation is explicitly labelled and read-only on the public application.

## Why it is not 50 founding-member signups

Production signups create genuine customer records, trigger support notifications, can affect founding-member counts, consent records, onboarding rewards, retention metrics and customer communications. Creating fictitious founding members would contaminate those records and misrepresent acquisition. Therefore the personas are not provisioned as Auth users and cannot claim founding status.

The browser suite tests public pages as guest visitors. Any authenticated-path testing must use separately provisioned, clearly labelled QA accounts with owner-approved credentials and must remain excluded from customer metrics. That is not enabled by this first implementation.

## Components

- `experiments/synthetic/personas.json`: 50 synthetic QA personas.
- `experiments/synthetic/personas.schema.json`: JSON Schema for persona validation.
- `experiments/synthetic/tests/public-journeys.spec.ts`: Playwright read-only public-page journeys.
- `experiments/synthetic/run-batch.mjs`: round-robin selector for one-to-three persona batches, intended for an owner-controlled external scheduler.
- `experiments/synthetic/decisions.mjs`: Parallel Decisions API, up to two typed choice questions per persona (one per preferred market; 100 questions for all 50 personas), with citations and per-option probabilities.
- `src/lib/parallel/decisions.ts` and `src/routes/api.cron.synthetic-decisions.ts`: server-side Decisions API provider and cron-authenticated route using Puntr's existing quota and cache layers.
- `src/routes/api.cron.synthetic-decisions-daily.ts`: assigns each due persona one upcoming fixture in a followed competition and schedules one or two market decisions per SAST day.
- `supabase/migrations/20261123150000_synthetic_experiment_telemetry.sql`: isolated service-role-only telemetry and hard budget reservation functions.

## Parallel API selection

**Primary: Decisions API.** It supports up to 100 named questions per request over one shared evidence set, returning typed choice probabilities and citations. One request can therefore evaluate two preferred markets for all 50 personas on the same fixture. This is the most economical fit for the experiment.

**Existing Responses/Task clients:** Puntr already has server-side clients for conversational live-web answers and asynchronous JSON-schema research. If a future test needs narrative explanations, it must be routed through the existing cache and quota guard. Task is not required for the typed persona choices in this experiment. All outputs remain informational forecasts for QA and accuracy evaluation, not betting instructions. The model's option probabilities are estimates, not calibrated probabilities or guaranteed outcomes.

## Cost and existing platform budget

The experiment hard cap is US$50. Decisions API requests reserve US$0.001 each and can contain up to 100 persona questions over one shared fixture evidence set. A 50-persona batch with two preferred markets each is 100 questions in one provider request, not 100 separate calls. Each call also passes Puntr's existing provider-family budget and quota checks and is cached for 24 hours. Do not create duplicate requests for the same fixture/persona batch.

The owner has confirmed sufficient Parallel funding beyond 7 Dec 2026. All experiment requests remain subject to the existing provider-family budget and quota checks, plus the experiment-specific US$50 hard cap. Do not silently reduce the budget allocated to fixtures, results, standings or newsroom.

## Production data protections

- Synthetic personas have no email address, real name, phone number or personal identifiers.
- No auth user or profile creation.
- No founding-member registration submission.
- No public prediction, public pick, community post, PuntPoints, referral, reward, redemption or payment action.
- No analytics consent; no synthetic campaign conversion events.
- No synthetic research is written to public predictions.
- Service-role access is restricted to server/CI scripts. Never expose the key to the browser.
- Tables have RLS enabled and no anon/authenticated policies.

## Activation checklist

The migration seeds the experiment as `paused`. Apply only after review. Before setting it active, verify the production host, migration, RLS, service-role secret, Parallel balance, budget reserve, and exclusion of the `x-puntr-synthetic-test` header from any customer analytics pipeline.
