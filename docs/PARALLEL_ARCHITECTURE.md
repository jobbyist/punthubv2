# Parallel data layer: architecture and credit budget

Owner direction (15 Nov 2026): Parallel's APIs power fixtures, results, tables, match stats, team news, slip
analysis, Confidence Scores, Deep Analysis, the Punt AI chatbot, Newsroom research and **pre-match odds** (no
in-play). "Manually added odds" means the odds members enter when they submit a pick or a slip (owner, 15 Nov). Credits are spent as sparingly as possible without hurting quality.

Budget: about **$50 prepaid, expiring 7 Dec 2026**, plus **$5 of free credit a month**. Spend so far (13-15 Nov):
181 searches and 5 extracts, about $0.19.

## Ground rules

1. **Code decides truth, AI does not.** Parallel finds and reads sources; Gemini extracts into a fixed schema;
   deterministic code validates and corroborates (official site, or two independent domains agreeing). This is the
   existing PFIE rule and it applies to every new feed.
2. **Cache before you call.** Every Parallel request goes through `parallelCache` keyed on endpoint + normalised
   body, with a TTL per purpose (below). A repeated question inside its TTL costs nothing.
3. **Cheapest tool that answers.** Search `fast` ($1/1,000) and Extract ($1/1,000 URLs) do most of the work. Task
   API, Chat and Monitor are used only where they replace many cheaper calls or add real quality.
4. **Dollar caps, not just call caps.** Each call claims units against `api_quota_limits` (daily/monthly call caps,
   fail closed) and against a monthly USD budget per provider family (`api_budgets`), priced from `api_unit_prices`.
5. **No personal data to Parallel.** Queries are about teams, fixtures and competitions only. Slip analysis sends
   scrubbed slip text through the existing scrubber, never a photo, name, username or balance.

## Prices (docs.parallel.ai/getting-started/pricing, checked 15 Nov 2026)

| API | Tier | USD per call | Puntr provider key |
|---|---|---|---|
| Search | fast | 0.001 | `parallel` |
| Extract | per URL | 0.001 | `parallel-extract` |
| Task | lite / base / core / pro | 0.005 / 0.01 / 0.025 / 0.10 | `parallel-task:<processor>` |
| Chat (Responses) | low / medium | 0.01 / 0.05 | `parallel-chat:<effort>` |
| Monitor | lite / base, per execution | 0.003 / 0.01 | `parallel-monitor:<processor>` |

Rate limits are far above our needs (Search/Extract 600/min, Tasks 2,000/min, Chat 300/min).

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
| Team badges | Parallel Search fast + Wikipedia summary verification; mirrored to Supabase Storage | one-off per fixture team and curated hero marquee team; admin can force retry | permanent | ~0 |

**Cost note:** The earlier steady-state estimate is not a current forecast: it assumed automated odds and Monitor-based team news that are not launch-enabled. Use api_spend_status() and the live quota/budget tables before increasing any provider cadence. At MVP, automated bookmaker odds and team-news Monitor jobs remain disabled.

## Odds rules (owner decision, 22 Nov 2026)

**MVP decision: member-entered odds only. Automated bookmaker odds are deferred.**

Puntr has not received an authorized odds API, affiliate odds feed or other odds-data integration from any South African bookmaker. Affiliate approval (including Hollywoodbets) does not by itself grant odds-feed rights.

- **Member-entered odds:** the member enters the bookmaker and price for a pick or slip leg. Preserve the submitted price, bookmaker attribution and timestamp as the member's record and in the pick verification hash (src/lib/verify.ts). Never overwrite it with a later market price.
- Label these values **User-submitted**. Do not imply that Puntr independently verified the price or that it is live/current.
- Do not block pick submission because no automated reference price exists.
- Do not enable automated odds, comparison tables, bookmaker logos or odds links unless the relevant data rights and branding permissions are documented and approved.
- Parallel Search can discover potential sources; Extract can retrieve pages only where automated access and reuse are permitted; Monitor can detect scheduled changes. None is a substitute for a licensed data feed or permission to store/display/redistribute prices.
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

The La Liga direct-page candidate roster is capped at five independent publishers: official LaLiga, TACTIX, Football Edge Lab, Flashscore and FootballCritic. Parallel Extract reads each independently; publisher identity normalization prevents subdomains or mirrored properties from inflating consensus. These are candidate sources, not guaranteed coverage: each must pass the same 20-team, row-evidence, arithmetic, date and two-independent-publisher checks before publication.


## Production status and migration/cron audit (22 Nov 2026)

- Production migration history contains 101 entries and ends at 20261121235610.
- The repository main branch also has 101 migration files, but only one exact version-prefix match exists between the two histories. Several entries are renamed, split or consolidated; do not use filename similarity alone to repair migration history.
- Four active PFIE table cron jobs exist in production (IDs 61–64). Their current schedules differ from the latest pending schedule migration. Keep the live schedule unchanged until a complete migration mapping and backup/rollback plan are verified.
- 20261122110000_pfie_live_standings_refresh.sql contains malformed dollar-quote syntax and must not be applied as written.
- Production audit: standings have 7/12 scopes with a recorded successful sync; 5/12 have never succeeded. Automated odds have 0/11 successful scopes. Recent fixture/result runs exist.
- cron.job_run_details contains 17,919 records overall, but none yet for the new PFIE table job IDs 61–64 as of 01:22 UTC; their first scheduled window begins at 02:10 UTC. Other scheduled jobs continue to run. net._http_response showed successful Vercel responses and one 55-second timeout; the response record did not retain the request path, so the timeout could not be assigned to a specific cron job.
- No production migration, cron schedule or schema change was made during this audit. The detailed launch gate and reconciliation procedure are tracked in /dev/IMPLEMENTATION-PRIORITIES.md.



## 22 Nov 2026: PFIE pull-request sequencing

- **PR #185 (pre-launch):** La Liga direct-page candidates are capped at five: LaLiga, TACTIX, Football Edge Lab, Flashscore and FootballCritic. A source candidate is not a verified table; extraction, freshness, complete-row evidence and two-independent-publisher consensus remain mandatory. If fewer than two sources pass, retain the last verified table and surface stale/unavailable status.
- **PR #195 (pre-launch merge candidate):** evidence validation must require captured page text and a curated source-registry mapping from each source ID to its publisher identity. Bookmaker source policy requires explicit ZA licence evidence and terms review. Roster records use canonical PFIE team IDs. Its migration is not approved for production application until the complete migration baseline and backup/rollback plan are reconciled.
- **PR #196 (post-launch):** match intelligence, automated odds and the associated exclusions-page work are deferred from the 1 December MVP. Automated odds remain disabled until written rights cover collection, storage, display, attribution, retention and redistribution. A technical API or affiliate approval alone is not sufficient.


## PR sequencing and launch boundary (22 Nov 2026)

- **PR #185 (pre-launch):** La Liga table source candidates are limited to five independent publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and Sports Mole. The configured source list is not proof of operational coverage. Publish only after the existing full-table validation and two-independent-publisher consensus succeed.
- **PR #195 (pre-launch foundation):** shared evidence checks and service-role-only schema foundation may be merged after tests and schema/security review. No bookmaker source is seeded or enabled, and no automated ingestion path is activated. Its migration remains unapplied in production pending migration-ledger reconciliation and explicit backup/rollback approval.
- **PR #196 (post-launch):** match intelligence, automated odds and exclusions work remain out of the MVP critical path. Keep the PR draft until a post-launch scope, rights, legal, security, quota and migration review is completed.
