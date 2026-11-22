# PFIE Match Intelligence — Implementation Plan

**Updated:** 22 November 2026  
**Scope:** Fixtures, results, team form, standings, match statistics, bookmaker reference odds and match-day player data.

## Product objective

PFIE should be Puntr's source-backed sports facts layer. Every public fact should have a traceable source, a timestamp, a validation outcome and a clear freshness state. Parallel Search discovers candidate sources; Parallel Extract reads publisher pages; Gemini may structure source text but never decides truth. Deterministic code validates the output and decides what can be published.

## 1. Data domains and current implementation

| Data domain | Source / validation model | Where Puntr uses it | Status |
|---|---|---|---|
| Fixtures | PFIE Search + page extraction; team, competition, kickoff, venue and identity checks; official or corroborated sources | Fixtures, predictions, match cards | Existing |
| Results | PFIE Search + extraction; full-time status and score checks; independent corroboration and retry/back-off | Results, records, points settlement, team form | Existing |
| Standings | Parallel Search + up to four independent page extracts; source-specific extraction; arithmetic, completeness, date and publisher identity validation | Tables, team form context, match analytics | Existing; recent reliability improvements |
| Team form | Deterministic calculation from verified final results; no generative model and no separate form publisher | Match cards, analytics drawer, confidence | Existing |
| Match statistics | Parallel Search + Parallel Extract + Gemini source-by-source observations; per-metric two-source consensus | Match analytics drawer | Implemented in this PR; migration and live verification pending |
| Match-day player data | Parallel Search + Parallel Extract + Gemini; 11 starters per team; player/role intersection across two independent sources; position only if agreed | Match analytics drawer | Implemented in this PR; migration and live verification pending |
| Pre-match reference odds | Curated SA operator registry; one live page per operator; at least two independent bookmaker identities for each published selection; median price | Pick form, reference-price checks, slip analysis | Existing feed strengthened in this PR |
| Full club squads / transfers / injuries | Separate player identity registry, official club/league sources, transfer-date and club-membership checks | Future team and player profiles | Not yet implemented |
| Team news | Monitor/Search + Extract with date, author and rumour/fact provenance | Future news and match pages | Not yet production-live |

## 2. Verification contract

### Source selection

- Prefer official competition, league, federation and club sources.
- Use established sports publishers as independent corroboration.
- Search snippets are discovery signals only; they are never sufficient evidence for a public value.
- Count a publisher once. Subdomains, mirrors and alternate domains belonging to the same publisher/operator must not inflate consensus.
- Do not use historical-season pages for current data.
- Preserve source URL, domain, retrieval/verification timestamp and a short evidence excerpt.
- Fail closed when the source page does not show the relevant fixture, teams, date or value.

### Fixtures and results

The existing PFIE fixture/result pipeline remains the authoritative source for match identity, kickoff, venue, score and match status. Do not create a parallel competing fixture identity system. A future provider may contribute corroboration but must write through the same canonical fixture resolver and audit trail.

### Form

Form is a derived value. Compute it from verified completed results only, with explicit home/away and competition scope. Never accept a model's opinion or a third-party publisher's form strip as the source of truth. Recompute after a result correction and retain the underlying match references.

### Match statistics (soccer first)

The initial schema supports possession, shots, shots on target, corners, fouls, yellow cards and red cards. xG, player ratings and other provider-defined metrics are excluded from the first release.

- Extract each publisher independently.
- Validate the home/away order, fixture date, team names, source quote and numeric ranges.
- Shots on target cannot exceed total shots.
- Home and away possession must sum to approximately 100%.
- Count metrics must agree exactly across at least two independent publishers.
- Possession may differ by no more than one percentage point; use the median of the agreeing observations.
- A metric without two-source agreement is omitted, not guessed or averaged across conflicting definitions.
- Publish a record only when at least three metrics per team pass consensus.
- Store the two-or-more source domains, URLs, short evidence excerpts and verification timestamp.

### Match-day players

The first release is match-day line-ups and named substitutes, not a complete club-season squad database.

- Soccer and rugby fixtures are eligible for line-ups in the initial release; post-match statistics remain soccer-only.
- The source must show the exact fixture, date and both teams.
- Each accepted page must include 11 starters for soccer or 15 starters for rugby for each team.
- A player and role (starter/substitute) is shown only when two independent sources agree.
- Position is shown only when at least two sources agree on the same position label.
- Do not infer line-ups from a club squad list, predicted XI, injury report or social post.
- If sources disagree, omit the disputed player/role and do not publish an incomplete starting XI.

