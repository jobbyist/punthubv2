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
- **PR #352 — PFIE results model-scope incident:** the fix is already present on `main` and the results-path audit regression test is present. The PR branch became 38 commits behind and conflicted with later PFIE changes; it is superseded and must not be force-merged.
- **PR #387 — Trusted secondary standings publishers:** source expansion is being restricted to the ten priority launch competitions. Saudi Pro League and Liga Portugal are explicitly excluded from this pre-launch change. Merge only after the updated PR head has a Vercel preview in `READY`.
- **PUNT AI:** implementation deferred until after MVP launch. Pre-launch engineering capacity is reserved for PFIE reliability, the ten priority competitions, existing product functionality, UX refinement and production readiness.

## Outstanding pre-launch work

- Complete PFIE source, consensus, freshness and result-sync audits across all ten priority competitions.
- Verify the latest Vercel production deployment and scheduled sync outcomes after each merged PFIE change.
- Review remaining open PRs individually; merge only when their current head SHA has a READY Vercel preview and the change is still in scope.
- Defer Saudi Pro League and Liga Portugal refinements until the priority ten are stable.
