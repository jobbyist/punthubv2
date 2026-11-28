# Puntr MVP — Launch Scope & Change Log

Last updated: 28 November 2026

## Pre-launch release priorities

The MVP remains focused on stabilising the existing Puntr product and making PFIE dependable before the 1 December 2026 launch. PUNT AI feature implementation is deferred to the post-MVP phase.

### Priority standings coverage — ten competitions

1. Betway Premiership (PSL) — `psl`
2. English Premier League — `epl`
3. English Championship — `championship`
4. La Liga — `laliga`
5. UEFA Champions League — `ucl`
6. UEFA Conference League — `uecl`
7. Bundesliga — `bundesliga`
8. Serie A — `seriea`
9. Ligue 1 — `ligue1`
10. CAF Confederation Cup — `caf-cc`

### Deferred until after MVP launch

Saudi Pro League (`saudi-pro`) and Liga Portugal (`primeira`) are outside the ten-competition pre-launch scope. Do not prioritise additional source expansion, backfills, refreshes, or league-specific refinements for these competitions until the ten launch competitions meet their acceptance criteria.

Other post-launch competitions remain deferred according to `STANDINGS_POST_LAUNCH_KEYS` in `src/lib/pfie/standings.ts`.

## PFIE pre-launch acceptance criteria

Each of the ten priority competitions must be checked for:

- Correct competition identity, season, participating teams and table structure.
- Fresh, complete standings and fixture/result coverage.
- Source quality and freshness, including official sources where available.
- Independent publisher corroboration when the official source is incomplete or stale.
- Existing deterministic validation: team counts, table arithmetic, freshness, and consensus rules must pass before data is persisted.
- No publication of ambiguous, disputed, or insufficiently corroborated data.
- Successful scheduled syncs, useful audit records, and safe quota behaviour.
- Regression coverage for previously observed failures.

Secondary standings publishers are enabled only for the ten priority launch competitions. A single secondary publisher must not become sufficient evidence by itself; the existing validation and consensus rules remain in force.

## Engineering and release policy

- Vercel preview deployment must reach `READY` for the exact PR head SHA before merge.
- GitHub Actions are not used as a PR acceptance gate.
- Review the code diff and relevant regression coverage before merging.
- Do not merge a PR solely because an older commit on its branch has a successful preview.
- Record merged changes, purpose, validation and follow-up items here.
- Keep preview validation distinct from production deployment verification.
- Do not increase provider budgets or daily quotas without a separate, evidence-based approval.

## Change log

### 28 November 2026

