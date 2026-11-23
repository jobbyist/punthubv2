# Puntr 30-day synthetic QA experiment

## Scope

A controlled production QA experiment from 23 Nov to 22 Dec 2026, using 50 synthetic persona profiles. The implementation is explicitly labelled and read-only on the public application.

## Why it is not 50 founding-member signups

Production signups create genuine customer records, trigger support notifications, can affect founding-member counts, consent records, onboarding rewards, retention metrics and customer communications. Creating fictitious founding members would contaminate those records and misrepresent acquisition. Therefore the personas are not provisioned as Auth users and cannot claim founding status.

The browser suite tests public pages as guest visitors. Any authenticated-path testing must use separately provisioned, clearly labelled QA accounts with owner-approved credentials and must remain excluded from customer metrics. That is not enabled by this first implementation.

## Components

- `experiments/synthetic/personas.json`: 50 synthetic QA personas.
- `experiments/synthetic/personas.schema.json`: JSON Schema for persona validation.
- `experiments/synthetic/tests/public-journeys.spec.ts`: Playwright read-only public-page journeys.
- `experiments/synthetic/run-batch.mjs`: round-robin selector for one-to-three persona batches, intended for an owner-controlled external scheduler.
- `experiments/synthetic/decisions.mjs`: Parallel Decisions API, one typed choice question per persona (up to 100 questions per shared fixture evidence set), with citations and per-option probabilities.
- `src/lib/parallel/decisions.ts` and `src/routes/api.cron.synthetic-decisions.ts`: server-side Decisions API provider and cron-authenticated route using Puntr's existing quota and cache layers.
- `supabase/migrations/20261123150000_synthetic_experiment_telemetry.sql`: isolated service-role-only telemetry and hard budget reservation functions.

## Parallel API selection

**Primary: Decisions API.** It supports up to 100 named questions per request over one shared evidence set, returning typed choice probabilities and citations. One request can therefore evaluate all 50 personas for the same fixture. This is the most economical fit for the experiment.

**Existing Responses/Task clients:** Puntr already has server-side clients for conversational live-web answers and asynchronous JSON-schema research. If a future test needs narrative explanations, it must be routed through the existing cache and quota guard. Task is not required for the typed persona choices in this experiment. All outputs remain informational forecasts for QA and accuracy evaluation, not betting instructions.

## Cost and existing platform budget

The experiment hard cap is US$50. Decisions API requests reserve US$0.001 each and can contain up to 100 persona questions over one shared fixture evidence set. A 50-persona batch for one fixture is one provider request, not 50. Each call also passes Puntr's existing provider-family budget and quota checks and is cached for 24 hours. Do not create duplicate requests for the same fixture/persona batch.

The existing `docs/PARALLEL_ARCHITECTURE.md` states that the current approximately US$50 prepaid balance expires on 7 Dec 2026 and also funds live Puntr data workloads. The experiment runs to 22 Dec. The owner must verify a separate or replenished balance before running beyond 7 Dec. Do not silently reduce the budget allocated to fixtures, results, standings or newsroom.

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
