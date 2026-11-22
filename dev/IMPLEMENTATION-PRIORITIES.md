# Puntr MVP launch-hardening sprint

**Status date:** 22 November 2026  
**MVP launch target:** 1 December 2026  
**Sprint window:** 22–30 November 2026  
**Launch sport:** Football / soccer  
**Readiness owner:** Puntr product owner

This is the operational source of truth for the final MVP hardening sprint. Tick each item only after it has been tested and evidence recorded. A feature being present in the codebase is not proof that its full user journey is launch-ready.

## Readiness dashboard

| Priority | Workstream | Current assessment (22 Nov) | Launch gate |
|---|---|---|---|
| P0.1 | PFIE fixtures, results and standings reliability | **In progress.** Recent fixture/result runs are present. Standings have 7/12 scopes with a recorded success; 5 have never succeeded. | All launch-priority competitions have fresh, verified fixtures/results; no disputed settlement data |
| P0.2 | Manual odds workflow | **In progress.** Existing member-entered odds system is the MVP path; this audit did not re-test the full UI-to-database journey. | Correct bookmaker, market and submitted decimal odds persist with timestamp and user-submitted label |
| P0.3 | Registration and Founding Member activation | **Not verified in this audit.** | New and returning member journeys pass on mobile and desktop |
| P0.4 | Payments, affiliate and responsible-gambling compliance | **Not verified in this audit.** | Payments/affiliate features are tested and approved or disabled; age and responsible-gambling controls pass |
| P0.5 | Production operations and release readiness | **Blocked on migration-ledger reconciliation.** Cron jobs are active, but migration history and repository files do not map cleanly. | Backups, monitoring, cron, rollback and release runbook are evidenced |

**Progress rule:** Mark a workstream DONE only when all checklist items pass and evidence (test run, screenshot, log reference or owner sign-off) is linked in the notes below. If a gate fails, reduce scope or disable the affected feature; do not waive data, safety or payment controls.

## P0.1 — PFIE fixtures, results and standings reliability

**Current evidence:** The production database contains recent PFIE fixture/result runs. The 22 Nov sync-status snapshot reports 7 of 12 standings scopes with a prior success and 5 with no successful snapshot. The most recent standings attempts include source-level failures (for example, incomplete La Liga table extraction). The live cron jobs are active. One recent net._http_response request timed out at 55 seconds, but the response record does not preserve the request path, so it cannot be attributed confidently to a specific cron job.

- [ ] Confirm the exact launch competition list and hide/defer competitions without dependable data.
- [ ] For every launch competition, verify upcoming fixture coverage, kickoff time/date, team identity and latest successful sync.
- [ ] For every launch competition, verify recent completed results and settlement-critical full-time scores.
- [ ] Verify that disputed or single-source results cannot settle predictions.
- [ ] Verify standings are current, complete and corroborated; show stale/unavailable state when not.
- [ ] Confirm derived form uses verified completed results only and displays no fabricated values.
- [ ] Review unresolved aliases, rejected source observations and competition-level failures.
- [ ] Record last-success timestamps and a launch-day PFIE health snapshot.
- [ ] Confirm cron requests finish inside the 55-second pg_net timeout; investigate any un-attributed timeout before increasing cadence.

**Evidence / notes:** Add competition-by-competition results, sync timestamps and any disabled competitions here.

## P0.2 — Manual odds workflow (MVP path)

**Owner decision (22 Nov):** Automated bookmaker odds are not a launch dependency. Puntr has not received an authorized odds API, affiliate odds feed or other odds integration from any South African bookmaker. Parallel Search, Extract and Monitor do not grant data rights. Automated bookmaker extraction is deferred.

