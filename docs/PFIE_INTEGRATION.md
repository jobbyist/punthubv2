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