- **PR #383 — PFIE quota-aware model routing:** merged. The router now respects provider quota headroom and skips capped providers instead of repeatedly attempting unavailable models. Vercel preview was READY before merge.
- **PR #384 — Championship standings source consensus:** merged. Restored independent source consensus for Championship standings. Vercel preview was READY before merge.
- **PR #385 — PFIE verified unmatched results:** merged. Preserves Paris FC as distinct from generic Paris labels and persists publishable terminal PFIE results when the fixture schedule is missing or mislabels the match. Vercel preview was READY before merge.
- **PR #386 — Newsroom quota-aware fallback:** merged. Parallel Medium remains preferred with Parallel Low fallback; usage accounting includes refused attempts and provider caps. Denied provider claims are memoized within a job. Vercel preview was READY before merge.
- **PR #352 — PFIE results model-scope incident:** the fix was already present on `main` and the results-path audit regression test was present. The PR branch was 38 commits behind and conflicted with later PFIE changes; closed as superseded. No force-merge was performed.
- **PR #305 — older secondary standings source change:** closed as superseded by the scoped implementation in PR #387.
- **PR #387 — trusted secondary standings publishers:** merged after the exact updated PR head (`c34f8c0`) received a Vercel preview marked `READY`. Secondary-source expansion is restricted to the ten priority launch competitions; regression coverage explicitly excludes Saudi Pro League (`saudi-pro`) and Liga Portugal (`primeira`).
- **PR #380 — GitHub Actions typecheck/lint workflow:** closed without merging. Vercel is the required PR build gate; GitHub Actions are not used as an acceptance requirement.
- **PR #331 — community AI participant badges:** merged after its exact PR head received a Vercel preview marked `READY`. AI participant profiles now use the Pro badge treatment, while AI-generated posts retain a separate disclosure.
- **PR #303 — older result-sync rotation branch:** closed because it was 85 commits behind, conflicted, and bundled unrelated changes and GitHub Actions modifications. Its relevant fairness fix was reimplemented cleanly in PR #388.
- **PR #388 — fair unresolved-result rotation:** merged after the exact PR head received a Vercel preview marked `READY`. The 12-fixture batch now rotates every 30-minute cron slot, is scoped to the active provider, and preserves PFIE's verified unmatched terminal results.
- **PR #389 — defer Saudi Pro League and Liga Portugal refreshes:** merged after the exact PR head received a Vercel preview marked `READY`. PFIE fixture/result selection now skips `saudi-pro` and `primeira`; the standings scheduler was already limited to the ten launch keys. Regression coverage confirms these deferred competitions generate zero PFIE calls and no run records.
- **PR #390 — deterministic plain-text standings extraction:** merged after the exact PR head received a Vercel preview marked `READY`. Adds deterministic parsing for full plain-text tables and configures the Sports Mole Championship table as a direct source. The test preserves Southampton's four-point deduction without weakening the points validation rule. Next production sync must confirm two independent Championship tables validate and the stale standings are refreshed.
- **PR #391 — desktop push opt-in and empty-audience safety:** merged after the exact PR head received a Vercel preview marked `READY`. Signed-in desktop users can explicitly opt in; empty audiences are rejected before campaign creation; admin tests only report success after at least one confirmed delivery. Real-device push verification remains outstanding.
- **PR #392 — bounded Championship fixture retry:** merged after the exact PR head received a Vercel preview marked `READY`. Parallel Low remains the default; only Championship fixture JSON repair retries prefer Medium, subject to the existing quota guard, with Low fallback.
- **PR #210 — older PWA hardening branch:** closed as superseded by the clean current-main implementation in PR #391; responsive ticker/rail, reduced-motion and Afrikaans fixes were already present on main.
- **PR #195 — PFIE verified data-products foundation:** not merged. Its preview is from an old branch 325 commits behind current `main`; the schema/evidence-ledger foundation needs a fresh current-main review and is not required to stabilise the ten launch competitions.
- **PR #196 — match intelligence, odds and exclusions:** not merged. Its branch is 358 commits behind and contains substantial match-intelligence and odds feature work. Defer this bundle pending the post-MVP scope decision; responsible-gambling content can be reviewed separately if needed.
- **PR #210 — PWA desktop hardening:** not merged. Its branch is 229 commits behind and has conflicts despite an older READY preview; port only validated UX fixes into a current-main PR if they remain launch-critical.
- **PUNT AI:** recommend deferring new AI-facing product implementations until after MVP launch. Pre-launch engineering capacity is reserved for PFIE reliability, the ten priority competitions, existing product functionality, UX refinement and production readiness.

- **PR #398 — bookmaker profiles, reviews and 1xBet:** every `/bookmakers` entry opens a profile (popup via `?bookmaker=<slug>`, full page `/bookmakers/<slug>`) with licence, payment methods, SA popularity (Semrush Oct 2026), member ratings/reviews, logo and dated sources (`src/lib/bookmaker-profiles.ts`). 1xBet added as an offshore Curaçao entry; affiliate "Visit" box only for live partners (Ad, 18+ gate, T&Cs, helpline). Migration `20261128310000_bookmaker_reviews.sql` is **not applied** yet (connector approval auto-cancelled); the review UI stays hidden until it is. Next: apply the migration and regenerate types; counsel to rule on promoting 1xBet without an SA provincial licence; refresh payment data from operator cashiers (several withdrawal lists unverified); check the Hollywoodbets brand_logos image (file name suggests it was swapped with Parallel.ai's); add Afrikaans `bookmakers.json`.

## Outstanding pre-launch work

- Complete PFIE source, consensus, freshness and result-sync audits across all ten priority competitions.
- Verify that the next Championship standings run produces two independent validated full tables and refreshes the 24-team persisted table; do not publish a single-source result.
- Verify the latest Vercel production deployment and scheduled sync outcomes after each merged PFIE change.
- Complete a real desktop-browser opt-in and test push, then verify installed iOS/Android PWA delivery on owner devices.
- Review remaining open PRs individually; merge only when their current head SHA has a READY Vercel preview and the change is still in scope.
- Defer Saudi Pro League and Liga Portugal refinements until the priority ten are stable.


## 28 November 2026 — PFIE Production Readiness audit (Phase 1 started)

