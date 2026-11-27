# PFIE learning pipeline and canonical data governance

## System-of-record boundaries

PFIE remains the canonical source of sporting facts: fixtures, kickoff times, standings, accepted source observations and independently corroborated results live in the existing PFIE tables and audit trail.

The PFIE learning corpus is the canonical source for how PFIE is evaluated and improved. It is not a replacement for the sports-fact store. PUNT AI should consume approved PFIE facts and versioned learning outputs through server-side services; it must not treat raw activity or unverified predictions as facts.

## Learning-source priority

1. **Primary: consented real member activity.** Explicitly opted-in member interactions and published pick actions are captured first-party. These are pseudonymized before entering the learning corpus and used as behavioural-preference, feature-utility and human-consensus signals.
2. **Ground truth: PFIE verified sporting outcomes.** A user's selection is never a correct-answer label. Forecast evaluation requires independently accepted official/trusted PFIE observations for the actual fixture result.
3. **Secondary: synthetic QA.** Synthetic sessions and research are used for route reliability, source coverage, extraction diagnostics and controlled model evaluation. They are never counted as real users, conversions, picks, bets or customer behaviour.

## Data flow

1. The member must separately opt in to **PFIE learning**. This is independent of analytics and affiliate tracking, off by default, recorded in the append-only consent ledger, and reversible under Account → Privacy and data.
2. Client engagement events pass through a strict event allowlist and authenticated server function. Only selected sports/competition/market/category metadata is accepted; free text, email, display name, private messages, payment data, stake amounts, IP addresses and device fingerprints are excluded.
3. A database trigger captures published prediction actions only when the same explicit consent is active. The capture contains market, selection, odds, confidence and fixture reference, but no stake or account profile details.
4. Raw activity is stored in `pfie_user_activity_events`, separate from `campaign_events`. A daily Vercel Cron processes it incrementally.
5. A keyed HMAC subject token is created server-side and mapped in a service-role-only table. The learning corpus uses this pseudonymous token; raw account IDs are not exposed in the training view.
6. Consented activity becomes `behavioral_preference` examples. These describe observed user actions and preferences; they are not objective sporting labels.
7. Synthetic sessions and research are ingested independently as secondary examples. Forecast research remains quarantined until two distinct official/trusted PFIE source domains corroborate the final score.
8. The service-role-only `pfie_training_dataset` view exposes only approved, verified examples. It excludes the pseudonymous subject token and all direct account identifiers.
9. Withdrawing PFIE-learning consent stops future collection and deletes the member's raw activity, subject mapping and derived learning examples. A post-ingestion consent check closes the race between a withdrawal and a running cron job.

## Guardrails

- PFIE learning is a separate, explicit purpose under the privacy controls; accepting ordinary analytics is not a prerequisite.
- Synthetic QA is explicitly marked and remains a secondary data source.
- Real member activity is not mixed with campaign analytics, and synthetic events remain excluded from campaign analytics.
- Human selections are behavioural signals, never match-result ground truth.
- No automated fine-tuning or model-weight change occurs. The pipeline supplies governed learning/evaluation examples for calibration, retrieval evaluation and future model releases.
- Only service-role backend code can read the raw event store, subject map and training corpus.
- No new paid model provider, vector database or third-party event platform is required.
- Event capture is non-blocking: tracking failures never affect the product experience.

## First learning tasks

- Understand which sports, competitions, markets and features members actually use.
- Improve the relevance of PFIE coverage, data freshness and source selection.
- Compare member pick distributions with independently verified match outcomes as a separate consensus signal.
- Evaluate forecast calibration with Brier score, log loss and reliability buckets only when sufficient independently labelled fixtures exist.
- Evaluate extraction and route reliability using synthetic QA as a separate test dataset.

## Operations

- Daily schedule: 06:30 SAST at `GET /api/cron/pfie-learning-ingest`, protected by `CRON_SECRET`.
- Admin monitoring: `/admin` → Overview → PFIE Learning.
- Primary raw activity table: `pfie_user_activity_events`.
- Pseudonymous subject mapping: `pfie_learning_subject_map` (service-role only).
- Canonical corpus: `pfie_learning_examples`.
- Approved training/evaluation view: `pfie_training_dataset` (service-role only).
- Synthetic telemetry remains in `synthetic_sessions` and `synthetic_research`.
- Event-level data retention: 12 months; account-level consent evidence remains in the consent ledger under the privacy policy.
