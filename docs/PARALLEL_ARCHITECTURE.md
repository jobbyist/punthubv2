# Parallel data layer: architecture and credit budget

Owner direction (15 Nov 2026): Parallel's APIs power fixtures, results, tables, match stats, team news, slip
analysis, Confidence Scores, Deep Analysis, the Punt AI chatbot, Newsroom research and **pre-match odds** (no
in-play). "Manually added odds" means the odds members enter when they submit a pick or a slip (owner, 15 Nov). Credits are spent as sparingly as possible without hurting quality.

Budget (owner update, 27 Nov 2026): approximately **$200 of Parallel balance remains** to carry Puntr through 31 March 2027. The internal monthly family ceiling is **$50**, with a separate cumulative **$200 ceiling from 28 Nov 2026 through 31 Mar 2027**. These are spend guards, not a statement of the provider wallet balance. Reconcile the provider dashboard monthly.

## Ground rules

1. **Code decides truth, AI does not.** Parallel finds and reads sources. Gemini extracts PFIE standings/results;
   odds use Parallel Chat low for structured extraction after source-rights approval. Deterministic code validates
   and corroborates every output (official source or two independent domains agreeing).
2. **Cache before you call.** Every Parallel request goes through `parallelCache` keyed on endpoint + normalised
   body, with a TTL per purpose (below). A repeated question inside its TTL costs nothing.
3. **Cheapest tool that answers.** Search `fast` ($1/1,000), Decisions ($1/1,000 requests, up to 100 questions per request) and Extract ($1/1,000 URLs) do most of the work. Task API, Responses/Chat and Monitor are used only where they replace many cheaper calls or add real quality.
4. **Dollar caps, not just call caps.** Each call claims units against `api_quota_limits` (daily/monthly call caps,
   fail closed), the monthly USD family budget (`api_budgets`) and the active cumulative period limit
   (`api_spend_period_limits`), priced from `api_unit_prices`.
5. **No personal data to Parallel.** Queries are about teams, fixtures and competitions only. Slip analysis sends
   scrubbed slip text through the existing scrubber, never a photo, name, username or balance.

## Prices (docs.parallel.ai/getting-started/pricing, checked 23 Nov 2026)

| API | Tier | USD per call | Puntr provider key |
|---|---|---|---|
| Search | fast | 0.001 | `parallel` |
| Extract | per URL | 0.001 | `parallel-extract` |
| Decisions | fast; up to 100 named questions per request | 0.001 | `parallel` |
| Task | lite / base / core / pro | 0.005 / 0.01 / 0.025 / 0.10 | `parallel-task:<processor>` |
| Chat (Responses) | low / medium / high | 0.01 / 0.05 / 0.25 | `parallel-chat:<effort>` |
| Monitor | lite / base, per execution | 0.003 / 0.01 | `parallel-monitor:<processor>` |

Rate limits are far above our needs (Search/Extract 600/min, Tasks 2,000/min, Chat 300/min).



## Production usage review and Q1 controls (27 Nov 2026)

The production ledger recorded **4,438 Parallel calls costing $33.838** so far in November:
- Search: 2,182 calls, approximately $2.182.
- Extract: 1,655 calls, approximately $1.655.
- Responses Medium: 600 calls, approximately $30.00.

Responses Medium accounted for about **89%** of the recorded spend. The newsroom runs three daily editorial slots and can make separate writer, revision and reviewer calls. The live quota row had drifted to **300 Medium calls/day**, even though its note still described the earlier 45-call limit. That mismatch allowed much more paid usage than the intended operating envelope.

Controls:
- Raise the monthly Parallel family ceiling to $50, while enforcing a cumulative $200 cap from 28 Nov 2026 through 31 Mar 2027.
- Limit Responses Medium to **15 calls/day and 450/month** (maximum $22.50/month at the current $0.05 unit price).
- When the Medium quota is exhausted, the existing model router falls back to the approved Gemini models rather than continuing paid calls.
- Keep Search and Extract under the shared dollar guard; do not expand their per-call caps simply because their unit prices are low.
- Review the provider wallet and `api_spend_period_status()` at least weekly. Do not treat the internal caps as a substitute for reconciling the Parallel dashboard.

## Feature map