- **Programme tracking:** the Platform Updates admin tab is being extended with six phase-level trackers. The existing `platform_implementation_tasks` and `platform_implementation_task_events` tables remain the source of truth; no duplicate project-management schema is introduced.
- **Production baseline:** main commit `9eb0679acd2c4cb4578fd9103e78d5328d2849cd`; latest production Vercel deployment for that commit is `READY`.
- **Standings:** Championship has six consecutive failed runs; the last successful persisted table is dated 18 November 2026. The 28 November attempt still failed after extraction retry. The other nine priority standings scopes have a successful sync recorded between 27 and 28 November.
- **Results:** the 24-hour PFIE run ledger records a UECL results failure with `answer is not defined` and a CAF Confederation Cup results quota refusal. The Championship fixture run also failed JSON extraction after one retry. Root-cause tracing for the UECL runtime error remains open; do not treat the ledger message alone as a confirmed code-level diagnosis.
- **Scope drift:** standings are explicitly limited by `STANDINGS_LAUNCH_KEYS`, but fixture/results selection still starts from the broader active competition registry and only excludes Saudi Pro League and Liga Portugal. Production run history contains other non-priority competitions. Phase 2 must align fixture/results work with the ten launch keys while retaining the two named deferrals.
- **Parallel usage:** on 28 November the usage ledger recorded 675 Search calls, 624 Extract calls, 246 Low Responses calls and 9 Medium Responses calls. At configured unit prices this is approximately $4.21 across PFIE and other platform features for that day. Month-to-date family spend at audit time: core $7.687 / $50, Newsroom $30.45 / $50, auxiliary $0.01 / $35, synthetic $0.015 / $50. The shared cumulative allowance is $200 from 28 November 2026 through 31 March 2027; measured spend within that period is approximately $4.209 at the time of the query.
- **Learning data:** the real-activity learning-signals view correctly filters to verified, approved `real_activity_event` records. However, the broader `pfie_training_dataset` view includes all approved, verified sources; two approved `synthetic_session` examples currently appear alongside nine real-activity examples. Phase 5 must explicitly preserve real activity as primary and synthetic QA as secondary.
- **Security:** Supabase reports 39 informational RLS-without-policy findings. The inspected Platform Updates and PFIE learning tables have service-role-only grants and are accessed through admin/server-side functions; these are not automatically public-access vulnerabilities. The public-read `sync_status` policy and its error/metadata fields require a separate exposure review.
- **Cross-platform errors:** Vercel's 24-hour error aggregation includes a stale PostgREST schema-cache error for `team_follower_counts(p_sport)` even though the function exists in the database, plus team-badge write/constraint errors on older deployments. Current-main call sites now pass named quota features; verify whether these errors persist after the latest production deployment before changing code.
- **Open PRs:** #195 remains draft and requires isolated migration validation plus backup/rollback review; #196 remains draft and post-launch-only. #185 is merged.
- **No production schema or provider-budget changes were made as part of this audit snapshot.**


- **PR #393 — PFIE six-phase production readiness tracker:** merged after the exact PR head `666c7901ddf1b2d24014c5cd07385042d63bc2a3` received a Vercel preview marked `READY`. Admin → Platform Updates now presents all six phases, progress bars, phase status, expandable acceptance criteria and links to the existing task editor. Six phase records and six audit events were seeded into the existing Supabase implementation tracker; Phase 1 is `in_progress` at 45%, with Phases 2–6 planned. The merged production commit `a20693cf5fd35b2ce24f6204c5e17673b7a4d651` has a Vercel production deployment marked `READY`.


### Phase 1 follow-up — database integrity, history and archive audit

