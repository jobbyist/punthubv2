# PFIE learning pipeline

## Purpose

The synthetic QA experiment is a repeatable source of operational evidence for PFIE and PUNT AI. This pipeline makes that evidence durable and reusable across all synthetic experiments, without mixing it into customer analytics or treating generated forecasts as ground truth.

## Data flow

1. Vercel Cron runs `/api/cron/pfie-learning-ingest` daily at 06:30 SAST.
2. The authenticated job reads only `synthetic_sessions` and `synthetic_research`, across every experiment.
3. It writes idempotent rows to `pfie_learning_examples`; source identifiers and experiment provenance are retained.
4. `route_quality` examples receive deterministic labels from the HTTP/HTML check outcome and are eligible for the operational QA dataset.
5. `forecast_evaluation` examples retain the fixture context, decisions and citations, but start quarantined with no label.
6. An admin can request verification from the PFIE Learning tab. The database approval function requires two distinct official/trusted PFIE source domains agreeing on the same final score before it labels and promotes a forecast example.
7. The service-role-only `pfie_training_dataset` view exposes only approved, verified examples.

## Guardrails

- Synthetic data never enters `campaign_events`, member analytics, user profiles, public predictions, bets, rewards or conversion reporting.
- Synthetic model output is never its own target label.
- Forecast examples are not promoted just because a synthetic persona or provider selected an outcome.
- The PFIE approval gate requires two independent source domains with accepted official/trusted observations.
- Re-ingestion is idempotent and ignores existing rows, so a later run cannot overwrite an admin-reviewed label.
- Only service-role backend code can read or write the learning corpus. Admin actions are role-checked and the database approval routine validates the admin identity again.
- No new model provider, vector database, paid API or fine-tuning dependency is introduced.

## How PUNT AI should use this

PFIE remains the canonical, deterministic intelligence layer. PUNT AI should retrieve verified PFIE facts and approved examples as context for explanations, confidence calibration, source-quality warnings and model evaluation. The training view is a structured dataset, not a live prompt feed and not a mechanism for silently changing model weights.

The first useful learning tasks are:
- Retrieval and route-quality diagnostics from deterministic QA outcomes.
- Source coverage, citation diversity and freshness analysis.
- Forecast evaluation after independently verified final results exist.
- Calibration evaluation using Brier score, log loss and reliability buckets once enough labelled fixtures accumulate.

Do not fine-tune on quarantined rows. Do not interpret this pipeline as having trained a new foundation model. A future training job should export a frozen, versioned snapshot from `pfie_training_dataset`, run holdout evaluation, and require an explicit release decision before PUNT AI consumes a new model or calibration version.

## Operations

- Schedule: daily at 06:30 South Africa time.
- Endpoint: `GET /api/cron/pfie-learning-ingest`, protected by the existing `CRON_SECRET`.
- Admin: `/admin` → Overview → PFIE Learning.
- Canonical tables: `pfie_learning_ingest_runs`, `pfie_learning_examples`.
- Approved dataset view: `pfie_training_dataset`.