| Feature | Parallel API | Cadence | Cache TTL | Est. per day after launch |
|---|---|---|---|---|
| Fixtures (21 competitions) | Search fast + Extract fallback | daily 03:00-03:42, only competitions with matches in the next 10 days | 12 h | ~40 calls, $0.04 |
| Results | Search fast | after full time with back-off (existing) | 30 min | ~30, $0.03 |
| League tables | Search fast + Extract | daily when stale (existing) | 18 h | ~12, $0.012 |
| Team news and line-ups | Not production-live; Monitor/webhook pipeline is not yet implemented and verified | Deferred | n/a | $0 at MVP |
| Match stats (post-match) | Current outcome aggregates are derived from stored verified results; no dedicated event-level stats feed is production-live | Deferred | n/a | $0 at MVP |
| **Pre-match odds** | Deferred. No South African bookmaker has supplied Puntr an authorized odds API, affiliate feed or other integration. Parallel Search/Extract/Monitor are not data rights. | Disabled for MVP | n/a | $0 at MVP |
| **Member-entered odds** (picks and slips) | Typed by the member; retain the submitted bookmaker, decimal price and timestamp as the member's record. Label user-submitted; no market-reference check is required for MVP. | per pick | n/a | $0 |
| Confidence Score | none: deterministic model on stored form, H2H, table, home/away and odds | on fixture change | n/a | $0 |
| Deep Analysis drawer | none for numbers; Gemini prose from stored facts, cached per fixture | once per fixture per day | 24 h | $0 (Gemini free tier) |
| Deep research brief (featured fixtures only) | Task **lite** with a JSON output schema and source policy | ~3 a matchday | until kick-off | ~$0.02 |
| Slip analysis | none for parsing (on-device OCR + parser); odds check against stored odds | per slip | n/a | $0 |
| Punt AI chatbot | Answers first from Puntr's own data via Gemini; **Chat low** only for questions needing the live web, and only for Pro or credit-paying members | per message | 1 h per normalised question | charged to the member's credits |
| Newsroom research | Search fast + Extract (existing) | 1 article a day | 6 h | ~8, $0.008 |
| Internal synthetic QA | Decisions fast; up to 100 persona-market questions per shared fixture request; cached through `parallelCache` and guarded by `api_budget_claim` | owner-controlled batch; paused by default | 24 h | ~$0.001 per uncached fixture batch |
| Team badges | Parallel Search fast + Wikipedia summary verification; mirrored to Supabase Storage | one-off per fixture team and curated hero marquee team; admin can force retry | permanent | ~0 |

**Synthetic QA note:** The 30-day experiment groups up to two preferred market questions for each of 50 synthetic personas into one Decisions request per fixture. It does not create 50–100 individual API requests. The experiment-specific $50 ledger is an additional cap; all actual provider calls still claim through the existing `api_budget_claim` / `api_quota_claim` guard and `parallelCache`.

**Cost note:** The earlier steady-state estimate is not a current forecast: it assumed automated odds and Monitor-based team news that are not launch-enabled. Use api_spend_status() and the live quota/budget tables before increasing any provider cadence. At MVP, automated bookmaker odds and team-news Monitor jobs remain disabled.

## PUNT AI production controls (28 Nov 2026)

PUNT AI's application path uses Gemini for internal Puntr-data answers and Parallel Search + Extract + Chat low only for questions that materially need current web research. Live web is limited to Pro members or members spending **2 credits per successful live-web answer**. A failed live-web request falls back to stored Puntr data and does not charge the live-web credits.

Production storage consists of a one-hour answer cache and an auditable per-user usage ledger. The database claim function enforces **20 requests/day and 300/month for Free**, and **40/day and 600/month for Pro**, using South African calendar boundaries. It rejects AI participant accounts, banned/suspended/limited accounts and accounts without age attestation. Cache and usage tables are service-role only; users cannot query or edit the ledger directly.

The existing provider-family controls also apply to every uncached provider call: Parallel Search, Extract and Chat low use the shared $50 monthly Parallel budget and the $200 cumulative Q1 ceiling; Gemini internal answers use the existing per-model daily/monthly quota rows. The public chat button remains behind `SHOW_PUNT_AI_CHAT` until the production migration, preview build and launch-readiness checks are complete.

## Odds rules (owner decision, 22 Nov 2026)

**MVP decision: member-entered odds only. Automated bookmaker odds remain deferred until written source rights are approved.**

Owner implementation update (27 Nov 2026): the automated reference-odds pipeline now uses Parallel Search, Parallel Extract
and Parallel Chat low. It is protected by a default-off `ODDS_AUTOMATION_ENABLED` feature flag and a database rights
registry. A bookmaker is eligible only after its current South African licence is verified, written collection/storage/
display/attribution/retention/redistribution rights are recorded, automated access is permitted, and an evidence URL
and review timestamp are stored. All candidate rows are seeded disabled. Hollywoodbets is first in discovery priority,
followed by approved affiliate partners SupaBets and YesPlay. This is prioritisation only, not permission.