- **Critical — standings mutation guard:** `apply_result_to_standings` currently has no ten-competition allowlist or fixture/table season check. Its application ledger records 9 Championship results, 5 Saudi Pro League results and 1 Liga Portugal result applied to standings. The latter two competitions are deferred. The Championship source snapshot is dated 18 November and contains 46–49 played per team; later results have been incrementally added to those stale rows. The table is therefore a mixed snapshot and must not be treated as current.
- **Critical — corrected result handling:** `standings_applied` stores only competition key, fixture ID and applied time. A corrected final score hits `already_applied` and is not reversed/reapplied. The result trigger needs an auditable correction/reconciliation design.
- **High — archive scope:** `archiveJobsDue` iterates all `ARCHIVE_SOURCES`, not the ten launch keys. The archive registry includes Eredivisie, Liga Portugal and Saudi Pro League; current-season archive jobs for these keys ran on 28 November. Apply the same pre-launch allowlist to archive work.
- **High — history freshness:** `syncHistory` skips a competition once team match counts are considered sufficient, without checking the latest stored match date. It can mark zero verified rows as a successful run. The UECL history table currently ends on 15 October. Replace the one-time-only logic with bounded incremental refresh and explicit empty-window proof.
- **High — history corroboration:** `verifyHistory` counts raw distinct domains rather than the curated independent-publisher identity used by fixture/result corroboration. Canonicalise publishers before counting independent sources.
- **High — archive completeness:** the 28 November Championship archive run reported success with 107 verified matches and zero inserted, while persisted Championship history still ends on 7 November. Archive success currently requires only a non-empty verified result set; add season-coverage checks before marking a snapshot complete.
- **Medium — corrected historical scores:** `team_results` has a unique natural-match index and the current 7,982 rows contain no duplicate match keys. However, `insert_team_results` uses `ON CONFLICT DO NOTHING`, so a corrected score for an existing match is not propagated to history.
- **Competition scope:** the standings/history/season scheduler already uses the ten launch keys, but fixture/results selection and archive scheduling do not consistently share that allowlist. The seven-day run ledger confirms activity across numerous additional competitions.
- **Provider routing:** older 28 November history/season runs recorded Gemini models. Current main's sync-tables route is explicitly Parallel Responses Low only, and the latest observed CAF-CC/UECL history runs use `parallel-low`. Verify all post-deployment calls remain on Parallel.
- **Phase 1 tracker:** the admin Platform Updates phase-one task is now 70% complete; remaining audit work is to finish the severity-ranked issue register and reconcile post-deployment job evidence before Phase 2 begins.

- **High — source independence:** fixture/result corroboration in `corroborate.ts` also counts raw hostnames. `domainOf` removes only `www`, so publisher subdomains (for example, ESPN properties) can be treated as separate trusted publishers. Standings has a curated `independentSourceKey` map, but fixtures/results and history do not share it. A common canonical publisher identity helper is required across all three pipelines.
- **High — failure diagnostics:** the PFIE provider catch path stores only `error.message` in `pfie_runs`, not the failing stage or stack. The UECL `answer is not defined` record has six source entries but no model or decisions; its exact failing stage cannot be isolated from the persisted run. Add bounded, redacted server-side error diagnostics.

- **Migration provenance:** live Platform Updates tables, the three-argument `api_budget_claim`, revised `api_family_spend_usd` and the 18/day Newsroom Medium quota exist, but the corresponding repository migration names `platform_updates_and_implementation_checklist`, `api_usage_attribution_and_pfie_budget_routing`, `fix_parallel_budget_spend_reporting` and `parallel_newsroom_medium_quota_headroom` are absent from `supabase_migrations.schema_migrations`. Reconcile exact live definitions before any rerun; do not blindly replay migrations that may insert archive rows or reset budget limits.
- **Global spend display:** the $200 guard in `api_budget_claim` counts every `parallel%` provider, but `api_spend_period_status` filters through `api_provider_family = 'parallel'`, omitting Low/Medium families. Enforcement is broader than the displayed remaining-budget figure; fix the status function in Phase 3.
- **Updated 28 November spend:** 683 Search, 624 Extract, 246 Low and 9 Medium calls; approximately $4.217 at configured unit prices, leaving approximately $195.783 of the $200 allowance. Month-to-date family spend: core $7.687/$50, Newsroom $30.45/$50, auxiliary $0.01/$35, synthetic $0.015/$50. 342 Medium refusals today and 467 month-to-date are denied claims, not successful provider calls; stop repeated attempts after denial.
- **Runtime errors:** the 24-hour Vercel error groups map to older production commits; the latest production deployment had no runtime errors in the last hour. Continue monitoring after the next scheduled jobs.
- **Open PR safety:** #196 remains draft and must not merge as-is: its match-intelligence route calls `createQuotaClaim()` without a feature argument and requires Gemini. #195 remains draft; its source registry defaults to disabled and its data-product scope stays outside MVP until reviewed.

