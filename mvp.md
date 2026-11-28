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
