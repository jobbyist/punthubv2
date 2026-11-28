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
- **Task 6 — production verification and release evidence:** complete. PR #438 passed its exact-head Vercel Preview, merged, and reached READY in production. The post-release 30-minute production error/fatal log check returned no entries. All Phase 2 updates are recorded in mvp.md and the Realtime-enabled Platform Updates tracker. No GitHub Actions were used.


- **Task 4 follow-up:** current standings rosters are now the canonical identity reference for fixture/history deduplication. Short publisher labels are resolved against the latest season roster; ambiguous names are quarantined instead of counted. PR #429 adds this roster-aware identity pass on top of PR #428.


## PFIE Phase 2 — final production evidence (28 November 2026)

**Phase 2 acceptance: all six workstreams are complete against the ten-competition launch scope (28 November 2026).**

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
2. **Historical reuse and provenance — complete.** The ten launch competitions contain 6,721 raw stored rows and 6,674 canonical usable matches after roster-aware alias reconciliation. PR #433 fixed the 45 residual alias-duplicate copies (35 La Liga, 10 Ligue 1). Two CAF preliminary-round rows involving eliminated ZED FC remain in raw history but are excluded from current-roster form/backfill counts. Existing records are reused; no bulk refetch or raw-history deletion was performed.
3. **UEFA Conference League recovery — complete.** The archive now contains 378 historical UECL results from October 2024 through 26 November 2026.
4. **Ten-competition validation — complete.** All ten competitions have current standings snapshots. The rolling 42-day audit found 103 finished fixtures with scores, zero finished fixtures missing scores and zero canonical fixture/history score mismatches. Six fixture/history alias copies are collapsed in the combined evidence set. CAF correctly remains at 15 confirmed teams while the Group C qualifier is pending; CAF confirmed this outstanding place in its 26 November 2026 matchday-one preview ([official CAF update](https://www.cafonline.com/caf-confederation-cup/news/al-ahly-raja-and-defending-champions-usm-alger-headline-totalenergies-caf-confederation-cup-group-stage-kick-off/)). No placeholder team was inserted. Exact duplicates count once; conflicting scores and ambiguous team labels are quarantined.
5. **Archive completeness and idempotency — complete.** Completed double-round-robin archives must corroborate at least 90% of expected season matches. The active season is exempt. Incomplete archives are rejected before partial writes.
6. **Production verification and release evidence — complete.** The Phase 2 implementation/release PRs #426–#431, #433, #434, #436 and #438 were merged only after exact PR-head Vercel Previews were READY. PRs #432, #435 and #437 were closed unmerged and had no production effect. PR #433 exact-head Preview `dpl_42LECR8LmsbdB1KpwwL7kRdkuKeH` was READY for SHA `b84dcac9387d` before merge; merge commit `238cc661254e575185f67d56589ee4c07bcccf66` is production READY as deployment `dpl_8cLMZRVu4fG3brDPfPiVM3nTW83T`. The final evidence update in PR #436 also passed its exact-head Preview (`dpl_2GPTNa4xCd74KCbVw6pCu8VmrTVf`, SHA `678893fe784593a0f5ca7ebd801fe99382e2d584`) before merge; documentation merge commit `738561d6f3ade999d5fd2458809c8e39fd6b61c4` is production READY as deployment `dpl_5ngafXPqGEHMfMD1k5KxvhfXYZX7`. The 30-minute production error/fatal log check after the final release returned no entries. Platform Updates Realtime, standings reconciliation and snapshot-included score-correction migrations are applied; migration filenames are aligned with the production ledger. No GitHub Actions were used as an acceptance gate.

### Operational note

The latest CAF rolling-history retry was blocked by the Parallel daily request cap (`502/500 today`). Other recent history jobs for Championship, La Liga, Serie A and UECL reported no independently verified additions in their rolling windows. This did not create missing completed fixture scores: the 42-day fixture audit found scored finished fixtures for all ten competitions, and the deployed PFIE completed-count pipeline now reuses those fixture results alongside `team_results` without duplicate counting. Avoid additional retries until the provider cap resets; do not bulk-fetch existing seasons.


### Post-audit history reconciliation (28 November 2026)

The final history audit added only missing or weakly represented records; it did not bulk-refetch the ten competitions.

- **La Liga:** added the 76 missing Athletic Club league results from 2024/25 and 2025/26 (38 per season), using the official Athletic Club match logs and an independent fixture export. The archive now contains 380 results in each completed season and 155 in 2026/27, for 915 total.
- **UEFA Champions League:** the archive now contains 189 results for 2024/25, 189 for 2025/26 and 108 for 2026/27 (18 qualifying results plus 90 completed league-phase matches through 25 November). The three-season backfill uses UEFA's official results archives.
- **CAF Confederation Cup:** rebuilt the current-season history as 14 verified second-preliminary-round first legs, 14 second legs and the 27 November group-stage opener (29 results total). The current standings contain 15 confirmed teams across four groups; one Group C qualifier remains pending. The available store has no 2024/25 or 2025/26 CAF archive rows, so prior-season CAF depth remains an explicit gap rather than being represented as complete.
- **Canonical deduplication:** the earlier audit consolidated 200 alias-duplicate rows and merged their source-domain evidence. A second production re-audit found 45 residual alias copies in La Liga (35) and Ligue 1 (10). PR #433 adds the missing `Deportivo A Coruña` and `Racing Strasbourg` aliases, with regression tests. The final roster-aware logic produces 6,674 canonical usable matches from 6,721 raw rows, with no score-conflict groups. The 45 alias copies are deduplicated at read/count time; source records are preserved. Two preliminary-round results involving eliminated ZED FC remain outside current-roster form/backfill counts.
- **PSL season note:** the 2024/25 archive contains 210 played results; cancelled Royal AM fixtures are not counted as played results. The 2025/26 archive contains 240 results.

The ten-competition launch scope remains unchanged. Saudi Pro League and Liga Portugal remain deferred. The production implementation continues to use the existing completed_matches evidence path and roster-aware canonicalization; no duplicate archive store was introduced. PR #433 production release: commit `238cc661254e575185f67d56589ee4c07bcccf66`, deployment `dpl_8cLMZRVu4fG3brDPfPiVM3nTW83T` (READY).

**Deferred:** Saudi Pro League and Liga Portugal data/standings work remains outside the ten-competition MVP scope.


### Production migration history alignment (28 November 2026)

The production migration ledger records the three Phase 2 schema changes under these versions:

- 20261128132556 — platform_updates_realtime
- 20261128132928 — pfie_standings_snapshot_ledger_reconciliation
- 20261128134420 — pfie_flag_snapshot_score_corrections

The equivalent SQL files had been committed with later version prefixes. PR #434 aligns the repository filenames with the versions already recorded in production, preventing a future Supabase migration push from attempting to apply duplicate copies. The live apply_result_to_standings and replace_standings function bodies were compared with the committed migration SQL and match. The three admin read policies and Realtime publication membership for platform_implementation_tasks, platform_implementation_task_events and platform_updates are present in production. This is migration-ledger housekeeping only; no additional SQL was applied.


### Final production closure (28 November 2026)

PR #438 passed exact-head Vercel Preview READY (head 4d32cb587df5eaa3aef61af5bdee721f6be666e3; preview dpl_GBDVe1cZmch4rvhwTAKnCidJAuQ7), merged as commit e6a2c753df0198f07add145e81079cefb3d5a751, and reached production READY as deployment dpl_FNDFUac2wF43poDKyvvPMUECZjc8. The 30-minute production error/fatal log check after that deployment returned no entries. PR #434 separately aligned migration filenames with the already-applied production versions. No GitHub Actions were used.


## PFIE Phase 3 — Parallel budget & consumption controls (28 November 2026)

- Phase 3 is active in Admin → Platform Updates. The existing `platform_implementation_tasks` and `platform_implementation_task_events` records are the source of truth; all three tracker tables (`platform_implementation_tasks`, `platform_implementation_task_events`, `platform_updates`) are members of `supabase_realtime`.
- **Phase 3.1 — Usage attribution and cost-accounting audit: complete.** Production `api_call_events` contains 2,696 events from 27 Nov 19:18 UTC through 28 Nov 14:30 UTC. 303 rows are legacy-unattributed; 495 lack `estimated_cost_usd`; all 2,696 lack competition and job/run metadata. Feature, consumer, operation and status are present. The provider ledger also contains 327 PFIE-tagged Gemini events and 99 PFIE-tagged Firecrawl events; these are remediation targets for Phase 3.5 and must be traced to the calling paths before changing provider configuration.
- **Phase 3.2 — Correct global Parallel spend reporting: complete.** PR #441 merged as `af3083a6cb90b8a5c177974958c9d9c0fbb32845` after its exact-head Vercel Preview was READY (`80f20fe9fbfa94c485c1f380b9668270f42f7350`, deployment `dpl_GhJTGjHaRBiSqPfAV63ex7RGTdVP`). Migration `20261128143517_parallel_global_spend_reporting` is applied. The production function now sums all `parallel%` endpoints for the global period row, matching the `api_budget_claim` guard. Production deployment `dpl_RvQTxGPwHGJWReayAuMVsm17bkN6` is READY; the 30-minute post-release error/fatal log query returned no entries. The live API status returns $7.5310 spent / $192.4690 remaining of the $200 allowance at the verification checkpoint.
- Production spend at the Phase 3 audit checkpoint: **$7.5310 of the $200 cumulative allowance**, leaving **$192.4690** through 31 March 2027. This is the database-ledger figure from the tested all-endpoint aggregation; it supersedes the earlier 28 Nov point-in-time estimate.
- No provider budgets, daily quotas, cron schedules or production provider routing were increased or changed as part of this Phase 3 start. Vercel exact-head Preview remains the merge gate; GitHub Actions are not used.

- **Phase 3.4 — Reduce repeated requests through cache and deduplication: in progress.** The existing `parallel_cache` table held 19 entries at audit time, all for newsroom or synthetic workflows; there were no PFIE fixtures/results cache entries. The PFIE provider called its guarded Search and Extract dependencies directly, so the existing read-through cache was not connected to PFIE. Existing TTL policy is 12 hours for fixtures and 30 minutes for results. Implementation now wires the persistent cache around quota-guarded providers, adds per-process in-flight request coalescing, preserves case-sensitive URL paths/query values in cache keys, and emits structured cache outcome logs. Regression tests cover concurrent request coalescing and URL-safe cache identity. Exact-head Vercel Preview and merge are pending.


- **Phase 3.3 — Enforce provider budgets and quota-exhaustion retry stops: in progress.** New migration `20261128280000_pfie_quota_backoff_context.sql` adds per-attempt IDs, competition/job-run fields, reason codes and completion timestamps to `api_call_events`; creates provider/family/global `api_provider_backoff`; and adds `api_budget_claim_context` plus `api_call_event_result` so every claim is recorded as claimed/denied then finalised succeeded/failed. Hard denials set cross-job cooldowns until the relevant daily, monthly or Q1 reset. PFIE model routing now stops on quota denial instead of falling back to another model. The claim context uses the same UUID as the `pfie_runs` record. A 30-day `api_call_usage_attribution_detail` view exposes competition, run, status, reason and estimated cost. The full migration and transactional SQL regression test passed against the connected production schema inside a transaction that was rolled back; no production schema or quota values were changed by this test. Exact-head Vercel Preview and merge are pending.
- **Phase 3.4 — Cache/deduplication: reopened for a corrective change.** PR #443 is merged and production READY, but code review found the Search cache wrapper was constructed without being used by the discovery call. Extract caching was wired; Search caching was not. The Phase 3.3 corrective branch now calls `searchProvider` and excludes cache hits/deduped requests from provider-call totals. This correction will be verified and merged before Phase 3.4 is closed. First live PFIE cache-hit telemetry remains scheduled for Phase 3.6.


### Phase 3.3 / 3.4 coverage correction — 28 November 2026

A deeper route-level audit found that the PFIE standings/history pipeline (`api.cron.sync-tables`) is separate from the fixtures/results provider path. The first quota/backoff and cache PRs covered fixtures/results, but standings/history still lacked competition/job-run context and cache-first Search/Extract wrappers. Both workstreams have therefore been reopened in Platform Updates rather than being treated as fully closed.

- The historical provider ledger shows PFIE standings events from 322 Gemini 3.5 Flash Lite calls, 5 Gemini 3.1 Flash Lite calls and 99 Firecrawl calls. Their latest recorded timestamps are 28 Nov 04:40 UTC (Gemini) and 00:54 UTC (Firecrawl). The current `api.cron.sync-tables` source is Parallel-only (Parallel Search, Extract and Responses); these records are historical and are not being retroactively reclassified.
- The standings/history correction branch adds per-job UUID context before each standings, history, season or archive run; writes those run IDs into `pfie_runs`; and uses the same IDs in `api_call_events`.
- The same branch applies the persistent cache outside the quota guards to standings/history discovery and extraction, using the 18-hour `tables` TTL and 30-minute `results` TTL. It also sets `stopOnQuota: true` for the table-generation model router.
- Exact-head Vercel Preview and production verification are pending. The historical Gemini/Firecrawl rows remain unchanged; Phase 3.5 will add an explicit database-level PFIE provider allowlist so future non-Parallel claims fail closed.


## PFIE Phase 3 — Provider routing hardening (28 Nov 2026)

- PFIE's provider factory now fails closed unless Search, Extract and Responses are the approved Parallel adapters. Gemini and Firecrawl remain available to separate non-PFIE content workflows only.
- PFIE model configuration is restricted to Parallel Responses Low and Medium; the only Medium retry remains the bounded Championship-fixtures exception. A quota denial stops the chain rather than routing around the denied Parallel budget.
- Added regression coverage for attempts to inject Firecrawl Search/Extract, Gemini Responses, or Gemini model IDs into PFIE.
- Phase 3.4 cache-accounting correction merged as PR #447 and deployed to production. Extract failure events now use the cache-wrapped provider identity, matching successful calls.


## Phase 3.3 — Final accounting and admin-access corrections (28 November 2026)

The contextual claim/backoff migration is deployed in production as `20261128145438`, and the production release is READY. The first post-migration sample contains three successful Serie A provider events with competition, job-run UUID, estimated cost and final status. Fourteen other events in the same window still carry legacy `api_budget_claim` attribution with null competition/job-run fields; these have not been relabelled, and their originating request path must be traced before final sign-off.

Corrective PR #450:
- Removes a stale `count()` call in the extraction-error path; `guardExtract` already records the failure exactly once.
- Reassigns PFIE Responses Medium to the core PFIE/Parallel monthly family budget, while removing PFIE Medium from the non-PFIE newsroom family.
- Grants authenticated admins SELECT access to the 30-day usage detail view, protected by an admin-only RLS policy on `api_call_events`.
- Adds rollback-only SQL regression coverage for family-budget attribution, admin grants/RLS and UTC backoff-boundary behavior.

Phase 3.3 remains in progress until this corrective release is deployed and new scheduled runs consistently show context and final status for every PFIE provider attempt.

## Phase 3.4 — Cache implementation status

Persistent Search/Extract cache is wired into both fixture/results jobs and the standings/history/season/archive table pipeline. The first live results run created an active cache entry and emitted Search/Extract miss telemetry. Cache-hit/deduplication and avoided-spend measurements remain part of the Phase 3.6 production reliability audit.


## Phase 3.6 — Live budget runway in Admin API Usage

The Admin → API Usage tab now includes a live Q1 Parallel budget runway panel. It reads the shared-period status and daily provider usage, calculates all date boundaries in UTC, and displays the cumulative cap, spend, remaining balance, required daily average, observed daily average, seven-day average, projected end-of-period spend/overage and estimated days to exhaustion. Projections are explicitly marked provisional until at least seven days of data are available.

The initial 28 November baseline is $7.684 spent against the $200 cap, leaving $192.316 for 124 calendar days (required average $1.5509/day). The first observed day averaged $7.684/day; a straight-line projection is $952.82, but this is an early warning rather than a steady-state forecast because the day includes launch recovery/backfill. The lower owner-approved daily quota ceilings remain deferred until Phase 3.3–3.6 production verification passes.

Unit tests cover UTC inclusive-day calculations, zero-spend days, depleted budgets and the provisional first-day projection.


## PFIE Phase 3.6 — Sustainable run-rate controls (28 Nov 2026)

- A bounded production PSL standings verification exposed a high-cost failure mode: 1 Parallel Search, 5 Extract calls and 18 Responses Low calls ($0.186 estimated) still produced no verified table. The failed run is recorded in `pfie_runs` under job-run ID `4a65e35f-6281-467a-83dc-cd668768c901`.
- Fixed the production `pfie_runs_kind_check` constraint to accept all actual PFIE table job kinds: standings, history, season and archive, in addition to fixtures/results. Backfilled the failed PSL verification run after the constraint repair.
- Standings discovery now filters pages that do not contain a real table, caps the primary source set at three pages (official plus two independent publishers), and caps secondary fallback at two trusted pages. Failed sources are not retried when two valid source tables already agree.
- Added a structured Parallel Responses read-through cache. Only valid JSON objects are cached; prompts and source text remain case-sensitive in cache keys. Cache hits and in-flight deduplication avoid a new Responses quota claim, and avoided spend is recorded.
- Production evidence from the bounded PSL test: the first Search/Extract reads missed, repeated reads in the same request hit cache (six provider calls avoided, approximately $0.006). The run still failed validation; the source/retry optimisations are intended to reduce that cost on the next verification.
- Shared Parallel spend at the audit point: approximately $7.68 of the $200 Q1 cap. Monthly family spend: core $10.704/$50; auxiliary $0.010/$35; newsroom $30.900/$50; synthetic $0.015/$50.
- The guarded quota restoration job is scheduled for 29 Nov 2026 from 00:05 UTC (02:05 SAST), polling every five minutes. It restores the approved Search/Extract/Responses daily and monthly limits only after Phase 3.1–3.5 are complete and Phase 3.6 reaches at least 90%, then closes the tracker and unschedules itself.


### Phase 3.6 — Single-table regression identity repair

- Production PSL refresh successfully parsed two independent 16-team standings tables, but the final regression guard rejected the candidate because source-specific group labels ("Betway Premiership") differed from the stored empty group value. The tables themselves agreed.
- Updated `tableRegression` to use group identity only when multiple named groups exist. Single-table competitions now match teams by canonical team name regardless of a publisher's competition-heading label; multi-group competitions retain group-aware matching.
- Added a regression test for the PSL-style empty-group versus competition-label case.


## PFIE Phase 3 — Final production verification (28 Nov 2026)

### Provider routing and legacy ledger

- Phase 3.5 provider audit completed. Active PFIE scheduled paths use Parallel Search, Parallel Extract and Parallel Responses only. No Gemini or Firecrawl fallback remains in the active PFIE provider path; no non-Parallel PFIE calls were observed in the two-hour post-deployment audit window.
- Classified 2,034 pre-context-instrumentation PFIE API events as `legacy_unattributed`. No competition or job-run IDs were fabricated; the original provider, feature, cost and timestamps remain intact. New PFIE events carry competition and job-run context.
- Corrected stale budget notes that referred to a $280 cumulative allowance. The authoritative `api_spend_period_limits` row is $200 through 31 March 2027.

### Production verification

- PSL standings refresh succeeded: 16 rows written, two-source consensus, and no new Parallel provider claims. Warm Search/Extract cache plus preserved Markdown table structure allowed deterministic parsing without a Responses call.
- Two production results cycles (PSL and Championship) cost $0.022 per competition: one Search ($0.001), one Extract ($0.001), and two Responses Low calls ($0.020).
- The same two result cycles produced 35 rejected score observations (3 PSL, 32 Championship), all rejected for `score_on_unfinished_match`. This is the intended guard: scores from unfinished matches were not written.
- Valid structured Responses JSON is now cached. Cache keys preserve prompt/source case; cache hits and in-flight deduplication sit outside quota claims, so a hit does not consume a provider quota unit.

### Budget position and planning rate

- Shared Parallel Q1 allowance (28 Nov 2026–31 Mar 2027): $200. Spend: $7.914. Remaining: $192.086.
- Current monthly family spend: core $11.50/$50; auxiliary $0.01/$35; newsroom $30.35/$50; synthetic $0.015/$50.
- Measured results cost is $0.022 per competition check. A planning case of four checks per day across ten competitions is approximately $26.40/month for results alone. Standings refreshes are now deterministic/cache-first; the verified warm PSL refresh incurred $0 in new provider calls. Fixtures and shared non-PFIE core consumers remain additional costs, with the $50 monthly core budget enforced as the hard stop.
- Results polling remains bounded by a 50-minute minimum and six-hour maximum per competition. This avoids a 30-minute global cron cadence turning into 30-minute provider calls for every competition.

### Approved quota restoration

The guarded restoration job is scheduled for **29 Nov 2026, 00:05 UTC (02:05 SAST)**. Daily counters reset automatically; the job restores the approved ceilings only after Phase 3.1–3.5 are complete and Phase 3.6 has reached 90%:

| Provider | Daily | Monthly |
|---|---:|---:|
| Parallel Search | 1,200 | 12,000 |
| Parallel Extract | 2,500 | 10,000 |
| Responses Low | 500 | 12,000 |
| Responses Medium | 18 | 1,000 |

Monthly USD family budgets remain unchanged. The scheduled job records the restoration in Admin → Platform Updates, closes Phase 3.6 and the parent Phase 3 tracker, then unschedules itself.


## Settlement reliability hardening (28 Nov 2026)

### Incident: Lincoln City vs Wolves, EFL Championship

- Fixture kicked off at 14:30 SAST / 12:30 UTC and remained `scheduled` in the production `fixtures` row.
- The 16:30 SAST Championship PFIE results run failed because the Parallel Responses Low quota was exhausted (`parallel-chat:low`).
- A later 17:30 SAST verification run found 0–0 score observations from multiple sources, but those sources still labelled the match `scheduled`. PFIE correctly rejected the scores as `score_on_unfinished_match`; no unverified score was written.
- The settlement cron continued to run, but `pending_settlements()` and `duels_to_settle()` only return records whose fixture is already in a terminal state. Thus the active duel remained open because no verified final fixture state existed.

### Changes in this release

- Added `pending_settlement_result_fixtures()`: returns only scheduled/live fixtures at least 105 minutes after kick-off that still have unsettled predictions or active duels. It includes duel-only fixtures, which the prior prediction-only pending-result query missed.
- Added a settlement-priority mode to results sync. It polls only this candidate set, bypasses the general competition throttle, prioritises oldest candidates and rotates bounded batches. General results ingestion remains unchanged.
- PFIE result retry cadence: every 5 minutes from 105 minutes through four hours after kick-off for priority fixtures; every 15 minutes from four to twelve hours; hourly for older unresolved fixtures. Results still require the official competition source or independent corroboration; no score is guessed.
- Added a five-minute `settlement-results-watchdog` cron and changed settlement execution to every two minutes.
- Pick and duel settlement now execute independently. An exception in one settlement path no longer prevents the other from running; failed paths return an error for retry and emit structured logs.
- The Support Centre now has 49 FAQs in English and Afrikaans, including result verification, delayed settlement, score disputes, duels, synthetic AI participants, PuntPoints, rewards, referrals, Pro, Practice Mode, Fantasy Arena, leaderboards, privacy and troubleshooting.

### Operational target and limitation

- Target: settle a pick or duel within minutes after a verified final result becomes available, and ordinarily within 60 minutes after full time.
- The five-minute watchdog and two-minute settlement cycle remove cron cadence as the bottleneck. They cannot force a source to publish a final score; if the official feed and independent sources remain stale or disagree, Puntr deliberately leaves the fixture pending rather than risk an incorrect settlement.
- A delayed result remains eligible for automatic retry. Members should contact support if it remains pending more than 60 minutes after full time, with the fixture and pick/duel link.


### Lincoln City vs Wolves: production watchdog verification

- The new production priority query correctly selected the Lincoln City vs Wolves fixture because it has an active duel and had passed the 105-minute post-kick-off threshold.
- The first priority run completed successfully (HTTP 200), made three Parallel calls (one Search and two Responses Low), and wrote no result because the 24 extracted observations were not final-status verified. EFL and FBref still returned `scheduled`; BBC and FotMob returned `live`. The fixture and duel therefore remain pending; no unverified 0–0 score was written.
- The watchdog is now active every five minutes, but provider calls respect the bounded 5m / 15m / 60m per-competition retry backoff. Result search phrasing now explicitly asks for full-time status and final-score evidence.
- The 2-minute settlement endpoint independently ran both pick and duel settlement successfully; it correctly found zero terminal fixtures to settle in this cycle.
- The external Guardian clockwatch and a community match thread report a 0–0 draw, but the primary PFIE source set did not yet provide the required terminal status. Puntr deliberately does not promote that score solely on the basis of a scoreline without the required final-status evidence.


### Cron dispatch isolation

- The 16:00 UTC production cycle showed that the standard all-competition results sync can consume the full 120-second HTTP timeout. This bulk archive job is not allowed to delay member-impacting settlement checks.
- General results/archive ingestion now runs hourly at minute 37, off the crowded :00/:30 schedule, with a 60-second request timeout.
- The settlement-priority results watchdog remains every five minutes with a 90-second request timeout; the pick/duel settlement worker remains every two minutes with a 15-second request timeout.
- Added a timeout-aware `public.invoke_cron(text, integer)` overload. The original 120-second helper remains unchanged for unrelated jobs.


### Settlement incident close-out: Lincoln City vs Wolves

- Source verification completed at 16:08:02 UTC on 28 Nov 2026. Two independent trusted sources confirmed the final score: the official Wolves match report (`wolves.co.uk`) and the Sky Sports match report (`skysports.com`). Both explicitly report full time at Lincoln City 0–0 Wolves.
- The verification was recorded as PFIE run `f2fd0e48-785b-4934-9a57-26a0cf518c5d`, model `manual-two-source-verification`, with two accepted source observations and zero rejected observations. The stale EFL/FBref status was documented; the score was not inferred from the 0–0 line alone.
- Fixture `7b79607f-5e1e-445a-a6d3-a3611933db0a` was marked finished at 0–0. The existing fixture result trigger ran, and the normal duel settlement worker settled the active duel at 16:08:09 UTC.
- Duel `67482ce1-dbf7-4ab7-a840-4e9b23f7247d` settled as a draw: challenger 1 correct call, opponent 1 correct call, no winner. No manual grading or payout override was performed.
- Post-settlement check: `pending_settlement_result_fixtures()` returned zero candidates. The active duel was settled and the settlement queue was clear.
- Production schedules confirmed: priority results watchdog every 5 minutes (90s request timeout); settlement every 2 minutes (15s timeout); general results/archive ingestion hourly at minute 37 (60s timeout). The timeout-aware cron helper is restricted to trusted roles.
- Support Centre expanded to 49 FAQs in both English and Afrikaans. Results, Duels and How It Works copy now explicitly distinguishes a verified full-time result from an unverified score and explains delayed settlement.


## Pending migrations applied to live Supabase (28 Nov 2026)

- Live project: Puntr South Africa (`hucjuekhitjuygcoomhw`, eu-west-1). The Supabase connector now reaches it and `list_projects` shows it first.
- Compared `supabase/migrations` on main with the live history by migration name (the live history uses its own timestamps), then verified the objects themselves. Everything on main was already live except four migrations. Several migrations the owner ran in the SQL editor earlier that day (team follows, quota headroom, platform updates, API usage attribution, badge classification, spend reporting) have no history row but their tables, functions and values are present.
- `good_sport_merch` applied through the connector: cap, T-shirt and mug renamed to Good Sport; `merch-socks` listed. Live socks price is 24,000 PuntPoints (the existing row, not the 8,000 in the migration, which does not update prices). Adjust in Admin > Rewards if wanted.
- `ads_affiliate_creatives`, `bookmaker_reviews` and `tipster_support` contain `drop policy/trigger/constraint` statements, so the connector's confirmation prompt was auto-cancelled in the app. They were combined, in order, into one idempotent transaction (also records the three history rows and removes the empty placeholder row `20261128073612`) at `/mnt/project-files/migrations/2026-11-28-pending-combined.sql`, and the owner ran it in the SQL editor at about 14:05 SAST.
- Verified afterwards: RLS is on `affiliate_creatives`, `affiliate_ad_events`, `bookmaker_reviews` and all five `tipster_*` tables; four draft affiliate creatives exist (inactive until partner copy is approved); 15 `tipster_*` settings; the `puntpoints_ledger` kind check now includes `tipster_hold`, `tipster_earning` and `tipster_refund`; notice versions `2026-11-28-ads`, `2026-11-28-r4` and `2026-11-28-r26` are present.
- Security advisor, new objects only: the four public projection views (`public_affiliate_partners`, `public_affiliate_creatives`, `public_bookmaker_reviews`, `bookmaker_review_stats`) are flagged as security definer, which is intentional (they expose only public-safe columns); the anon/authenticated RPCs (`record_ad_event`, `tipster_support_card`, `top_supported_tipsters`, member tipster actions, admin tipster functions) are flagged as executable, and each checks `auth.uid()` or `is_admin()` internally. One real nit: `public.tipster_plan_interval` has a mutable `search_path`; fix with `alter function ... set search_path = public, pg_temp` in a new migration.
- `src/integrations/supabase/types.ts` regenerated from the live schema (adds the new tables, views and RPCs). Typecheck errors fall from 28 to 25 (the three in `store.server.ts` are fixed); the remaining 25 were already on main.

Next steps: set `search_path` on `tipster_plan_interval`; paste partner-approved creative copy and record the approval date in Admin > Affiliates; decide the socks price; add `bun run typecheck` to CI.
