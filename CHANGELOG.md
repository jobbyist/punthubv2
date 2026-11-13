# Changelog

Implementation log for the master brief (13 November 2026). Newest first. Earlier history is in the Git log and
`docs/HANDOFF.md`.

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