- **Post-tracker production verification:** PR #393's production deployment and the subsequent audit-document deployment are both `READY`; the latest production commit at this check is `27a1e9d3464bad0e021ff9ac7792d77769c2f921`. Vercel reported no runtime errors in the preceding hour. No PFIE runs or sync-status updates had occurred after the 10:26 UTC deployment at the time of this check; eight post-deployment Parallel Search claims were attributed to team-badge discovery. The next scheduled PFIE run is still required to verify the current provider path in production.


### PFIE Phase 1 close-out — 28 November 2026

- **Status:** Phase 1 — Production audit & issue register is complete (100%). The six-phase tracker in Admin → Platform Updates now records Phase 1 as completed and Phase 2 as in progress (5% initialisation).
- **Production evidence:** latest production deployment is Vercel READY on commit c11f41ee206ad3bc0d76a2542995817b7ff4c9a2. Vercel reported no runtime errors in the preceding hour.
- **Provider evidence:** the latest available PFIE run ledger entries on 28 November (05:00–07:50 UTC) recorded parallel-low. The latest production deployment occurred after those runs, so a PFIE execution against that exact deployment is still required and is carried into Phase 6 production verification. No Gemini fallback was observed in the latest available run batch.
- **Migration provenance:** Supabase's applied migration list does not contain four migration names present in the repository: platform_updates_and_implementation_checklist, api_usage_attribution_and_pfie_budget_routing, fix_parallel_budget_spend_reporting, and parallel_newsroom_medium_quota_headroom. Their live database objects exist. Treat this as migration-history drift: compare exact live definitions and repository SQL before any migration replay; do not blindly reapply them.
- **Phase 1 boundary:** all audit findings are captured in the Phase 1 issue register with severity and remediation direction. The outstanding defects are implementation work, not blockers to closing the audit phase. In particular, Phase 2 owns the shared ten-competition allowlist, stale/mixed standings repair, result-correction reconciliation, incremental history/archive completeness, and canonical publisher identity. Phase 3 owns global spend reporting and consumption controls. Phase 6 owns post-deployment scheduled-job and final production verification.
- **No PFIE ingestion, standings, history, fixture/result data, provider configuration, budget limits or cron schedules were changed during Phase 1 close-out.


### PFIE Phase 2 implementation — PR #394

- **PR #394 — ten-competition launch-scope guard:** merged after the exact PR head SHA ab33748ee7c4ae1b9e41c2e45347140f5e0e1b27 received a Vercel Preview marked READY. Merge commit: 23ae523ec70cde8ecbdf16f3ae5eadc4543b5210.
- Added src/lib/pfie/launch-scope.ts as the single ten-key allowlist and made standings, fixture/results selection and archive scheduling consume it. Direct archive invocation also rejects competitions outside the allowlist.
- This prevents future pre-launch PFIE fixture/result/archive jobs from spending budget on non-priority competitions. It does not delete or rewrite historical records already ingested outside the launch scope.
- Remaining Phase 2 work: protect and repair persisted standings (season/freshness and score-correction reconciliation), restore Championship standings from fresh corroborated sources, repair incremental history/archive coverage, and unify publisher identity across fixture/results/history/standings.


## 28 November 2026 — PFIE Phase 2 execution update

