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
| [#185 La Liga source coverage](https://github.com/jobbyist/punthubv2/pull/185) | Draft — pre-launch priority | Fix five-source configuration, enforce cap in tests, preserve independent two-publisher consensus; validate extraction and CI |
| [#195 PFIE evidence foundation](https://github.com/jobbyist/punthubv2/pull/195) | Draft — pre-launch merge candidate | Harden evidence/domain/licensing validation and canonical roster identity; merge only after code review and CI. Migration remains unapplied until production baseline reconciliation |
| [#196 Match intelligence / odds / exclusions](https://github.com/jobbyist/punthubv2/pull/196) | Draft — post-launch | Explicitly deferred. No automated odds without written data rights; fix migration, complete production/security/legal validation and test the match-intelligence/exclusions scope after launch |
| #173, #177 | Closed, not merged | Their code paths are already present in main |
| #183 | Closed, not merged | Duplicate of #185 |
| #81 | Closed, not merged | Owner-confirmed draw terms were carried into the legal changelog in PR #200 |


## PR execution sequence (owner decision, 22 November 2026)

- **#185 — pre-launch:** complete the five-source La Liga configuration and source-cap tests. Keep strict two-independent-publisher consensus; source candidates do not count as verified coverage until extraction and validation succeed.
- **#195 — pre-launch merge candidate:** complete deterministic evidence validation, curated publisher identity, South African bookmaker licence checks, canonical team/roster identity, migration SQL review and tests. The migration may be merged into source control only after review; do not apply it to production until the full migration baseline and backup/rollback plan are reconciled.
- **#196 — post-launch:** keep draft and out of the 1 December critical path. Automated odds remain disabled pending written collection/storage/display/redistribution rights. Revisit its match-intelligence workers, exclusion-page scope, migration and compliance gates after launch.

A successful preview deployment is not a substitute for test, security, data-rights or production-migration approval.
