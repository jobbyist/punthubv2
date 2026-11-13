# Content engine

One article a day at 06:00 SAST, alternating between football intelligence and Puntr development news, researched
from the public web or from Puntr's own approved update feed, written by a free Gemini model, checked by code, and
either published or queued for a human.

Status on 13 November 2026: code and tests **completed**; migration **pending administrator approval**; live runs
**pending credentials**; admin desk not started. The engine ships switched off.

## Stages

| # | Stage | Where |
|---|---|---|
| 1 | Schedule | pg_cron `content-daily`, `0,20,40 4 * * *` UTC, calls `/api/cron/content-daily` |
| 2 | Topic | `schedule.ts` (sports or development), `research.ts` `sportsBrief` (rotating football beat) |
| 3 | Web research | `SearchProvider` (Parallel Search) |
| 4 | Extraction | `ExtractProvider` (Firecrawl, optional) |
| 5 | Consolidation | `rankHits`, `toSource`: duplicates, blocked sites and thin pages removed, official sources first |
| 6 | Writing | `prompt.ts` + `model-router.ts` |
| 7 | Fact validation | second model call that only checks (`reviewRequest`), then `validate.ts` |
| 8 | Quality gate | `validateDraft`: score and critical issues |
| 9 | Publishing | `store.server.ts` `saveArticle` into `newsroom_articles` as `PUBLISHED` or `REVIEW` |
| 10 | Audit | `content_generation_jobs`, `content_generation_logs`, `content_sources`, `content_api_usage` |

Providers sit behind three small interfaces in `types.ts`. Replacing one is a new adapter in
`providers.server.ts`; the pipeline does not change.

## Rules the code enforces

- **Free models only.** `FREE_MODEL_ALLOWLIST` in `config.ts`. A model outside it is never called, even if an
  environment variable names it. Primary `gemini-3.8-flash`, fallback `gemini-3.1-flash-lite` (both on Google's model
  list and marked free of charge when checked on 13 Nov 2026).
- **Fallback.** Quota or auth error: next model. Timeout or 5xx: one retry, then next model. Own daily ceiling
  reached (`CONTENT_GEMINI_RPD`): skipped without a call. Both fail: the job is recorded as failed and nothing is
  saved.
- **No invented facts.** Every claim carries a quote that must appear word for word in its source. Every number of
  two or more characters and every quotation in the article must appear in the research. Sports articles need
  verified claims from at least two different sites. Any miss is critical.
- **Development news comes only from `content_project_updates` rows marked approved.** With none waiting, the day
  becomes a sports day. The web is never searched for Puntr news.
- **House copy rules** (`CLAUDE.md`): banned phrases are critical; a prediction stated as fact costs 15 points.
- **Publishing needs all of (for scheduled and manual runs alike):** engine on, automatic publishing on, independent review ran, no critical issue, score
  at or above `min_quality` (default 85). Anything else goes to the review queue.
- **Once a day, once only.** The job key is the South African date. A succeeded job is never rerun; a failed one is
  retried at 04:20 and 04:40 UTC, three attempts at most; an administrator can force a rerun.
- **Never sources:** bookmakers, tips and odds sites, social networks, Wikipedia.
- **No personal data** goes to any provider. Prompts contain public pages and approved update text only.

## Database (migration `20261113120000_content_engine.sql`)

`newsroom_articles` gains `sports` as a category and `tags`, `reading_minutes`, `origin`, `ai_model`,
`quality_score`, `quality_issues`, `image_attribution`, `generation_job_id` (unique). New tables:
`content_settings` (one row), `content_generation_jobs`, `content_generation_logs`, `content_sources`,
`content_project_updates`, `content_api_usage`. RLS on all; administrators read, the pipeline writes as
`service_role`; `anon` has nothing. `content_article_sources(slug)` returns the cited sources of a published
article for the public page.

Tested on a local Postgres 16 with stand-ins for the Supabase pieces: applies twice without error; job lock,
three-attempt limit, forced rerun, usage counter, notification category, admin-only access and the public sources
function behave as described. Not yet applied to production.

## Environment

See `.env.example`. `GEMINI_API_KEY` and `PARALLEL_API_KEY` are required for sports articles; `FIRECRAWL_API_KEY`
is optional (without it the engine works from search excerpts). The Gemini key must come from an AI Studio project
with no billing account, so a paid call is impossible.

## Running it by hand

```
curl -H "Authorization: Bearer $CRON_SECRET" "https://puntr.co.za/api/cron/content-daily?dry=1"
curl -H "Authorization: Bearer $CRON_SECRET" "https://puntr.co.za/api/cron/content-daily?kind=sports"
curl -H "Authorization: Bearer $CRON_SECRET" "https://puntr.co.za/api/cron/content-daily?force=1"
```

`dry=1` saves no article. A missing key returns `pending_credentials` and names the variable.

## Live checks still to do (step 3)

1. Confirm both model IDs answer on the supplied key and read the real limits in AI Studio into `CONTENT_GEMINI_RPD`.
2. Confirm the Parallel and Firecrawl request and response shapes against a real call (written from the public
   references, never called with a key).
3. Three dry runs on different beats; read every article against its sources by hand.
4. Force the primary model to fail and confirm the fallback writes.
5. Confirm the pg_cron call arrives at 04:00 UTC and a second call does nothing.
6. Measure run time against the Vercel function limit.

## Not built yet

Admin newsroom desk, AI label and source list on the article page, featured images (articles use the default share
image), email digest, per-category notification rule.
