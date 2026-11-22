# Parallel data layer: architecture and credit budget

Owner direction (22 Nov 2026): Parallel powers PFIE fixtures, results, league tables, post-match stats, match-day line-ups,
pre-match bookmaker reference odds, team-badge discovery, Newsroom research and selected live research tasks.
Form is derived from verified results; member-entered odds remain separate; no in-play odds are collected. "Manually added odds" means the odds members enter when they submit a pick or a slip (owner, 15 Nov). Credits are spent as sparingly as possible without hurting quality.

Budget: about **$50 prepaid, expiring 7 Dec 2026**, plus **$5 of free credit a month**. The recorded spend snapshot (13-15 Nov) was 181 searches and 5 extracts, about $0.19; it predates the latest standings and match-intelligence work. Check api_spend_status() before increasing cron volume.

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

| Feature | Parallel API / verification | Cadence | Cache / freshness | Implementation status |
|---|---|---|---|---|
| Fixtures | Search + page extraction + Gemini observations; deterministic fixture identity, date, venue and kickoff validation; official source or independent corroboration | Daily, one competition at a time | Search 12 h; extracted source pages are freshness-bounded | Existing PFIE feed |
| Results | Search + page extraction + Gemini observations; score/status validation and independent source corroboration; full-time back-off | After expected full time, then retry with back-off | Search 30 min | Existing PFIE feed |
| League tables | Search + up to four independent official/trusted page extracts; source-specific Gemini extraction; strict row arithmetic, team identity, date and publisher independence checks; Wikipedia is excluded from standings evidence | Scheduled daily windows; one competition per request | Live Extract max age 15 min; stale fallback disabled; public stale state after 18 h | Existing PFIE standings pipeline; Bundesliga + DFB and La Liga + TACTIX + Football Edge Lab direct source candidates; disputed source snapshots retained in sync metadata |
| Team form | No Parallel call. Computed deterministically from Puntr verified completed-match results | Recomputed when stored results change / are read | Derived from stored final scores | Existing |
| Match statistics | Search + up to four independent official/trusted page extracts + Gemini structured observations; each displayed metric must agree across at least two independent publishers | Finished soccer fixtures in the last 48 h; one fixture per cron call; failed attempts back off 30 min | Search 15 min; Parallel Extract maximum age 15 min; no stale fallback | New PFIE match-intelligence worker in this PR |
| Match-day players | Search + up to four independent official/trusted pages + Gemini extraction; only a full starting XI for each side; player/role consensus required across two publishers; position shown only if independently agreed | Soccer fixtures scheduled within the next 90 min, rugby fixtures within 72 h, plus matches kicked off in the previous 15 min; 11 starters for soccer / 15 for rugby; 10 min soccer and 30 min rugby retry back-off on a 15 min cron | Search 15 min; Parallel Extract maximum age 15 min | New PFIE line-up worker in this PR; full season squad/transfer registry remains a later phase |
| Pre-match odds | Parallel Search targets all nine registered domains; up to four distinct operators are selected and read concurrently, rotating the four-source window between the two daily runs; every selection requires two independent bookmakers; median reference price | Two daily windows (07:00–07:55 and 14:00–14:55 SAST), one competition per five-minute request; only fixtures in next 72 h and at least 30 min before kick-off | Search 6 h; Extract maximum age 15 min | Existing feed strengthened in this PR |
| Member-entered odds | None. Typed by the member and checked against the stored reference | Per pick / slip | n/a | Existing; never overwritten by reference |
| Team badges | Parallel Search discovers candidate team articles; current resolver verifies the crest via the Wikipedia summary API and mirrors approved images to Storage; unresolved/ambiguous cases stay in the admin queue | Hourly batches; up to 8 teams per run | Badge result permanent until forced retry | Existing; direct official-source image extraction is a future enhancement |
| Team news | Monitor or Search/Extract with source-date checks, author attribution and separate rumours/facts labels | Not scheduled in production yet | To be set when implemented | Planned; do not describe as live |
| Confidence Score | Deterministic model on verified form, H2H, standings, home/away and reference odds | On fixture / source-data change | Derived from stored data | Existing / incremental |
| Deep Analysis drawer | Gemini prose only from stored facts; no generated numeric claims | Cached per fixture | 24 h | Existing |
| Slip analysis | On-device OCR + parser; reference odds check only | Per slip | n/a | Existing |
| Punt AI chatbot | Answers first from Puntr data via Gemini; web-dependent research is quota/credit gated | Per message | 1 h per normalised question | Existing |
| Newsroom research | Search + Extract, editorial review and source URLs | Daily article workflow | 6 h | Existing |

**Cost controls:** Every Search, Extract and Gemini request is quota-claimed. Search is cached before the quota guard. Match intelligence processes one fixture per request, makes one search, reads at most four independent pages concurrently and performs one structured Gemini extraction. The cron is every 15 minutes, but it only consumes work when a fixture is due. Actual cost must be monitored through api_budgets and api_spend_status(); do not treat the former $0.20/day estimate as a guaranteed ceiling.


