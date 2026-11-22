# PFIE fixtures and results (Parallel Search + Gemini)

Status on 13 November 2026: code and tests **completed**; migration applied; live runs **pending credentials**.
Switch on with `SPORTS_PROVIDER=pfie` once `GEMINI_API_KEY` and `PARALLEL_API_KEY` are set in Vercel.

## What it does, and what it is not

- Once a day (02:00 UTC, existing `sync-fixtures` job) it finds fixtures for the next 14 days for the Betway
  Premiership, the Premier League and the Champions League.
- After a match (existing `sync-results` job, every 30 minutes, but at most one look per competition per 50 minutes
  and never sooner than 105 minutes after kick-off) it looks for the final score.
- **It is not a live-score feed.** A result appears when the official site shows it or two independent sites agree,
  typically one to two hours after full time. Settlement then runs as it always has.

## How a fact becomes a fixture

1. **Discovery**: one Parallel Search call per competition; the official page is also read in full when a page
   reader is configured (Firecrawl, then Parallel Extract).
2. **Extraction**: one Gemini call (lite model first). The model only lists what each page states, with a quote.
3. **Validation (code)**: the quote must be on the page, both team names must be on the page, the date must be in
   range, a final score must be inside the quote, a match cannot be finished before it could have ended. Anything
   else is rejected and logged with the reason.
4. **Corroboration (code)**: the competition's official site is authoritative. Without it, two different sites must
   state exactly the same kick-off (compared in UTC) or score. Disagreement = disputed. Single-source and disputed
   facts stay in the audit tables and never reach `public.fixtures`.
5. **Publishing**: verified fixtures go to `public.fixtures` with `provider = 'pfie'` through the existing sync, which
   never overwrites a finished fixture.

Time zones: a time is used only if the page prints its zone (SAST, GMT, ET ...) or the site is known to print one
zone (`time.ts`). Team names: short forms are matched only when exactly one club fits (`teams.ts`).

## Audit

`pfie_runs` (one row per competition per run: sources with content hashes, model, decisions, error) and
`pfie_observations` (every accepted and rejected statement with its quote and reason). Admin read only; 60 days kept.

## Cost (estimates to confirm on the Parallel dashboard after the first week)

About 3 searches and 3 page reads a day for fixtures, plus roughly 1 to 3 of each per competition on match days, plus
1 search and up to 4 page reads for the daily article: in the order of 300 to 400 searches a month. At the published
rates (about $5 per 1,000 searches, $1 per 1,000 extracted pages) that is about $2 a month, so a $50 balance lasts
well past launch. Gemini: about 10 to 40 lite-model calls a day, inside the free allowance.

## Known limits

- Official page addresses for the Premier League and Champions League are unverified until the first live run; if
  one fails, the run continues on search results.
- Kick-offs listed only on fan or aggregator sites are not published until a second site agrees.
- A competition whose official site blocks readers depends on two-site agreement, which is slower.
- Cup competitions and other leagues need an entry in `PFIE_SOURCES` (`provider.ts`).

## Live checks to do with real keys

Run `/api/cron/sync-fixtures` by hand, then compare every published row with the official sites; read
`pfie_observations` rejections; confirm the three official page addresses; run a results check after the next PSL
match and compare with the official score before any settlement is trusted.

## Wider coverage and zone-less pages (14 Nov 2026)

- 21 competitions (see `PFIE_SOURCES`). The 15 added on 14 Nov are search-only (no full-page reads) to stay
  inside the Firecrawl free tier. `TRACKED_COMPETITIONS` in `src/lib/match/competition-meta.ts` must list the same
  keys (a test checks).
- FOUND 14 Nov: La Liga, Serie A, Bundesliga and UCL extracted 14-23 fixtures each but published none ("no
  kick-off time with a known time zone"): their pages print times without a zone. Two fixes, both deterministic:
  1. Every competition's queries now include a "SAST" query, which pulls in South African sites (SuperSport,
     KickOff, Soccer Laduma, all `.co.za`) whose zone is known.
  2. A page with a time but no zone keeps `kickoffCandidates` (that time in UTC, UK, CET and SAST). It can
     CONFIRM a time a different site states with a zone when one candidate equals it exactly; it never sets a
     time by itself. Two independent sites are still required.
- Results checks back off per competition: 50 min soon after kick-off, then a third of the time since the
  earliest open kick-off (`resultsGapMs`). Each competition is checked from its own earliest open kick-off.
- Parallel daily cap 80 (monthly 1,500 unchanged).

## League standings and form history (14 Nov 2026)