- [ ] Test entering a bookmaker and decimal odds on a real upcoming fixture.
- [ ] Confirm bookmaker, fixture, market and selection are stored against the correct pick/slip leg.
- [ ] Validate decimal odds are finite and within the platform's accepted range.
- [ ] Confirm the submitted odds and submission timestamp persist after refresh, re-login and page navigation.
- [ ] Confirm the member's submitted odds are immutable in the historical pick record and verification hash.
- [ ] Label the value **User-submitted**; do not call it live, independently verified or a market reference.
- [ ] Confirm no failed or stale automated reference price can block pick submission or overwrite member input.
- [ ] Confirm the UI has a clear empty state when the user has not entered bookmaker/odds information.
- [ ] Verify that any affiliate branding or outbound link is shown only where the partner agreement and creative approval permit it.

**Post-launch only:** Investigate an authorized bookmaker feed or a commercial odds-data vendor with explicit South African coverage and rights for collection, storage, display, attribution, retention and redistribution. Parallel Search is for source discovery; Extract is for permitted page retrieval; Monitor is for scheduled change detection, not a guaranteed quote stream.

## P0.3 — Registration and Founding Member activation

- [ ] Test visitor → registration → email verification → sign-in → onboarding → member home.
- [ ] Test Google / Apple / email sign-in methods that are enabled in production.
- [ ] Test password reset, expired links, duplicate email and interrupted onboarding.
- [ ] Test guest restrictions and authenticated-only actions.
- [ ] Test Founding Member registration, duplicate prevention, welcome email and admin cohort view.
- [ ] Confirm the Founding Member count and acquisition funnel are measurable and deduplicated.
- [ ] Test mobile layouts, validation messages, loading states and error recovery.
- [ ] Confirm all user-facing launch copy says the product opens on 1 December until launch day.

**Evidence / notes:** Record test account roles (without storing passwords), devices, browser versions and pass/fail.

## P0.4 — Payments, affiliate and responsible-gambling compliance

- [ ] Verify PayFast sandbox checkout success, failure, cancellation and return-to-site behaviour.
- [ ] Verify webhook signature/authentication, idempotency, duplicate notifications and correct payment state.
- [ ] Verify credits/subscriptions are granted only by trusted server-side payment confirmation.
- [ ] Verify expiry, cancellation, failed payment and refund/support paths.
- [ ] Keep live payment activation off until payment, legal, refund and owner sign-off gates pass.
- [ ] Confirm Hollywoodbets affiliate status and approved creative/link scope; affiliate approval is not odds-feed permission.
- [ ] Verify 18+ age attestation/gate and suppression of promotional content for restricted or on-break accounts.
- [ ] Verify responsible-gambling notices and the South African Responsible Gambling Foundation helpline (0800 006 008).
- [ ] Verify break/self-exclusion links and that Puntr does not imply it can impose or lift statutory exclusions.
- [ ] Verify ad/affiliate labels, 18+ and T&Cs apply on relevant gambling promotions.
- [ ] Review privacy consent, cookie choices, analytics and data minimisation.
- [ ] Ensure no identity, health, counselling or gambling account data is sent to Parallel or general-purpose AI services.
- [ ] Obtain legal/owner sign-off or disable the affected payment, affiliate or promotional feature.

## P0.5 — Production operations and release readiness

- [ ] Confirm current production backup/PITR coverage and record the restore procedure.
- [ ] Verify cron schedules, authentication, secrets, quotas, retry/backoff and failure visibility.
- [ ] Confirm no service-role or cron secret is exposed to client bundles or logs.
- [ ] Verify admin access, moderation/reporting, support contact route and incident owner.
- [ ] Test production smoke flows using approved test accounts.
- [ ] Confirm feature flags/kill switches exist for payments, odds reference, affiliate placements and unstable data panels.
- [ ] Record current production commit SHA, Vercel deployment and environment status.
- [ ] Complete mobile/browser regression, accessibility and performance checks.
- [ ] Prepare launch-day monitoring rota, incident log and customer communication template.
- [ ] Freeze non-essential feature work on 30 November.
- [ ] Obtain final owner sign-off before public launch.

### Migration / cron reconciliation status — 22 November 2026

**Read-only audit completed; production migration history has not been modified.**