Puntr has not received an authorized odds API, affiliate odds feed or other odds-data integration from any South African bookmaker. Affiliate approval (including Hollywoodbets) does not by itself grant odds-feed rights.

- **Member-entered odds:** the member enters the bookmaker and price for a pick or slip leg. Preserve the submitted price, bookmaker attribution and timestamp as the member's record and in the pick verification hash (src/lib/verify.ts). Never overwrite it with a later market price.
- Label these values **User-submitted**. Do not imply that Puntr independently verified the price or that it is live/current.
- Do not block pick submission because no automated reference price exists.
- Do not enable automated odds, comparison tables, bookmaker logos or odds links unless the relevant data rights and branding permissions are documented and approved. The production cron remains disabled unless both the environment feature flag and the source registry permit it.
- Parallel Search can discover potential sources; Parallel Extract can retrieve pages only where automated access and reuse are permitted; Parallel Chat low performs structured extraction. Monitor can detect scheduled changes. None is a substitute for a licensed data feed or permission to store/display/redistribute prices.
- Do not bypass logins, bot protections, geofencing, CAPTCHAs, rate limits or other access controls.
- A future automated reference-price product needs written rights for South African coverage, collection, storage, display, attribution, refresh frequency, retention and redistribution. Prefer an authorized bookmaker API/affiliate feed or a commercial data provider with those rights.
- If enabled later, keep bookmaker prices separate by operator, fixture, market, selection and capture time. Do not treat differing prices as conflicting facts. Only calculate a benchmark when at least two independent, permitted bookmakers cover the same selection; otherwise show no benchmark.
- Reject stale, suspended, in-play, mismatched or post-kick-off prices from a pre-match reference product. Never use stale prices as current.
- Member-entered odds remain immutable and separate from any future reference price.

## One-off work to fund from the expiring balance (before 7 Dec)

The ~$50 does not roll over, so spend it on lasting data while it exists. Estimates are deliberately generous.