### Bookmaker reference odds

- Keep a curated nine-operator registry in code. Search cannot add a bookmaker.
- Map every approved domain to one legal operator identity; aliases/subdomains count once.
- Verify the legal entity and current provincial bookmaker licence from the operator's own legal disclosure and the NGB verified-operators directory where listed.
- Review the exact domain and the operator's terms for automated reading. A licence alone does not grant permission to scrape.
- A market selection requires two independent bookmaker identities. The reference price is the median of their decimal prices. Search targets all nine registry domains, and up to four independent operators are selected per competition refresh; the selection rotates between the two daily windows to cover the full registry over successive days.
- No in-play odds; no comparison table; no bookmaker branding/links unless the affiliate relationship and creative approval permit it.
- Member-entered odds are a separate user record and must never be overwritten by the market reference.

## 3. Scheduling and cost controls

- Process one fixture per match-intelligence cron request to stay inside pg_net's HTTP execution budget.
- Stats: completed soccer fixtures from the previous 48 hours; retry failed attempts after 30 minutes.
- Line-ups: soccer fixtures scheduled within the next 90 minutes, rugby fixtures within the next 72 hours, plus matches kicked off in the previous 15 minutes; retry back-off is 10 minutes for soccer and 30 minutes for rugby, with the cron running every 15 minutes.
- One job uses one Parallel Search, up to four independent Parallel Extract page reads concurrently and one bounded Gemini extraction.
- Search cache TTL: 15 minutes. Extract maximum source age: 15 minutes. Stale fallback is disabled.
- Search, Extract and Gemini are quota-claimed. Use actual api_budgets / api_spend_status telemetry to tune cadence; do not rely on a fixed daily-cost estimate.
- A successful verified record is not scraped again on every cron tick. Failed jobs are recorded in sync_status and retried with back-off.

## 4. Storage and display

The new public tables are:
- public.fixture_match_stats — home/away metric objects, source domains, source details, verified_at.
- public.fixture_lineups — home/away player arrays, source domains, source details, verified_at.

Public clients receive read-only access. Only the service role can write. The match analytics drawer shows these values only when a verified row exists and displays source domains and verification time. No unverified placeholder values are displayed as facts.

## 5. Rollout and acceptance gates

### Phase 1 — this PR
- [x] Add deterministic two-source validators for soccer stats and match-day line-ups.
- [x] Add Parallel Search + Parallel Extract + Gemini worker.
- [x] Add one-fixture cron route, 15-minute schedule migration and quota guards.
- [x] Add public read-only tables and source provenance.
- [x] Surface verified stats and line-ups in the match analytics drawer.
- [x] Strengthen odds collection to four distinct bookmaker identities and two-source minimum.
- [x] Update PARALLEL_ARCHITECTURE.md and PFIE integration/technical docs.
- [ ] Apply the Supabase migration.
- [ ] Verify one real upcoming fixture line-up and one recent completed fixture stats record in production.
- [ ] Confirm source domains and evidence excerpts are correct before marking the feed production-live.

### Phase 2 — coverage expansion
- Add sport-specific stats schemas for rugby, cricket, basketball and other active sports. Do not force soccer metric definitions onto other sports.
- Add a canonical player identity registry, club/competition membership history and transfer-date checks.
- Add complete club squads and player season stats only where official/trusted sources and data rights permit.
- Add source health, correction and regression monitoring for team aliases and renamed competitions.

### Phase 3 — broader intelligence
- Add player availability/injury reports only with clear source dates and official or independently corroborated evidence.
- Add team news via Monitor only after webhook delivery, event deduplication, attribution and failure handling are tested.
- Add historical trend APIs and export endpoints after the stored data and licensing terms are stable.

## 6. Separation from Self-Exclusion

The Self-Exclusion & Education Programme is a separate responsible-gambling workflow. Do not search for, extract, store or send any person's identity, health, counselling, gambling-harm or exclusion data through Parallel, Gemini, bookmaker feeds or analytics. The public /exclusions page is an education/referral holding page; it is not a statutory exclusion application.


### Standings source coverage carried forward

The live standings pipeline uses direct source candidates for Bundesliga (Bundesliga.com + DFB) and La Liga (official LaLiga + TACTIX + Football Edge Lab). Projected/simulated tables are excluded. When two publishers do not agree, the prior verified table remains published and per-source row snapshots are stored in sync metadata for diagnosis.