Verified facts:
- Supabase production migration ledger contains 101 entries and ends at 20261121235610.
- The repository's main branch contains 101 migration files, but only one file version prefix exactly matches a production ledger version.
- The two histories contain renamed, split and consolidated migration names. Examples include content_engine / pfie_fixtures versus content_engine_and_pfie_part_a, and platform_controls_wallet versus three production entries (part1, part2, part3). There are also entries present on only one side, including media_bucket and quest_evidence_purge in production history and duel_stakes_on / annual_pass_emails_to_30_nov in the repository.
- Production has four active PFIE table jobs (job IDs 61–64). Their live schedules are not identical to the final pending migration 20261122140000_pfie_standings_timeout_batches.sql.
- The pending 20261122110000_pfie_live_standings_refresh.sql contains malformed dollar-quote syntax in its final cron.schedule command. It must not be applied as written.
- cron.job_run_details contains 17,919 records overall, but none yet for the new PFIE table job IDs 61–64 as of 01:22 UTC; their first scheduled window begins at 02:10 UTC. Other scheduled jobs continue to run. net._http_response has recent successful Vercel responses and one 55-second timeout, but the response log does not retain the request path.
- The current production cron jobs remain active. No cron schedule, migration ledger row or production schema was changed during this audit.

**Live PFIE cron schedules (Postgres UTC; SAST is UTC+2):**

| Job ID | Job | Live schedule (UTC) | Equivalent SAST |
|---:|---|---|---|
| 61 | sync-tables | 10,15,20,25,30,35,40,45,50,55 2 * * * | 04:10–04:55 every 5 min |
| 62 | sync-tables-late | 0,5,10,15,20,25,30,35,40,45,50,55 3 * * * | 05:00–05:55 every 5 min |
| 63 | sync-tables-evening | 10,15,20,25,30,35,40,45,50,55 14 * * * | 16:10–16:55 every 5 min |
| 64 | sync-tables-evening-late | 0,5,10,15,20,25,30,35,40,45,50,55 15 * * * | 17:00–17:55 every 5 min |

The latest pending migration (20261122140000) instead schedules the morning jobs every 5 minutes from minute 0 and the evening jobs every 10 minutes from minute 0. The active schedule is staggered and more frequent in the evening. Do not replace it merely to make it match the file; first establish why the live schedule was changed and whether its higher cadence is sustainable.


**Live PFIE cron schedules (Postgres UTC; SAST is UTC+2):**

| Job ID | Job | Live schedule (UTC) | Equivalent SAST |
|---:|---|---|---|
| 61 | sync-tables | 10,15,20,25,30,35,40,45,50,55 2 * * * | 04:10–04:55 every 5 min |
| 62 | sync-tables-late | 0,5,10,15,20,25,30,35,40,45,50,55 3 * * * | 05:00–05:55 every 5 min |
| 63 | sync-tables-evening | 10,15,20,25,30,35,40,45,50,55 14 * * * | 16:10–16:55 every 5 min |
| 64 | sync-tables-evening-late | 0,5,10,15,20,25,30,35,40,45,50,55 15 * * * | 17:00–17:55 every 5 min |

The latest pending migration (20261122140000) instead schedules the morning jobs every 5 minutes from minute 0 and the evening jobs every 10 minutes from minute 0. The active schedule is staggered and more frequent in the evening. Do not replace it merely to make it match the file; first establish why the live schedule was changed and whether its higher cadence is sustainable.


**Why no automatic repair was performed:** The repository and production migration histories are not a one-to-one sequence. Marking migrations applied based on similar names, or pushing the repository's pending files, could skip real schema changes or replay already-applied DDL. The active cron schedules also differ from the pending SQL. A safe repair requires a full mapping of every local migration to the remote history and schema effects, not just patching the final three cron files.

