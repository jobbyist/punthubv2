# Puntr development workspace

**Status:** 22 November 2026  
**MVP launch target:** 1 December 2026  
**Sprint:** MVP Launch Hardening (22–30 November)

This folder is the operational workspace for launch readiness. The checklist is evidence-driven: do not mark an item complete because code exists; mark it complete only after the production-like test and sign-off.

## Start here

- [MVP Launch Hardening — readiness dashboard and checklists](./IMPLEMENTATION-PRIORITIES.md)
- [Parallel data architecture](../docs/PARALLEL_ARCHITECTURE.md)
- [PFIE integration notes](../docs/PFIE_INTEGRATION.md)
- [PFIE match intelligence plan](../docs/PFIE_MATCH_INTELLIGENCE_PLAN.md)
- [Self-Exclusion & Education Programme plan](../docs/SELF_EXCLUSION_PROGRAM_PLAN.md)
- [Legal changelog](../docs/legal-changelog.md)

## Current launch decision

- **Launch without automated bookmaker odds.** Use the existing member-entered bookmaker/odds workflow. Preserve submitted prices and timestamps, and label them user-submitted.
- No South African bookmaker has yet supplied Puntr with an authorized odds API, affiliate feed or other odds-data integration. Parallel Search/Extract/Monitor do not grant permission to scrape, store, display or redistribute bookmaker prices.
- Launch sport is football/soccer. Other sports remain gated by feed and grading readiness.
- Keep event-level stats, full player/roster intelligence and automated odds outside the 1 December launch-critical path.

## Readiness dashboard

| Priority | Workstream | Status |
|---|---|---|
| P0.1 | PFIE fixture, result and standings reliability | In progress |
| P0.2 | Manual odds workflow | In progress — QA required |
| P0.3 | Registration and Founding Member activation | Not verified |
| P0.4 | Payments, affiliate and responsible-gambling compliance | Not verified |
| P0.5 | Production operations and release readiness | Blocked pending migration baseline reconciliation |

See the full checklist for evidence and completion criteria. Update the status table when an item changes; add a dated note with evidence rather than silently changing historical findings.

## Production audit snapshot (22 November)

- Production migration ledger: 101 entries; last version 20261121235610.
- Repository main: 101 migration files, but only one exact version-prefix match with the production ledger. Several migrations are renamed, split or consolidated. Do not run a blind migration push or repair.
- Four PFIE table cron jobs are active (IDs 61–64), but their live schedules differ from the latest pending schedule migration.
- The first pending PFIE schedule migration contains malformed dollar-quote syntax.
- Standings: 7/12 scopes have a recorded success; 5 have never succeeded. Odds: 0/11 scopes have a recorded successful sync.
- Recent fixture/result runs exist. cron.job_run_details has 17,919 records overall, but none yet for the new PFIE table job IDs 61–64 as of 01:22 UTC; their first scheduled window begins at 02:10 UTC. Other scheduled jobs continue to run. net._http_response showed recent successful Vercel responses and one 55-second timeout without enough request metadata to attribute it to a specific job.
- No production migration history, cron schedule or schema changes were made during the audit.

The safe reconciliation plan is documented in the readiness checklist. Production changes require a complete migration mapping and verified backup/rollback plan.

## Pull request triage (22 November)

| PR | Status | Decision |
|---|---|---|
| [#200 Launch-hardening workspace](https://github.com/jobbyist/punthubv2/pull/200) | **Merged to main** | Readiness dashboard, checklists, architecture and legal changelog are now live in the repository |
| [#185 La Liga source coverage](https://github.com/jobbyist/punthubv2/pull/185) | Ready for review — pre-launch | Five independent publishers (LaLiga, TACTIX, Football Edge Lab, Flashscore, The Analyst/Opta); full standings suite (47/47), typecheck and build pass; live extraction/consensus evidence remains a release gate |
| [#195 PFIE evidence foundation](https://github.com/jobbyist/punthubv2/pull/195) | Ready for review — pre-launch | 15 evidence tests, targeted ESLint, typecheck and Vercel build pass. Curated publisher identity, page-text quote checks, ZA licence gate, canonical team IDs, distinct reference-price source IDs/domains and service-role-only schema. Production migration remains separately blocked |
| [#196 Match intelligence / odds / exclusions](https://github.com/jobbyist/punthubv2/pull/196) | Draft — post-launch | Explicitly deferred from MVP. No automated bookmaker odds without written data rights. Revisit match-intelligence workers, exclusions scope, migration, security and legal validation after launch |
| #173, #177 | Closed, not merged | Their code paths are already present in main |
| #183 | Closed, not merged | Duplicate of #185 |
| #81 | Closed, not merged | Owner-confirmed draw terms were carried into the legal changelog in PR #200 |


## PR execution sequence (owner decision, 22 November 2026)

- **#185 — pre-launch:** ready for review. Five-source cap, focused regression, typecheck and build pass. Keep strict two-independent-publisher consensus; source candidates do not count as verified coverage until extraction and validation succeed.
- **#195 — pre-launch merge candidate:** ready for review after targeted lint, typecheck, 15 evidence tests and Vercel build passed. The migration may be merged into source control only after review; do not apply it to production until the full migration baseline and backup/rollback plan are reconciled.
- **#196 — post-launch:** keep draft and out of the 1 December critical path. Automated odds remain disabled pending written collection/storage/display/redistribution rights. Revisit its match-intelligence workers, exclusion-page scope, migration and compliance gates after launch.

A successful preview deployment is not a substitute for test, security, data-rights or production-migration approval.


### Verification snapshot (22 November 2026)

- PR #185: focused five-source cap test passed; TypeScript typecheck and Vercel production build passed. The full PFIE standings test file passes (47/47). Live extraction and two-publisher consensus remain unverified until a production-like run. Live extraction and two-publisher consensus remain unverified until a production-like run.
- PR #195: targeted ESLint, TypeScript typecheck, all 15 evidence tests and Vercel production build passed. Review threads are resolved and the branch is mergeable. Its migration is not applied to production.
- PR #196 remains draft and post-launch only.
- GitHub-hosted Actions jobs did not acquire a runner; no failing workflow was left in the repository. Validation evidence above comes from isolated Vercel preview builds, not a green repository-wide Actions pipeline.