- **Task 1 — standings integrity and corrected-result reconciliation:** re-opened for one final edge-case repair. PR #426 and migration `pfie_standings_snapshot_ledger_reconciliation` are deployed. Championship refreshed with 24 teams and two independent publishers; Bundesliga refreshed with 18 teams and four publishers. All 10 launch-scope legacy ledger rows were reconciled. A later audit found that a score correction for a match already included in the standings snapshot returned `in_snapshot_refresh_required_on_correction` without creating/flagging its ledger row. The new migration in PR #428 flags that fixture for the next validated full snapshot instead of applying an unsafe delta. Saudi Pro League and Liga Portugal ledger rows remain untouched. PR #426 and migration `pfie_standings_snapshot_ledger_reconciliation` are deployed. Championship refreshed with 24 teams and two independent publishers; Bundesliga refreshed with 18 teams and four publishers. All 10 launch-scope legacy ledger rows are reconciled. The score-correction trigger and season-scoped ledger path are deployed; Saudi Pro League and Liga Portugal ledger rows remain untouched.
- **Task 2 — historical reuse and provenance:** complete. Production audit confirmed 6,134 stored results across the ten launch competitions and zero duplicate natural match keys. The existing `completed_matches` view reuses `team_results`; no bulk historical refetch is required.
- **Task 3 — UEFA Conference League history:** historical archive recovery complete. Production contains 378 UECL results from 2 October 2024 through 26 November 2026. The rolling current-season verifier has still returned zero independently verified additions in recent attempts; current incremental freshness remains in the all-competition audit.
- **Task 4 — ten-competition validation:** in progress. Production standings snapshots exist for all ten launch competitions. The rolling 42-day fixture/result comparison found unmatched finished fixture records in several competitions and one Bundesliga score disagreement. Official DFB and Hamburger SV reports confirm Werder Bremen 4–0 Hamburger SV on 22 November 2026; the stale fixture score was corrected from 2–0 to 4–0 in production. Some unmatched rows are team-name aliases (for example QPR/Queens Park Rangers). The existing `completed_matches` view suppresses only exact lowercased team-name/date matches and uses `UNION ALL`, so alias variants can evade deduplication. Do not blindly overwrite or duplicate these records; reconcile canonical team identity and corroborating score evidence first.
- **Task 5 — archive completeness and idempotency:** complete. PR #427 merged as `066a723` after exact-head Vercel Preview READY; production deployment `dpl_62a1jTaYBa28LX5mohQqyJ7kQqWy` is READY. Completed double-round-robin archives require at least 90% of expected corroborated matches; current seasons are exempt. Incomplete archives are rejected before partial writes.
- **Task 6 — production verification and release evidence:** remains open until Task 4’s fixture/history reconciliation and the outstanding rolling-history windows are verified. All PRs must pass exact-head Vercel Preview READY before merge; production must be checked after each merge. No GitHub Actions are used.


- **Task 4 follow-up:** current standings rosters are now the canonical identity reference for fixture/history deduplication. Short publisher labels are resolved against the latest season roster; ambiguous names are quarantined instead of counted. PR #429 adds this roster-aware identity pass on top of PR #428.


## PFIE Phase 2 — final production evidence (28 November 2026)

**Phase 2 close-out: Tasks 1, 3 and 5 are complete; Tasks 2, 4 and 6 are in final re-audit after residual publisher-alias gaps were found in production history.**

| Launch competition | Raw stored results | Canonical usable matches | Stored history range | Latest standings snapshot | Current teams | Finished fixtures in the last 42 days with scores |
|---|---:|---:|---|---|---:|---:|
| Betway Premiership | 526 | 526 | 14 Sep 2024–27 Nov 2026 | 28 Nov 2026 | 16 | 3 |
| Premier League | 862 | 862 | 16 Aug 2024–27 Nov 2026 | 28 Nov 2026 | 20 | 11 |
| EFL Championship | 1,223 | 1,223 | 9 Aug 2024–7 Nov 2026 | 28 Nov 2026 | 24 | 26 |
| La Liga | 915 | 880 | 15 Aug 2024–21 Nov 2026 | 28 Nov 2026 | 20 | 4 |
| UEFA Champions League | 486 | 486 | 17 Sep 2024–25 Nov 2026 | 27 Nov 2026 | 36 | 7 |
| UEFA Conference League | 378 | 378 | 2 Oct 2024–26 Nov 2026 | 27 Nov 2026 | 36 | 21 |
| Bundesliga | 703 | 703 | 23 Aug 2024–27 Nov 2026 | 28 Nov 2026 | 18 | 9 |
| Serie A | 870 | 870 | 17 Aug 2024–8 Nov 2026 | 28 Nov 2026 | 20 | 11 |
| Ligue 1 | 729 | 719 | 16 Aug 2024–22 Nov 2026 | 28 Nov 2026 | 18 | 10 |
| CAF Confederation Cup | 29 | 27 | 16 Oct 2026–27 Nov 2026 | 28 Nov 2026 | 15 | 1 |


### Acceptance evidence

