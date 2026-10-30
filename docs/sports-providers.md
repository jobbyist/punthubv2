# Sports data providers: a curated mix (research, 30 Oct 2026)

Owner request (30 Oct 2026): free-plan alternatives to API-Sports for football fixtures, live scores, stats, odds and predictions, covering the leagues South African fans, tipsters and bettors follow, and a curated mix of providers as needed. Prices and limits below are from the providers' pages or reviews on 30 Oct 2026; check them again before paying.

## The short answer

No free plan gives the **current Betway Premiership season with live scores**. The cheapest reliable route for launch is one paid API-Football plan (about $19 a month) for the PSL and everything else, plus free providers as fallbacks and for top European leagues. Live scores on a free plan don't work at our scale: about 100 requests a day is roughly 100 minutes of once-a-minute polling.

## Football: who covers what

| Provider | Free plan | PSL (Betway Premiership) | Live scores | Stats and lineups | Odds | Predictions | Paid from |
|---|---|---|---|---|---|---|---|
| **API-Football** (API-Sports, already integrated) | 100 req/day, every endpoint, but only past seasons (our live sync on 29 Oct was refused for the current season) | Yes (league 288) | Yes, about every 15 s | Yes | Yes (pre-match, 7 days kept) | Yes, per league (`coverage.predictions`) | Pro about $19/mo, 7,500 req/day |
| **Highlightly** | 100 req/day, all leagues listed on Basic, live, lineups, match stats | Not confirmed: 950+ leagues in 170+ countries; check with a free key | Yes | Yes | Paid only | Not stated | $9.49/mo, 7,500 req/day |
| **football-data.org** | 10 req/min, 12 competitions (EPL, UCL, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga, Championship, Brasileirão, World Cup, Euros) | No | Delayed on free | Paid add-on | Paid add-on | No | €29/mo |
| **TheSportsDB** | 30 req/min, but tiny result caps (1 next event per league, 15 per season schedule), no livescores | Yes (league 4802, 2025-26 listed) | Premium only | Basic | No | No | $9/mo |
| **Sportmonks** | Danish Superliga and Scottish Premiership only | Not on free | Paid | Paid | Add-on | Add-on | €29/mo (5 leagues) |

Not recommended for now: Sportradar and SportsDataIO (no free tier, enterprise pricing), TheStatsAPI (trial only, $50/mo), unofficial scraped feeds such as ESPN or SofaScore endpoints (no licence for commercial use; they can break or be blocked without notice).

## Odds and predictions: careful with both

- **Odds**: CLAUDE.md says no odds comparison at launch; members enter the odds they got. The Odds API (500 credits a month free) lists no South African league or region. OddsPapi (250 requests a month free, 370 bookmakers) doesn't confirm SA bookmakers either. The best source of SA odds is our approved partners: ask Supabets and Playbet for an odds feed in follow-ups E1 and E2. Any odds shown must sit inside the advertising rules (Ad, 18+, T&Cs apply, 0800 006 008).
- **Predictions**: use API-Football's predictions endpoint only as an input to the human-reviewed AI previews (P16). Never show a provider's prediction as a tip: it breaks the copy rules (no "sure", no implied profit) and the "no house edge in your advice" positioning.

## Later sports (the /roadmap schedule)

| Sport (target) | Suggested source | Free plan | Notes |
|---|---|---|---|
| Basketball (week 2) | API-Basketball (API-Sports) | 100 req/day, past seasons only | Separate subscription; same key style and code shape as football. |
| Rugby (week 2) | API-Rugby (API-Sports) | 100 req/day, past seasons only | Already built behind `SPORTS_ENABLED=soccer,rugby`; needs the Rugby subscription. |
| Horse racing (week 4) | No public free API for SA racing | - | UK/IRE/US APIs don't cover SA meetings. Options: a data agreement with the SA racing operators, or the existing CSV import as a stopgap. **This is the riskiest date on the roadmap.** |
| Combat sports (weeks 6-8) | API-MMA (API-Sports) for MMA; boxing has no good free API | 100 req/day | Boxing fight cards via CSV import or an admin form. |
| Cricket (week 10) | CricketData.org (CricAPI) | 100 hits/day, a few minutes behind live | $5.99/mo for 2,000 hits/day. Confirm SA20 and Proteas coverage with the test tool. |
| Tennis (week 12) | Evaluate nearer the time (Highlightly, API-Tennis) | - | Not researched in depth. |

## Recommended stack

1. **Launch (now)**: API-Football Pro (about $19/mo, roughly R350) as the primary for all football, including PSL, Nedbank Cup, MTN8, CAF and the European leagues. This needs the suspended account fixed first.
2. **Free fallbacks**: football-data.org for the big European leagues if API-Football fails, and a Highlightly Basic key to test PSL coverage and compare quality.
3. **Logos and team metadata**: TheSportsDB (free) where API-Football's images are missing.
4. **Later sports**: as in the table, each switched on in `SPORTS_ENABLED` only when its data and grading work.

## How to build the mix

`src/lib/sports/provider.ts` already defines a `SportsProvider` interface, with API-Sports and a CSV fallback. To add providers:

- A provider registry: an ordered chain per sport (for example `soccer: [apifootball, footballdata]`), tried in order on failure or quota exhaustion, with each provider's daily budget tracked so the cron never burns a quota.
- Store the provider name and its external ID on each fixture, and map teams between providers in a table, because each one uses different IDs and names. Results from a fallback must match the same fixture so settlement stays correct.
- Keys as server-only env vars (`FOOTBALL_DATA_KEY`, `HIGHLIGHTLY_KEY`, ...). No personal data goes to any provider.
- Legal: providers that receive no personal data are not processors, but the Privacy page lists data sources, so add each one there in the PR that switches it on.

## Sources

- API-Football pricing and beginner's guide: https://www.api-football.com/pricing, https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide
- Highlightly: https://highlightly.net/football-api/, https://highlightly.net/blogs/best-football-apis-in-2026
- football-data.org free tier: https://www.thestatsapi.com/blog/football-data-org-free-tier-limits-2026
- Sportmonks free plan: https://www.sportmonks.com/football-api/free-plan
- TheSportsDB: https://www.thesportsdb.com/documentation, https://www.thesportsdb.com/season/4802-south-african-premier-soccer-league/2025-2026&all=1&view=1
- The Odds API sports list: https://the-odds-api.com/sports-odds-data/sports-apis.html
- OddsPapi and The Odds API free tiers: https://oddspapi.io/blog/the-odds-api-free-tier-limits
- CricketData.org pricing: https://cricketdata.org/pricing/
