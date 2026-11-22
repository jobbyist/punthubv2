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

See the full checklist for evidence and completion criteria. The live `/dev` page now includes a PR Draft Resolution Tracker for #185/#195 pre-launch and #196 post-launch, with persistent admin-editable gate ticks, cleared/open/deferred states and next actions. Update the status table when an item changes; add a dated note with evidence rather than silently changing historical findings.

## Production audit snapshot (22 November)

- Production migration ledger: 101 entries; last version 20261121235610.
- Repository main: 101 migration files, but only one exact version-prefix match with the production ledger. Several migrations are renamed, split or consolidated. Do not run a blind migration push or repair.
- Historical results: `completed_matches` currently contains **7,781 rows**, exceeding the 2,500-result minimum by 5,281. The `/dev` tracker reads this metric live and automatically marks the threshold task complete.
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
| [#185 La Liga source coverage](https://github.com/jobbyist/punthubv2/pull/185) | Draft — pre-launch | Five independent publishers; standings suite 47/47, typecheck and Vercel build pass. Four remaining full-suite failures also reproduce on main; this PR resolves nine additional standings regressions. Live extraction/consensus remains a launch QA gate |
| [#195 PFIE evidence foundation](https://github.com/jobbyist/punthubv2/pull/195) | Draft — pre-launch; isolated SQL validation pending | 15 evidence tests, targeted Prettier/ESLint, typecheck and Vercel build pass. Review findings resolved; case-insensitive publisher-domain guard added. The only Supabase branch is MIGRATIONS_FAILED, so isolated migration validation is blocked; production migration remains unapplied |
| [#196 Match intelligence / odds / exclusions](https://github.com/jobbyist/punthubv2/pull/196) | Draft — post-launch | Explicitly deferred from MVP. No automated bookmaker odds without written data rights. Revisit match-intelligence workers, exclusions scope, migration, security and legal validation after launch |
| #173, #177 | Closed, not merged | Their code paths are already present in main |
| #183 | Closed, not merged | Duplicate of #185 |
| #81 | Closed, not merged | Owner-confirmed draw terms were carried into the legal changelog in PR #200 |


## PR execution sequence (owner decision, 22 November 2026)

- **#185 — pre-launch:** keep draft while the full-suite baseline is documented. Five-source cap and team-resolution regressions are covered; standings tests pass 47/47, typecheck and Vercel build pass. Four remaining full-suite failures also reproduce on main; this PR fixes nine additional standings failures. Production-like extraction remains a launch QA gate.
- **#195 — pre-launch foundation:** keep draft until the migration is validated in an isolated database. Evidence tests (15/15), targeted Prettier/ESLint, typecheck and Vercel build pass; review findings are resolved. Supabase's only branch is MIGRATIONS_FAILED, so do not attempt a branch migration or production apply until the baseline is repaired.
- **#196 — post-launch:** keep draft and out of the 1 December critical path. Automated odds remain disabled pending written collection/storage/display/redistribution rights. Revisit its match-intelligence workers, exclusion-page scope, migration and compliance gates after launch.

A successful preview deployment is not a substitute for test, security, data-rights or production-migration approval.


### Verification snapshot (22 November 2026)

- PR #185: five-source cap and team-resolution regressions pass; standings tests 47/47, typecheck and Vercel build pass. Full suite has four failures across three files on this branch; the same four fail on main, while main has nine additional standings failures (13 total). Production-like extraction/two-source consensus remains a launch QA gate.
- PR #195: 15 evidence tests, targeted Prettier/ESLint, typecheck and Vercel build pass. Review threads are resolved, including case-insensitive www normalization. Full suite remains at 13 baseline failures on both main and this branch. Disposable SQL validation is blocked by the only Supabase branch being MIGRATIONS_FAILED; migration remains unapplied.
- PR #196 remains draft and post-launch only.
- GitHub-hosted Actions jobs did not acquire a runner; no failing workflow was left in the repository. Validation evidence above comes from isolated Vercel preview builds, not a green repository-wide Actions pipeline.



## Latest PR verification snapshot — 22 November 2026

**#185 — La Liga source coverage (pre-launch; still draft)**
- Current branch head: 051f4e03bf34e6241fc9f0ac0ea22de6340de477.
- Five configured independent publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst (Opta). The source-cap regression test asserts five unique publisher identities.
- Targeted verification: TypeScript typecheck, Vercel build and standings suite (47/47) pass. Prettier also flags standings.ts and standings.test.ts on current main; this inherited formatting debt is not new to this PR.
- Production build and Vercel preview are ready: https://punthubv2-ebq8bm0or-michael-chigbus-projects-6fad9571.vercel.app
- The full repository test command remains red on this head (4 failed tests across 3 files; one confirmed mismatch is the existing PFIE provider model-fallback expectation). Do not treat the targeted suite as a substitute for the repository-wide gate. Production-like extraction and two-publisher consensus evidence are also still required.

**#195 — PFIE evidence foundation (pre-launch; still draft)**
- Current branch head: 1b6f2e7cede4f05236ba419cb61f71a1c66b1382.
- Targeted verification: formatting, ESLint, TypeScript and the evidence suite passed (15/15).
- Production build and Vercel preview are ready: https://punthubv2-lskkd1to6-michael-chigbus-projects-6fad9571.vercel.app
- The full repository test command remains red on this head (13 failed tests across 4 files, including two season-backfill fixture failures on this branch). The current branch's targeted evidence suite passes, but the full-suite baseline must be reconciled before merge.
- Disposable-database SQL validation and the final schema/RLS/grant review remain outstanding. The migration is source-control only and must not be applied to production before migration-ledger reconciliation and separate backup/PITR/rollback approval.

**#196 — post-launch only**
- Keep draft and outside the MVP release scope. No automated bookmaker odds, match-intelligence worker or exclusions feature from #196 is enabled for MVP.

**Merge decision:** #185 and #195 remain drafts. A ready Vercel deployment proves the build can deploy; it does not clear a failing full test suite, missing production-like data evidence, or the #195 disposable-schema validation gate.