| Job | Method | Est. cost |
|---|---|---|
| 2025/26 season results, 12 table leagues (~4,500 matches) | season backfill (#131), Search + Extract | $3 |
| 2024/25 season results, same leagues (form and H2H depth) | same job, earlier windows | $3 |
| Head-to-head history (last 10 meetings) for every fixture pair in the next 4 weeks | Task lite, JSON schema, two-source check | $3 |
| Team profiles (stadium, city, coach, nickname) for ~350 teams | Task lite batches | $2 |
| Evergreen deep-research briefs for the 20 biggest clubs and derbies (Newsroom, Marquee card) | Task core | $1 |
| Reserve for retries and launch week | n/a | $10 |
| **Total** | | **~$22** |

That leaves headroom to raise the season-backfill caps so it finishes before 1 Dec instead of trickling.

## Build order and MVP launch scope (22 Nov 2026)

1. **PFIE fixtures/results:** implemented multi-source verification; launch work is production freshness, coverage and settlement QA.
2. **Standings:** multi-source extraction and deterministic validation exist; coverage is uneven and needs competition-by-competition readiness checks.
3. **Form:** derived deterministically from verified completed results.
4. **Member-entered odds:** existing manual path is the MVP approach; verify persistence, bookmaker attribution, timestamp and user-submitted labelling.
5. **Automated odds:** deferred until written source rights are secured and a permitted feed is tested end-to-end.
6. **Match stats and player/roster data:** dedicated event-level and canonical player data products remain post-launch work.
7. **Team news / Monitor:** not production-live; defer until webhook, provenance, retention, costs and failure handling are implemented.
8. **Punt AI, Confidence Score and Deep Analysis:** only surface claims based on verified stored facts; keep any unsupported or uncalibrated capability disabled.

## Unknowns to confirm on the first live call

- Task result endpoint (`GET /v1/tasks/runs/{run_id}/result`, used by the SDK) and the exact `basis` field names.
- Monitor billing per scheduled execution, and the update/cancel endpoints.
- Chat endpoint `/v1beta/chat/completions` request shape (OpenAI-compatible).


## 22 Nov 2026: La Liga standings source coverage

The La Liga direct-page candidate roster is capped at five independent publishers: official LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst. Parallel Extract reads each independently; publisher identity normalization prevents subdomains or mirrored properties from inflating consensus. These are candidate sources, not guaranteed coverage: each must pass the same 20-team, row-evidence, arithmetic, date and two-independent-publisher checks before publication.


## Production status and migration/cron audit (22 Nov 2026)

- Production migration history contains 101 entries and ends at 20261121235610.
- The repository main branch also has 101 migration files, but only one exact version-prefix match exists between the two histories. Several entries are renamed, split or consolidated; do not use filename similarity alone to repair migration history.
- Four active PFIE table cron jobs exist in production (IDs 61–64). Their current schedules differ from the latest pending schedule migration. Keep the live schedule unchanged until a complete migration mapping and backup/rollback plan are verified.
- 20261122110000_pfie_live_standings_refresh.sql contains malformed dollar-quote syntax and must not be applied as written.
- Production audit: standings have 7/12 scopes with a recorded successful sync; 5/12 have never succeeded. Automated odds have 0/11 successful scopes. Recent fixture/result runs exist.
- cron.job_run_details contains 17,919 records overall, but none yet for the new PFIE table job IDs 61–64 as of 01:22 UTC; their first scheduled window begins at 02:10 UTC. Other scheduled jobs continue to run. net._http_response showed successful Vercel responses and one 55-second timeout; the response record did not retain the request path, so the timeout could not be assigned to a specific cron job.
- No production migration, cron schedule or schema change was made during this audit. The detailed launch gate and reconciliation procedure are tracked in /dev/IMPLEMENTATION-PRIORITIES.md.



## 22 Nov 2026: PFIE pull-request sequencing

- **PR #185 (pre-launch):** La Liga direct-page candidates are capped at five: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst. A source candidate is not a verified table; extraction, freshness, complete-row evidence and two-independent-publisher consensus remain mandatory. If fewer than two sources pass, retain the last verified table and surface stale/unavailable status.
- **PR #195 (pre-launch merge candidate):** evidence validation must require captured page text and a curated source-registry mapping from each source ID to its publisher identity. Bookmaker source policy requires explicit ZA licence evidence and terms review. Roster records use canonical PFIE team IDs. Its migration is not approved for production application until the complete migration baseline and backup/rollback plan are reconciled.
- **PR #196 (post-launch):** match intelligence, automated odds and the associated exclusions-page work are deferred from the 1 December MVP. Automated odds remain disabled until written rights cover collection, storage, display, attribution, retention and redistribution. A technical API or affiliate approval alone is not sufficient.


## PR sequencing and launch boundary (22 Nov 2026)

- **PR #185 (pre-launch):** La Liga table source candidates are limited to five independent publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst (Opta). The configured source list is not proof of operational coverage. Publish only after the existing full-table validation and two-independent-publisher consensus succeed.
- **PR #195 (pre-launch foundation):** shared evidence checks and service-role-only schema foundation may be merged after tests and schema/security review. No bookmaker source is seeded or enabled, and no automated ingestion path is activated. Its migration remains unapplied in production pending migration-ledger reconciliation and explicit backup/rollback approval.
- **PR #196 (post-launch):** match intelligence, automated odds and exclusions work remain out of the MVP critical path. Keep the PR draft until a post-launch scope, rights, legal, security, quota and migration review is completed.


## 22 Nov 2026 — verification snapshot

- PR #185: five independent La Liga publishers are configured (LaLiga, TACTIX, Football Edge Lab, Flashscore, The Analyst/Opta). Standings tests pass 47/47; typecheck and Vercel build pass. Four remaining full-suite failures also reproduce on main; this PR resolves nine additional standings regressions. Production-like extraction and two-source consensus remain launch QA gates.
- PR #195: 15 evidence tests, targeted Prettier/ESLint, typecheck and Vercel build pass; review findings are resolved, including case-insensitive www normalization. Isolated SQL validation remains pending because Supabase's only branch is MIGRATIONS_FAILED. The service-role-only migration remains unapplied.
- PR #196 remains post-launch only.


PR #195's reference-price foundation stores source IDs and publisher domains separately. The bookmaker count must match both arrays, and a database trigger enforces distinct identities and checks that every source is an enabled, licensed ZA bookmaker with recorded licence/terms evidence. The migration remains unapplied pending migration-baseline reconciliation.


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


**Test baseline note (22 Nov 2026):** current main reports 13 failures across four test files. PR #185 reduces this to four failures across three files; the same four failures reproduce on main. PR #195 retains the 13-failure baseline. Do not treat the full repository suite as green.