- Separate processes. **Standings**: `league_standings`, replaced atomically by `replace_standings()` only after at least two independent non-Wikipedia domains agree
  on every team's full played/W/D/L/GF/GA/points record. Each candidate is a freshly fetched full page from Parallel
  Extract (15-minute maximum cache age, no stale-cache fallback), discovered by Parallel Search. Quotes, team names,
  arithmetic, team count, positions and any explicitly printed table date are validated in code. An official source
  improves ranking but never bypasses independent corroboration. **Form**: derived only from completed matches, via the `completed_matches` view (finished fixtures
  plus `team_results`, a one-time backfill of the last 42 days verified by the official site or two domains).
- Refresh: `/api/cron/sync-tables`, every 5 minutes 04:10-05:55 SAST for general sync (one due job per call) and every 5 minutes 16:10-17:55 SAST for priority standings (one due job per call). The five priority competitions (PSL, Premier League, La Liga, Serie A and Bundesliga) refresh at least every 12 hours; other configured tables refresh at least every 24 hours. A newly confirmed result triggers an earlier refresh. History runs once per league (and again only if a quarter
  of teams have fewer than 5 recorded results).
- Matchday: trigger `fixtures_after_result` calls `apply_result_to_standings()` when a result is confirmed: the
  result is applied once (`standings_applied`), only if it kicked off after the table was taken; positions are
  re-ranked (points, GD, GF, name) until the next refresh restores each league's tie-break rules. No API call.
- Reliability: every attempt goes through `record_sync()` (`sync_status`: last attempt, success, failures, error,
  meta). Failures retry after 20 and 40 minutes, then wait a day. `/tables` shows a stale notice when the last success is older than 18 h or the last attempt failed; Admin > System
  shows the Data sync panel.
- Cost: per standings refresh 1 Parallel search + up to 5 Parallel page extracts + up to 10 source-specific Gemini Flash/Flash-Lite calls (one initial extraction and at most one targeted retry per source). Each source is extracted independently to prevent cross-source row blending. Priority tables
  refresh twice daily; other tables refresh daily. Quotas go through `api_quota_claim` as before.
- No cache layer exists to invalidate: pages read Supabase directly, so a table change shows on the next load.


## 14 Nov 2026: chunked fixture sync, trusted-time rule, season backfill
- `/api/cron/sync-fixtures` (PFIE) runs the competitions not synced in the last 12 h, oldest first, writing each as
  it finishes and stopping new ones after 150 s (`syncFixturesByCompetition`). Cron every 6 min 03:00-03:42 SAST.
  `?force=1` ignores the 12-hour rule.
- Corroboration: a zoned time from one TRUSTED outlet is verified when another site lists the same match on the same
  printed date and nobody states another time (`corroborate.ts`).
- Season backfill: job `season` in `runTablesSync`, 21-day windows from 1 Aug of last season to today - 42 days,
  newest first; scope `<key>:<start>` in `sync_status`. Cron `sync-season` every 10 min 06:00-06:50 SAST (see 15 Nov below), two
  windows per call (`/api/cron/sync-tables?job=season&max=2`). Same verification as form history (official site or
  two domains with the same score). Results show on `/results` > Season results with their source domains.

## 15 Nov 2026: season backfill windows

- Windows are now 7 days (about one matchday), not 21. Searches carry the exact dates, the month names, a
  "weekend round-up" phrasing and up to four known club names, so results land on the right dates instead of this
  week's fixtures (the first live run rejected 18 PSL matches as `outside_date_range`).
- An answer that is not valid JSON (usually cut off at the output limit) is retried once with the three best
  sources, each shortened to 8,000 characters.
- A window that fails six times in a row is left alone, so empty windows (international breaks) stop using quota.
- Cron `sync-season` runs every 10 minutes at 04:00-05:50 UTC (06:00-07:50 SAST), three windows per call. About
  36 windows a night, newest first, so the current season fills in about two weeks.


## 22 Nov 2026: live multi-source standings verification