**Approved next reconciliation procedure:**
1. Keep production cron definitions unchanged while gathering evidence.
2. Confirm PITR/backup and export cron.job, cron.job_run_details, net._http_response, sync_status, migration history, relevant functions, tables, grants and indexes.
3. Build a migration mapping for all local files and remote ledger entries, identifying renames, squashes, splits and missing files by SQL effect—not by filename alone.
4. Determine whether the intended final PFIE schedule is the current live staggered cadence or the schedule in the latest migration; retain the live cadence unless a measured operational reason justifies a change.
5. Correct the malformed SQL in source control and create a forward-only reconciliation migration after the canonical history is established.
6. Apply changes in a controlled window, then verify exact cron job names, schedules, commands, successful HTTP responses, sync status and migration history.
7. Record the final schema/migration baseline and documented rollback.

**Do not use supabase db push, migration repair, direct edits to supabase_migrations.schema_migrations, or manual cron updates until steps 1–4 are complete.** The owner has approved reconciliation work, not an unverified production rewrite.

## Sprint calendar

| Date | Focus | Exit condition |
|---|---|---|
| 22 Nov | Scope freeze, readiness baseline, migration/cron read-only audit | Five P0 workstreams have owners and current status |
| 23–24 Nov | PFIE competition health and manual odds QA | Launch data scope is reliable; manual odds journey passes |
| 25–26 Nov | Registration, Founding Member journey, payment sandbox | Core account and payment tests pass or features remain disabled |
| 27 Nov | Responsible-gambling, privacy, affiliate and legal review | No unresolved high-severity compliance blocker |
| 28 Nov | Mobile, browser, accessibility, performance and regression | Critical defects fixed or affected feature removed from launch |
| 29 Nov | Production rehearsal, backups, cron monitoring and runbook | Rollback/disable plan and support coverage verified |
| 30 Nov | Release freeze and final smoke tests | Owner signs off the release checklist |
| 1 Dec | Public MVP launch | Active monitoring and incident triage |

## Launch-day checklist — 1 December

- [ ] Confirm production deployment SHA and environment.
- [ ] Test sign-up/login, onboarding, predictions, pick submission, manual odds, results and community.
- [ ] Test PuntPoints and paid flows only if they passed their gates.
- [ ] Confirm fixture/result/standings timestamps and cron health.
- [ ] Confirm automated bookmaker odds and comparison UI remain disabled.
- [ ] Verify 18+, responsible-gambling notices, affiliate labels and restricted-user behaviour.
- [ ] Monitor server/database errors, email delivery, payment webhooks, quota spend and performance.
- [ ] Keep a live issue log with severity, owner, workaround and next update.
- [ ] Avoid non-essential schema changes and feature releases during launch day.

## Post-launch milestones

### 2–7 December — Stabilise
- Review registration completion, first-pick activation, repeat use, support tickets and production errors.
- Fix onboarding friction and high-severity PFIE source failures.
- Review Parallel usage and prepaid balance expiry before optional backfills.
- Do not enable bookmaker extraction without written source permission.

### 8–14 December — Reconcile and specify
- Complete the full migration baseline mapping and execute the approved reconciliation plan.
- Define event-level match-stat metric contracts and canonical team/player identifiers.
- Contact bookmakers and odds-data vendors for written data rights and South African coverage.
- Improve admin PFIE diagnostics and competition coverage.

### 15–31 December — Controlled data expansion
- Pilot one authorized odds provider internally before any public price display.
- Add dedicated event-level stats only after metric definitions and source rights are clear.
- Add date-effective player/roster records with provenance and stale/unavailable states.
- Wire PR #195 evidence foundations only after migration baseline, security and tests are resolved.
- Release only features with measured coverage, freshness, cost and legal approval.

### January 2027 — Expand on readiness
- Enable additional sports only after ingestion, grading, UX, responsible-gambling and support gates pass.
- Review retention, paid conversion, reward economics and acquisition quality.
- Decide whether PFIE should become a commercial data product only after data rights, reliability, demand and unit economics are demonstrated.

## Related documents

