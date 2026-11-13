# Changelog

Implementation log for the master brief (13 November 2026). Newest first. Earlier history is in the Git log and
`docs/HANDOFF.md`.

## 13 November 2026: PFIE fixtures provider, Parallel page-reader fallback, review fixes

Owner decisions (13 Nov, 14:28 SAST): fixtures come from Parallel Search + Gemini with no data subscription; Parallel
is also the fallback page reader when Firecrawl runs out; competition scoring is left to engineering judgement;
Practice Mode keeps fictional teams (badges to be added); migrations and merges may proceed without prior approval
in that session.

Added
- `src/lib/pfie/`: team-name matching, time-zone handling, extraction prompt and deterministic validation,
  corroboration, the `pfie` provider (implements the existing `SportsProvider`), audit store. 29 tests.
- `src/lib/sports/select.server.ts`: `SPORTS_PROVIDER=pfie` switches the three sync entry points to PFIE.
- Parallel Extract adapter and `createPageReader` (Firecrawl first, Parallel second), used by the content engine and
  PFIE.
- Migration `20261113150000_pfie_fixtures.sql` (`pfie_runs`, `pfie_observations`, 60-day purge).
- `docs/PFIE_INTEGRATION.md`.

Fixed (review of PR #82)
- A manual content run while the engine is off can no longer publish.
- A content job never re-saves its article.

Not tested
- No live call yet (keys pending). The official fixture page addresses for the Premier League and the Champions
  League are assumptions until the first live run.

## 13 November 2026: content engine foundation (branch `mvp/content-engine`)

Added
- `docs/PUNTR_IMPLEMENTATION_PLAN.md`: repository audit, gaps, decisions, risks and the execution plan.
- `src/lib/content/`: provider interfaces, Parallel Search, Firecrawl and Gemini adapters, free-only model router
  with fallback, research ranking, prompts, deterministic quality gate, the daily pipeline, the Supabase store.
- `/api/cron/content-daily` (cron secret required; `dry`, `kind`, `force`).
- Migration `20261113120000_content_engine.sql` (additive, not applied to production).
- Newsroom category "Sports Intelligence".
- `.env.example` with placeholders.
- 53 tests (266 in total).

Not done
- Admin newsroom desk, AI label and sources on article pages, live provider calls.

Pending
- Credentials: `GEMINI_API_KEY`, `PARALLEL_API_KEY`, `FIRECRAWL_API_KEY`.
- Administrator approval: applying the migration; decisions D1 to D6 in the implementation plan.