1. **Standings integrity and corrected-result reconciliation — complete.** Championship (24 teams) and Bundesliga (18 teams) have validated snapshots. The 10 launch-scope legacy standings ledger rows are reconciled; no launch-scope `needs_refresh` rows remain. The 22 November 2026 Werder Bremen 4–0 Hamburger SV score is consistent in fixtures, team_results and the verified standings baseline. The 27 November 2026 Werder Bremen 3–3 Borussia Mönchengladbach correction is also aligned in fixtures and team_results and verified against DFB/Bundesliga reporting. The correction migration ensures a match already included in a snapshot is flagged for a full snapshot reconciliation rather than an unsafe second delta. Saudi Pro League and Liga Portugal remain excluded.
2. **Historical reuse and provenance — final alias verification in progress.** The ten launch competitions contain 6,721 raw stored rows. Re-running canonical matching against the latest standings rosters exposed 45 residual alias-duplicate copies (35 La Liga, 10 Ligue 1). The final alias mappings produce 6,674 canonical usable matches after excluding two CAF rows with unresolved team identity. Existing records are reused; no bulk refetch or raw-history deletion was performed.
3. **UEFA Conference League recovery — complete.** The archive now contains 378 historical UECL results from October 2024 through 26 November 2026.
4. **Ten-competition validation — final identity/roster checks in progress.** All ten competitions have current standings snapshots. The rolling 42-day audit found 103 finished fixtures with scores, zero finished fixtures missing scores and zero canonical fixture/history score mismatches. Six fixture/history alias copies are collapsed in the combined evidence set. CAF remains provisional at 15 confirmed teams, with one Group C slot awaiting confirmation; unresolved CAF history rows remain excluded from backfill counts. Exact duplicates count once; conflicting scores and ambiguous team labels are quarantined.
5. **Archive completeness and idempotency — complete.** Completed double-round-robin archives must corroborate at least 90% of expected season matches. The active season is exempt. Incomplete archives are rejected before partial writes.
6. **Production verification and release evidence — pending final alias-fix release.** PRs #425–#431 were merged only after exact PR-head Vercel Previews were READY. Migrations for Platform Updates Realtime, standings reconciliation and snapshot-included score corrections are applied. The production baseline before the final alias fix is READY on commit `5c266f514d302036bc2228b39c0e78f67134d465` (deployment `dpl_FxVxf5u7WjTbVcErStWVi2NRN3U4`). Final sign-off requires the alias-fix PR to pass an exact-head Preview and its merge deployment to be verified.

### Operational note

The latest CAF rolling-history retry was blocked by the Parallel daily request cap (`502/500 today`). Other recent history jobs for Championship, La Liga, Serie A and UECL reported no independently verified additions in their rolling windows. This did not create missing completed fixture scores: the 42-day fixture audit found scored finished fixtures for all ten competitions, and the deployed PFIE completed-count pipeline now reuses those fixture results alongside `team_results` without duplicate counting. Avoid additional retries until the provider cap resets; do not bulk-fetch existing seasons.


### Post-audit history reconciliation (28 November 2026)

The final history audit added only missing or weakly represented records; it did not bulk-refetch the ten competitions.

- **La Liga:** added the 76 missing Athletic Club league results from 2024/25 and 2025/26 (38 per season), using the official Athletic Club match logs and an independent fixture export. The archive now contains 380 results in each completed season and 155 in 2026/27, for 915 total.
- **UEFA Champions League:** the archive now contains 189 results for 2024/25, 189 for 2025/26 and 108 for 2026/27 (18 qualifying results plus 90 completed league-phase matches through 25 November). The three-season backfill uses UEFA's official results archives.
- **CAF Confederation Cup:** rebuilt the current-season history as 14 verified second-preliminary-round first legs, 14 second legs and the 27 November group-stage opener (29 results total). The current standings contain 15 confirmed teams across four groups; one Group C qualifier remains pending. The available store has no 2024/25 or 2025/26 CAF archive rows, so prior-season CAF depth remains an explicit gap rather than being represented as complete.
- **Canonical deduplication:** the earlier audit consolidated 200 alias-duplicate rows and merged their source-domain evidence. A second production re-audit found 45 residual alias copies still present in La Liga (35) and Ligue 1 (10), plus two CAF history rows with unresolved team identity. The latest roster-aware logic with the two missing aliases produces 6,674 canonical usable matches from 6,721 raw rows; no score-conflict groups were found. PR #433 adds regression tests for the two missing aliases. These residual rows are deduplicated at read/count time and are not deleted from the provenance store.
- **PSL season note:** the 2024/25 archive contains 210 played results; cancelled Royal AM fixtures are not counted as played results. The 2025/26 archive contains 240 results.

The ten-competition launch scope remains unchanged. Saudi Pro League and Liga Portugal remain deferred. The production implementation continues to use the existing completed_matches evidence path and roster-aware canonicalization; no duplicate archive store was introduced.

**Deferred:** Saudi Pro League and Liga Portugal data/standings work remains outside the ten-competition MVP scope.
