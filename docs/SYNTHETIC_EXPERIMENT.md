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
- `experiments/synthetic/research.mjs`: Parallel Responses API JSON Schema forecast research, cached per fixture.
- `supabase/migrations/20261123150000_synthetic_experiment_telemetry.sql`: isolated service-role-only telemetry and hard budget reservation functions.

## Parallel API selection

The legacy Chat API quickstart currently redirects to the Responses API documentation. The Responses API is synchronous and supports structured JSON outputs. Use `model: "parallel"`, `reasoning.effort: "low"`, and a JSON Schema in `text.format`.

Task API is not needed just to enforce a JSON schema. Use it only for deeper asynchronous research or larger batch research tasks. Forecasts are informational research artifacts for QA and accuracy evaluation, not betting instructions.

## Cost and existing platform budget

The experiment hard cap is US$50, with a conservative US$0.25 reservation per Responses request. A unique fixture is researched once and reused by all personas. The experiment must not create 3,000 duplicate API requests.

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
