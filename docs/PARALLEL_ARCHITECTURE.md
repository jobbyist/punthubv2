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
| Team news and line-ups | **Monitor lite**, one per league, `1d` | daily; webhook writes `team_news` | n/a | 12 executions, $0.036 |
| Match stats (post-match) | Extract of the official match page found by results search | once per finished fixture | permanent | ~15, $0.015 |
| **Pre-match odds** | Extract of one competition page per source (all fixtures on one page), Gemini parses, code validates | 2 runs a day, only fixtures kicking off in the next 72 h | 6 h | ~40 URLs, $0.04 |
| **Member-entered odds** (picks and slips) | none: typed by the member, checked against the market reference | per pick | n/a | $0 |
| Confidence Score | none: deterministic model on stored form, H2H, table, home/away and odds | on fixture change | n/a | $0 |
| Deep Analysis drawer | none for numbers; Gemini prose from stored facts, cached per fixture | once per fixture per day | 24 h | $0 (Gemini free tier) |
| Deep research brief (featured fixtures only) | Task **lite** with a JSON output schema and source policy | ~3 a matchday | until kick-off | ~$0.02 |
| Slip analysis | none for parsing (on-device OCR + parser); odds check against stored odds | per slip | n/a | $0 |
| Punt AI chatbot | Answers first from Puntr's own data via Gemini; **Chat low** only for questions needing the live web, and only for Pro or credit-paying members | per message | 1 h per normalised question | charged to the member's credits |
| Newsroom research | Search fast + Extract (existing) | 1 article a day | 6 h | ~8, $0.008 |
| Team badges | Parallel Search fast + Wikipedia summary verification; mirrored to Supabase Storage | one-off per fixture team and curated hero marquee team; admin can force retry | permanent | ~0 |

**Steady state: about $0.20 a day ($6 a month).** That is a little over the free $5, so the planner keeps it under by
skipping competitions with no fixture in the next 10 days and by the cache. If it still runs over, the Monitor and
deep-research briefs are the first to be throttled (they degrade gracefully: the card shows "no team news yet").

## Odds rules (owner decisions, 15 Nov 2026)

There are two kinds of odds, and neither overrides the other:

1. **Market reference odds (automated, pre-match only).** Collected through Parallel (or another automated
   source) at most twice a day, never after kick-off, never in-play. Shown on match cards and in the pick form as
   "Market reference, as at 14:00 SAST".
2. **Member-entered odds (manual).** The price a member types when submitting a pick or a slip leg. This is the
   member's own record: it is what they took, it stays on their pick, and it is part of the pick's verification
   hash (`src/lib/verify.ts`). It is never replaced by the reference price.

How they work together (proposed defaults, owner to confirm):

- The pick form shows the reference price next to the odds field as a hint and can prefill it; the member can
  change it.
- When a member's odds are far from the reference at the time of the pick (default: more than 25% above it), the
  pick is saved as entered but marked **"odds unverified"**. It cannot be blocked: the member may genuinely have
  found a better price.
- Anything that rewards higher odds uses the lower of the two prices for "odds unverified" picks: today that is the
  ranking threshold in `src/lib/records.ts` (picks at 1.50 or more), and later any ROI or yield figure. Points for
  correct picks do not depend on odds, so they are unaffected.
- With no reference price for that market, member odds stand as entered (as today).

Display and compliance rules for the reference price:

- **One reference price per selection, no comparison table.** CLAUDE.md forbids odds comparison at launch;
  changing that needs the owner and a CLAUDE.md edit.
- **No bookmaker branding or links** next to a price until that bookmaker is `live` in `affiliate_partners`
  (Hollywoodbets 2.10: approved creatives only).
- Sources: only licensed SA bookmaker sites, and only where their terms allow automated reading `[attorney review]`.
- Always through `odds()` from `src/lib/format.ts`; never for members under 18 or on a break.
- Legal copy in the same PR as the feature: Terms (reference odds are indicative, may be out of date, not an offer
  from Puntr; how "odds unverified" affects rankings).

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

## Build order

1. **This PR, foundation:** `src/lib/parallel/` with prices, a cost function, a cache key, the response cache, a
   USD budget guard, and Task and Chat clients. Migration `parallel_cache`, `api_unit_prices`, `api_budgets`,
   quota rows for the new provider keys, `api_spend_status()`. Existing callers keep working unchanged.
2. Pre-match reference odds feed + "odds unverified" check on member-entered odds + Terms copy.
3. Team news via Monitor (webhook route with a shared secret, `team_news` table) on match cards.
4. Confidence Score model (deterministic, tested) + Deep Analysis drawer on real data.
5. One-off jobs above, run before 7 Dec.
6. Punt AI chatbot (credits, AI label, no-advice disclaimer, legal copy).

## Unknowns to confirm on the first live call

- Task result endpoint (`GET /v1/tasks/runs/{run_id}/result`, used by the SDK) and the exact `basis` field names.
- Monitor billing per scheduled execution, and the update/cancel endpoints.
- Chat endpoint `/v1beta/chat/completions` request shape (OpenAI-compatible).


## 22 Nov 2026: La Liga standings source coverage

The live La Liga table now has three direct candidates: the official LaLiga standings page, TACTIX and Football Edge Lab. Parallel Extract reads each independently; publisher identity normalization prevents subdomains from inflating consensus. These candidates still pass the same 20-team, row-evidence, arithmetic, date and two-independent-publisher checks before publication.
