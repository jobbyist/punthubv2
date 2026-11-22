# PFIE implementation checklist

Version 1.0 · 5 November 2026 · Companion to `PFIE-Product-Technical-Blueprint.md`. Technical completion: Monday 9 November 2026. Public launch: Tuesday 1 December 2026.

## Phase 0: Founding-member acquisition (before PFIE)
- [x] `/founding` landing page, sitewide Founding bar, home hero, header and footer copy (branch `mvp/launch`, PR #42)
- [x] Legal changelog entry for the copy change
- [ ] Owner: merge PR #42 and confirm `/founding` is live on puntr.co.za
- [ ] Owner: run migration `20261105200000_privacy_r4_launch_dates.sql` in Supabase
- [ ] Post the social assets and reel; share the campaign canvas for export
- [ ] Review Founding sign-up count every Monday until 100

## Phase 1: Foundation (Fri 6 Nov)
- [ ] Migration: schema `pfie`, all ten tables, RLS on, no `anon` or `authenticated` grants
- [ ] Seed `competitions` (51, status `planned`) and `data_sources`
- [ ] Quota ledger table and settings for each provider's allowance
- [ ] Regenerate `src/integrations/supabase/types.ts`
- [ ] Legal alignment check (`docs/legal-alignment.md`) and changelog entry if anything shown or stored changes

## Phase 2: Tier A and B sources (6 to 7 Nov)
- [ ] OpenFootball importer (England first; check each other country repository's coverage and freshness)
- [ ] football-data.org adapter (12 competitions, 10 calls a minute); written answer on commercial use requested
- [ ] `source_mappings` and alias seed for Priority 1 teams
- [ ] Admin queue for unresolved names

## Phase 3: Extraction (7 to 8 Nov)
- [ ] Record terms and robots checks in `data_sources` for each source before enabling it
- [ ] Firecrawl fetcher (markdown only), content-hash cache
- [ ] Gemini extractor: JSON schema, evidence quotes, temperature 0, model name in configuration
- [ ] Read the real Gemini free-tier limits from Google AI Studio and put them in configuration
- [ ] Validator: schema, evidence match, football rules, status transitions
- [ ] Tests: hallucinated fixture rejected, injected page text ignored, duplicate ingestion is a no-op

## Phase 4: Corroboration and publishing (8 Nov)
- [ ] Observation store and corroborator (`verified`, `single_source`, `disputed`)
- [ ] Confidence formula from section 7.2, with unit tests
- [ ] Publisher into `pfie.fixtures` and `pfie.results`; append-only change log
- [ ] Projection into `public.fixtures` (`provider = 'pfie'`); settlement tests still pass
- [ ] Grading only on `verified` results

## Phase 5: Feeds and integration (8 to 9 Nov)
- [ ] CSV and JSON export routes
- [ ] "Last verified" shown beside fixtures in the app (through i18n keys)
- [ ] Planner: tiered schedule, quota modes (Normal, Conserve, Critical, Exhausted)
- [ ] pg_cron jobs through `public.invoke_cron` (not Vercel Cron)
- [ ] Nightly backup job and a tested restore

## Phase 6: QA and deploy (Mon 9 Nov)
- [ ] Compare Priority 1 fixtures with official sources by hand
- [ ] Drill: quota exhausted, source down, Gemini returns bad JSON, conflicting kick-offs
- [ ] Deploy and watch the first scheduled runs
- [ ] `bun run lint && bun run build` pass; PR description says what legal copy changed

## Phase 7: Coverage and monitoring (10 to 30 Nov)
- [ ] Switch competitions to `active` one at a time, only after the source rule is met
- [ ] Review the admin queue daily
- [ ] Check quota ledger weekly; keep Firecrawl under 70% by 29 November
- [ ] Confirm no page claims live scores, odds or complete coverage

## Owner decisions
- [ ] D1 Vercel plan and commercial-use restriction
- [ ] D2 Parallel: use with a card that cannot be charged, or skip
- [ ] D3 Written commercial-use answers from Firecrawl and football-data.org
- [ ] D4 Pick-lock rules (blueprint 7.3)
- [ ] D5 Scope of 9 November
- [ ] D6 When to start API stage S1 (after launch, subject to counsel)


## 22 Nov 2026 — MVP PR sequencing addendum

- PR #185 is a pre-launch priority. La Liga direct-page candidates are capped at five independent publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst. Keep strict two-source consensus and all existing deterministic checks.
- PR #195 is a pre-launch merge candidate for reusable evidence and schema foundations. Before merge, require captured page text for quote verification, curated publisher identity, ZA bookmaker licence evidence, canonical PFIE team IDs for rosters, service-role-only grants/RLS, migration validation and passing CI.
- PR #195's migration must not be applied to production until the full migration baseline, PITR/backup and rollback plan are reconciled and approved. A repository merge is not a production migration approval.
- PR #196 is explicitly post-launch and must remain draft during the 1 December release. Automated odds remain disabled until written data rights and legal/security/production validation are complete.


## 22 Nov 2026 — PR hardening and release sequencing

### PR #185 — La Liga source coverage (pre-launch)
- [ ] Keep exactly five independent direct-page publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst (Opta).
- [ ] Keep the query list and page list aligned at five; test source count and publisher identity.
- [ ] Preserve complete-team, row-level quote, arithmetic, date/freshness and regression checks.
- [ ] Verify two independent publishers agree on every material table statistic in a production-like extraction.
- [x] Focused five-source cap regression, typecheck and Vercel production build pass; review threads resolved. [ ] Complete production-like extraction and two-publisher consensus. Full PFIE standings test file passes (47/47).

### PR #195 — reusable evidence foundation (pre-launch)
- [ ] Require every evidence quote to be present in captured source-page text.
- [ ] Use trusted source-registry publisher identities; subdomains of one publisher do not count as independent.
- [ ] Require ZA jurisdiction, nonblank licence reference, valid licence-check timestamp and recorded terms review before a bookmaker source is permitted.
- [ ] Store roster membership against canonical PFIE team UUID, not free-text team names.
- [ ] Review SQL constraints, foreign keys, RLS, grants, indexes and service-role-only access; validate in a disposable database.
- [x] 15 evidence unit tests, targeted ESLint, typecheck and Vercel production build pass; review threads resolved.
- [ ] Keep all sources disabled/unseeded and do not add adapters, cron jobs or public read access in this PR.
- [ ] Do not apply the migration to production until the 101-entry migration baseline is mapped and backup/PITR/rollback approval is documented.

### PR #196 — post-launch only
- [x] Owner decision: defer PR #196 until after the 1 December MVP launch.
- [ ] Keep it draft and out of pre-launch merge/release scope.
- [ ] After launch, conduct separate data-rights, legal, security, quota, migration and end-to-end review before implementation or activation.

**Current state (22 Nov 2026):** PR #185 remains draft: five-source configuration, team-resolution regressions, standings tests (47/47), typecheck and Vercel build pass. Four remaining full-suite failures also reproduce on main; production-like extraction and two-publisher consensus remain launch QA gates. PR #195 remains draft: 15 evidence tests, targeted Prettier/ESLint, typecheck and Vercel build pass; all review findings are resolved, but isolated SQL validation is pending because the only Supabase branch is MIGRATIONS_FAILED. Its migration remains unapplied. PR #196 remains post-launch only.


- [x] Reference-price schema stores source IDs and publisher domains separately; bookmaker count is tied to both array cardinalities.
- [x] Database trigger rejects duplicate source IDs/domains, unlicensed/non-ZA sources, and domain/source mismatches.
- [ ] Validate the trigger in a disposable database before any production migration.


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