- Current league tables no longer come from the Wikipedia/FBref season-archive importer. That importer remains available for historical result reconciliation only.
- Parallel Search discovers current table pages. Parallel Extract fetches up to five independent official/trusted full pages per competition with a 15-minute maximum cache age and stale-cache fallback disabled. Each live page read has a single 30-second attempt (no per-page retry); a slow publisher is skipped so the remaining independent sources can still reach consensus within the pg_net request window. Competitions may also define direct official-page candidates; Bundesliga uses both Bundesliga.com and the independent DFB data centre. La Liga's five direct-page candidates are the official LaLiga standings page, TACTIX, Football Edge Lab, Flashscore and The Analyst; their publisher identities are deduplicated and published update timestamps help reject stale copies. Candidates still require successful extraction and the unchanged two-independent-publisher consensus gate. Direct full-table candidates now also cover Ligue 1, Eredivisie, Liga Portugal, the Motsepe Foundation Championship and the UEFA Champions League.
- Ligue 1 and Eredivisie source rosters were refined after live extraction diagnostics: current CBS/TNT/The Analyst/NinetyMinutesPlus feeds replace duplicate-prone Ligue 1 pages; current VI/Statz/Sportmetrics/Tribuna/Flashscore feeds replace the stale Ziggo page.
- A table is publishable only when at least two independent domains agree on each team's played, wins, draws, losses, goals for, goals against and points. Official status improves source ranking but is not a single-source bypass.
- Wikipedia is explicitly rejected for current standings. Historical pages, search snippets and unextractable pages cannot count toward consensus. A candidate is also checked against the previous verified in-season snapshot; played matches and cumulative W/D/L/GF/GA/points cannot regress. Exact duplicate rows repeated by responsive page layouts are collapsed. If a page repeats a club in overall, home and away tables, only the cumulative row that dominates the subset across P/W/D/L/GF/GA/points is retained; conflicting duplicates are rejected. UEFA's competition-ranking ties are supported without relaxing the sequential-rank rule for domestic leagues.
- Every row still passes deterministic checks: full team count, positions, row quote and team name on the source, W+D+L=played, points=3W+D, unique team identities and table ordering. An explicit table date is enforced only when its date evidence is present on the extracted page; verified dates older than 72 hours are rejected using SAST calendar boundaries. Unverified model-extracted dates are ignored.
- Priority tables refresh every 12 hours; other configured tables every 24 hours. Confirmed match results can trigger an earlier refresh. The cron runs in two daily windows, with one competition per request to stay within the 55-second HTTP timeout; the stale indicator is set at 18 hours.
- Production run reports persist all corroborating source domains, source count, primary URL, table date and extraction model in `sync_status.meta`.


### Standings failure diagnostics

When source tables pass local checks but no two independent publishers agree, PFIE keeps the existing published table unchanged and records per-source row snapshots (publisher, URL, table date, team and numeric columns) in the failed standings sync metadata. This makes disagreements auditable without weakening the two-source publication gate.


## 22 Nov 2026: La Liga source-cap and PFIE foundation decisions

- La Liga direct-page candidates are limited to five independent publishers: LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst. Do not increase the cap to compensate for an unreliable source. Each extracted table must independently pass complete-team, row-quote, arithmetic, freshness and regression checks; publication still requires two independent publishers to agree.
- PR #195 adds reusable evidence primitives and a service-role-only PFIE foundation. Evidence quotes must be matched against captured source-page text. Publisher independence must use a curated source-ID-to-publisher-domain mapping; untrusted page hostnames and subdomains must not create extra votes. South African bookmaker records require jurisdiction ZA, nonblank licence evidence, a licence-check timestamp and recorded terms review. Roster membership references a canonical PFIE team ID.
- The PR #195 migration is not applied to production. Production migration history remains subject to the documented full baseline mapping and backup/rollback gate; merging SQL into the repository is not approval to run it.
- PR #196 is deferred until after MVP launch. Its match-intelligence workers, automated odds and exclusions-page scope are not launch dependencies. No automated bookmaker prices may be collected or displayed without written rights for the intended use.


## PR hardening status — 22 November 2026

- **#185 La Liga source coverage (pre-launch):** use five independent page candidates only — LaLiga, TACTIX, Football Edge Lab, Flashscore and The Analyst (Opta). Keep the configured page and query lists at five. Existing full-team, row-quote, arithmetic, date/freshness, regression and two-independent-publisher consensus rules remain mandatory. Configured sources are candidates, not proof of successful extraction.
- **#195 verified data products foundation (pre-launch):** shared deterministic evidence validation, curated publisher identity, South African bookmaker licence/terms gate and canonical team/roster identity are the scope. Require captured page text for quotes and service-role-only RLS/grants. Review and test the migration in a disposable environment. Do not apply it to production until the migration baseline is reconciled and backup/PITR/rollback approval is recorded.
- **#196 match intelligence / odds / exclusions (post-launch):** deferred. No automated bookmaker odds or match-intelligence feature from this PR is to be enabled for the 1 December MVP. Revisit data rights, legal, security, quota, migration and end-to-end requirements after launch.


## 22 Nov 2026 — implementation verification snapshot

- PR #185's five-source La Liga cap regression, typecheck and Vercel production build passed. The full PFIE standings test file now passes (47/47). The Analyst/Opta is in the trusted-publisher registry; live extraction and two-publisher consensus are not yet certified.
- PR #195's targeted ESLint, typecheck, 15 evidence tests and Vercel production build passed. Review threads are resolved. The migration is source-control only until the production migration baseline and backup/rollback plan are reconciled.
- PR #196 is explicitly post-launch and is not an MVP dependency.


PR #195 also requires distinct source IDs and publisher domains for any future reference-price row. The bookmaker count must match both arrays, and a database trigger verifies the IDs resolve to enabled, licensed ZA bookmaker sources with recorded licence/terms evidence. A single bookmaker cannot satisfy the multi-source reference-price gate.