- [Parallel data architecture](../docs/PARALLEL_ARCHITECTURE.md)
- [PFIE integration notes](../docs/PFIE_INTEGRATION.md)
- [PFIE match intelligence plan](../docs/PFIE_MATCH_INTELLIGENCE_PLAN.md)
- [Self-Exclusion & Education Programme plan](../docs/SELF_EXCLUSION_PROGRAM_PLAN.md)
- [Legal changelog](../docs/legal-changelog.md)


## Draft PR resolution tracker (owner decision, 22 November 2026)

This tracker is part of the MVP Launch Hardening sprint. It distinguishes work that must be completed before launch from work explicitly deferred until after launch.

| PR | Target | Current status | Required exit criteria | Production constraint |
|---|---|---|---|---|
| [#185 La Liga source coverage](https://github.com/jobbyist/punthubv2/pull/185) | Pre-launch | Draft; active priority | Exactly five configured La Liga page candidates; configuration test enforces the cap; each candidate has an independent publisher identity; strict two-publisher consensus and all existing row/date/arithmetic checks remain intact; lint, typecheck, tests, build and preview pass | Candidate configuration is not proof of live extraction success. Never publish a table without two independent validated sources |
| [#195 PFIE evidence foundation](https://github.com/jobbyist/punthubv2/pull/195) | Pre-launch merge candidate | Draft; code-hardening in progress | Fix parser/normalization defects; require captured page text for quote validation; count curated publisher domains rather than source hosts; require ZA licence evidence; use canonical team IDs for rosters; test RLS/service-role-only schema and migration syntax; clear review findings and CI | Migration can be merged as source code only after review. Do not apply, push or repair production migration history until the 101-entry local/remote baseline is fully mapped and backup/rollback are verified |
| [#196 Match intelligence / odds / exclusions](https://github.com/jobbyist/punthubv2/pull/196) | Post-launch | Draft; explicitly deferred | Reopen after MVP stabilization. Fix malformed SQL; confirm source rights and legal review; validate quotas, provenance, RLS, worker back-off, public read models, UI and end-to-end tests. Keep the exclusions page education/referral-only and verify its official contacts before any release | No automated bookmaker odds until written rights cover collection, storage, display, attribution, retention and redistribution. Do not merge or deploy as part of MVP |

### PR sequencing and dependencies

1. #185 and #195 are ready for review as separate changes; neither depends on #196. Their Vercel verification is recorded below; GitHub-hosted Actions did not acquire a runner.
2. #185 may be merged once its five-source cap, independent publisher configuration, strict consensus and full CI gates pass.
3. #195 may be merged once code/schema review and CI pass, but its migration remains unapplied in production until the migration baseline reconciliation is complete. Merge approval and production migration approval are separate decisions.
4. Keep #196 in draft through MVP launch. It is not a prerequisite for #185 or #195 and must not consume pre-launch capacity.
5. Record the final PR state, head SHA, CI result and reviewer disposition here after each milestone. Do not mark a PR merge-ready based solely on Vercel preview status.

### PR-specific acceptance checklists

**#185**
- [ ] Exactly five La Liga direct page candidates are configured.
- [ ] Source queries and direct-page candidates remain aligned.
- [ ] Tests assert the five-source cap and five independent publisher identities.
- [ ] No change weakens two-source consensus, freshness, completeness, row evidence or table-regression checks.
- [x] Focused source-cap regression, typecheck and Vercel build pass; all review threads are resolved. [ ] Production-like extraction and two-publisher consensus evidence still required. Full PFIE standings suite passes (47/47); full repository test suite has not been re-run.

**#195**
- [ ] Evidence quotes are checked against captured source-page text; missing page text rejects evidence.
- [ ] Publisher identity comes from a curated source registry mapping, not model-supplied hostnames or arbitrary subdomains.
- [ ] URL/domain normalization handles protocol, www and whitespace correctly.
- [ ] South African bookmaker sources require ZA jurisdiction, a nonblank licence reference, licence-check timestamp and terms review.
- [ ] Roster membership references a canonical PFIE team record rather than free-text team names.
- [ ] RLS is enabled and anon/authenticated have no grants on foundation tables; service-role access is explicit.
- [x] 15 evidence unit tests, targeted ESLint, typecheck and Vercel build pass; reference-price source IDs/domains are distinct and licence-gated by trigger; review threads resolved. [ ] Validate SQL in a disposable database before any production migration.
- [ ] Migration remains unapplied in production pending baseline reconciliation and owner approval.

**#196 — post-launch only**
- [ ] Remains draft and is excluded from the 1 December release scope.
- [ ] Automated odds remain disabled until written data rights are obtained and approved.
- [ ] Malformed migration SQL, worker status constraints, source independence, quota/security, provenance, RLS and end-to-end test gaps are resolved before reconsideration.



## PR hardening and merge gates — 22 November 2026

This section is part of the MVP Launch Hardening sprint. The PR order is fixed by the owner: #185 and #195 are pre-launch work; #196 is post-launch.

| PR | MVP priority | Required work before merge | Explicit exclusions |
|---|---|---|---|
| [#185 La Liga source coverage](https://github.com/jobbyist/punthubv2/pull/185) | Pre-launch P0.1 | Keep exactly five independent publisher page candidates: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst (Opta). Keep query/page arrays aligned. Add tests for count, identities and exclusions. Run standings tests, lint, typecheck, production build, Vercel preview and a production-like extraction proving at least two independent complete tables agree. | No weakening of row-level quote, arithmetic, team-count, freshness, date, regression or two-publisher consensus gates. A configured source is not verified coverage until extraction passes. |
| [#195 PFIE evidence foundation](https://github.com/jobbyist/punthubv2/pull/195) | Pre-launch P0.5 code foundation | Verify source quote against captured page text; use curated publisher-domain identity; require ZA bookmaker licence and terms evidence; use canonical team_id for roster membership; review RLS, grants, indexes, foreign keys and SQL; validate migration in a disposable database; pass unit tests, lint, typecheck, build and preview. | No bookmaker is seeded/enabled. No adapter, ingestion cron, public read view or UI is activated. The migration is not applied to production until migration-ledger reconciliation, PITR/backup and rollback approval are complete. |
| [#196 match intelligence / odds / exclusions](https://github.com/jobbyist/punthubv2/pull/196) | Post-launch only | Keep draft. Reopen after MVP launch for a separate scope review, legal/data-rights review, migration reconciliation, security/quota review and end-to-end tests. | No part of #196 is an MVP launch dependency. Automated odds remain disabled without written collection, storage, display, attribution, retention and redistribution rights. |

### Current PR execution state

- [x] #185 — five-source roster, focused cap test, typecheck and Vercel build verified; ready for review. [ ] Production-like extraction and two-publisher consensus evidence remain outstanding. Full PFIE standings suite now passes (47/47).
- [x] #195 — targeted ESLint, typecheck, 15 evidence tests, targeted ESLint, typecheck, schema/RLS/grant review, distinct reference-price source-ID/domain trigger and Vercel build verified; ready for review. [ ] Production migration remains unapplied pending full migration-baseline reconciliation and separate approval.
- [x] #196 — explicitly deferred to post-launch; no pre-launch merge or activation.

**Merge rule:** #185 and #195 are marked ready for review, not merged. #185 still requires production-like extraction and two-publisher consensus evidence. #195 may be merged as a code/schema foundation after reviewer approval, but its production migration remains a separate, blocked change until migration history and backup/rollback are reconciled.


### Verification note — 22 November 2026

- #185 focused source-cap regression: passed; typecheck: passed; Vercel production build: passed. Full PFIE standings test file: 47/47 passed after updating the source roster, team-label fallback and cumulative-row regression fixtures.
- #195 targeted ESLint: passed; typecheck: passed; evidence unit tests: 15 passed; Vercel production build: passed. Its migration SQL has been reviewed but not applied to production.
- The preview validations were run with isolated Vercel build commands. GitHub-hosted Actions did not acquire a runner, so there is no green repository-wide Actions status to claim.