## Odds rules (owner decisions, updated 22 Nov 2026)

There are two kinds of odds, and neither overrides the other:

1. **Market reference odds (automated, pre-match only).** Collected through Parallel from the curated South African bookmaker source registry, at most twice per competition per day, never after kick-off and never in-play. Each bookmaker is represented by one source identity even if it exposes multiple subdomains. Up to four distinct operators are read concurrently; a price is published only when at least two independent operators provide the same selection. The reference is the median of the corroborating prices.
2. **Member-entered odds (manual).** The price a member types when submitting a pick or a slip leg. This is the member's own record: it is what they took, it stays on their pick, and it is part of the pick's verification hash (src/lib/verify.ts). It is never replaced by the reference price.

The source registry currently contains nine domains, mapped to operator legal entities and published licence disclosures: Hollywoodbets, Betway, 10bet, YesPlay, Topbet, World Sports Betting, Betfred South Africa, PlayaBets and Supabets. Registry entries are curated in src/lib/odds/reference.ts; the ODDS_SOURCE_DOMAINS environment variable can narrow the list but cannot add an unreviewed domain. A registry entry is not a blanket legal opinion: each operator's current provincial licence, the precise online domain and its terms governing automated reading must be rechecked before activation and periodically thereafter. South African bookmaker licences are provincial, not a single national licence; use the National Gambling Board's verified-operators directory and the operator's current legal disclosures as the evidence trail.

How they work together:

- The pick form shows the reference price next to the odds field as a hint and can prefill it; the member can change it.
- When a member's odds are far from the reference at the time of the pick (default: more than 25% above it), the pick is saved as entered but marked **"odds unverified"**. It cannot be blocked: the member may genuinely have found a better price.
- Anything that rewards higher odds uses the lower of the two prices for "odds unverified" picks: today that is the ranking threshold in src/lib/records.ts (picks at 1.50 or more), and later any ROI or yield figure. Points for correct picks do not depend on odds, so they are unaffected.
- With no reference price for that market, member odds stand as entered (as today).

Display and compliance rules for the reference price:

- **One reference price per selection, no comparison table.** CLAUDE.md forbids odds comparison at launch; changing that needs the owner and a CLAUDE.md edit.
- **No bookmaker branding or links** next to a price until that bookmaker is live in affiliate_partners (Hollywoodbets 2.10: approved creatives only).
- Sources: only the curated licensed-operator registry, and only where the relevant operator's terms allow automated reading. Legal review remains required.
- Always through odds() from src/lib/format.ts; never for members under 18 or on a break.
- Legal copy in the same PR as the feature: Terms (reference odds are indicative, may be out of date, not an offer from Puntr; how "odds unverified" affects rankings).

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

## Build order and implementation status (22 Nov 2026)

1. **Parallel foundation — implemented.** Search/Extract adapters, stable cache keys, response cache, quota claims, provider budgets and spend status are in src/lib/parallel and the quota layer.
2. **Fixtures and results — implemented.** PFIE discovers and validates fixture/result data, with source provenance, deterministic checks and back-off.
3. **League tables — implemented and recently hardened.** Per-source extraction, date/row validation, publisher independence, alias resolution, Bundesliga and DFB direct sources, La Liga official + TACTIX + Football Edge Lab candidates, current-only table extraction and timeout-safe one-competition cron batches. Disputed source snapshots are retained for audit.
4. **Pre-match odds — implemented; this PR tightens verification.** The reviewed source registry contains nine SA operators; up to four independent operators are read concurrently; a market selection is not published without two independent bookmaker sources. No in-play collection.
5. **Match intelligence — new in this PR.** A scheduled PFIE worker collects soccer post-match stats and match-day line-ups using Parallel Search + Parallel Extract + Gemini, then deterministic validation and two-source consensus. Stats and line-ups are stored separately with source domains, source URLs, short evidence excerpts and verification timestamps. Full team-season squad and transfer history are a later phase.
6. **Form — implemented as a deterministic derived metric.** It is computed from verified final results; it is not an AI or third-party form feed.
7. **Team badges — implemented with a known limitation.** Parallel Search discovers candidate team articles, but the current image resolver still relies on Wikipedia summaries for the crest image. Direct official-club/league image extraction is a future improvement; unresolved matches remain in the admin queue.
8. **Team news / Monitor — planned, not production-live.** Do not describe it as active until the Monitor subscription, webhook, source provenance and failure handling are implemented and tested.
9. **Confidence Score, Deep Analysis, Punt AI and one-off season backfills — continue to use stored verified facts and the existing quota/cost controls.**

Self-Exclusion is a separate responsible-gambling workstream. No identity, counselling, health or exclusion data may be sent to Parallel or any general-purpose AI provider.

## Unknowns to confirm on the first live call

- Task result endpoint (`GET /v1/tasks/runs/{run_id}/result`, used by the SDK) and the exact `basis` field names.
- Monitor billing per scheduled execution, and the update/cancel endpoints.
- Chat endpoint `/v1beta/chat/completions` request shape (OpenAI-compatible).
