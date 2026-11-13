# Puntr master brief: repository audit and implementation plan

Written 13 November 2026 against `main` at `433630e` and the live Supabase project `hucjuekhitjuygcoomhw`.
Status words used in every Puntr document: **Completed**, **In progress**, **Blocked**, **Pending credentials**,
**Pending administrator approval**. Nothing is called completed unless it is implemented and tested.

## 1. Current architecture

- TanStack Start + Vite, React 19, Tailwind v4, shadcn/ui, i18n (en-ZA). File routes in `src/routes`; server work
  through `createServerFn` and server routes. Built in Lovable, deployed to Vercel (free plan), domain puntr.co.za.
- Supabase: Postgres with RLS on every public table, Auth (email confirmation, passwords, MFA), Vault, pg_cron and
  pg_net. 50 migrations (before this PR) in `supabase/migrations`, SQL tests in `supabase/tests`.
- Scheduling: **pg_cron + pg_net calling `/api/cron/*` with a bearer secret**, not `vercel.json`. Vercel's free plan
  only runs a cron once a day, at some point inside the scheduled hour. There is no `vercel.json` in the repository.
- Email: Resend (free plan, 100 a day; the app caps itself at 90).
- CI gate: `bun run lint && bun run typecheck && bun run build`; 34 test files, 266 tests.

## 2. What exists (inventory against the brief)

| Brief area | State on 13 Nov |
|---|---|
| Auth, onboarding, username, avatar, profile (4.2) | **Completed** before this brief: `/join`, `/account`, `/u/$username`, MFA, account deletion. |
| Pick submission, lock at kick-off, server-side checks (4.4) | **Completed**, never used in production: `picks.ts`, `predictions` table with a hash chain, `/verify`. Markets 1X2, DC, OU25, BTTS, HCP. |
| Settlement (4.5) | **Completed**: `settlement.ts` `grade()`, `settle.server.ts`, append-only `settlement_events`, admin corrections with a reason. |
| Points (4.5) | Exists as **PuntPoints** (`puntpoints_ledger`, 7 `point_rules`, all inactive). This is a loyalty ledger, not the brief's 3/2/2 competition scoring. See decision D2. |
| Leaderboards (4.6), history (4.7) | `/leaderboards`, `/results`, profile history exist. Weekly, monthly and per-competition boards and the brief's tie-break order are **not built**. |
| Fixtures and results (4.1) | API-Sports adapter, sync crons, CSV import: built. **Live `fixtures` table has 0 rows**: the free API-Sports plan does not serve the current season. |
| PFIE (4.1) | **Blueprint only** (`docs/pfie`). No `pfie` schema, no code. |
| Puntr Markets (4.8) | `IntelPanel` placeholders only, by owner decision ("nothing here invents a number"). |
| Practice Mode (5) | Thin slice **live since 11 Nov**: 9 `practice_*` tables, simulator with fictional teams, `/practice`, demo rewards, R500 draw. No analytics dashboard, coaching feedback or new survey. |
| Survey (5.5) | `/feedback` with `survey_responses` (1 response). Short form, no conditional questions. |
| Newsroom (3) | `newsroom_articles`, `/newsroom`, `/newsroom/$slug`, scheduled publishing, one in-app notification per article. 3 articles, written by hand. **No generator, no admin editor.** |
| Admin (9) | `/admin` tabs: fixtures, settlement, reports, users, waitlist, rewards, launch, identity checks, campaigns, affiliates, draw. One role (`admin`). No audit log table for admin actions beyond settlement and affiliates. |
| Security (8) | RLS everywhere; cron auth with constant-time compare. Open advisor warnings: mutable `search_path` on two trigger functions, `pg_net` in `public`, leaked-password protection off, many SECURITY DEFINER functions callable by `anon`. |

## 3. Gaps, in priority order

1. Content engine: everything (this PR starts it).
2. Verified fixtures and results for the current season: the single biggest launch risk. Nothing player-facing works
   without it.
3. Competition scoring ledger, weekly/monthly/competition leaderboards, own-position row, history filters.
4. Practice Mode 2.0: analytics, deterministic coaching feedback, new survey, admin feedback analytics.
5. Admin: newsroom desk, system health, API usage, audit log, second permission tier.

## 4. Decisions made (ordinary engineering decisions, documented as the brief asks)

- **Schedule with pg_cron at 04:00 UTC, not Vercel Cron.** Same mechanism as every other job; fires on the minute.
  Vercel's free plan would publish any time between 06:00 and 06:59 SAST.
- **Extend `newsroom_articles` instead of creating `content_articles`.** The public pages, sitemap, notifications and
  scheduled publishing already read it. `content_categories` is the existing category check plus `sports`.
- **Branch `mvp/content-engine`, one PR.** Pushes are batched because every push spends one of the 100 daily Vercel
  deployments.
- **The engine ships switched off, and automatic publishing is a second switch.** Until both are on, every generated
  article waits in the review queue. This matches brief step 3 and the 9 Nov note "draft-only generator".
- **Football only in sports articles** until another sport is switched on (`CLAUDE.md`, launch scope).

## 5. Decisions the owner must make (work continues around them)

- **D1 (decided 13 Nov: Parallel is paid from the owner's $50 balance; Firecrawl free, Parallel as fallback).** Research providers and "free only". Parallel Search publishes a per-request price (about $5 per 1,000
  requests) and I found no standing free tier; Firecrawl's free allowance is reported as 500 one-off credits by some
  sources and 1,000 a month by others. One article a day needs about 30 searches and 120 page reads a month. Please
  check both dashboards. If Parallel is paid, options are: accept the small cost, or use Firecrawl's search endpoint
  for discovery (adapter swap, no pipeline change).
- **D2 (decided 13 Nov: engineering judgement; separate competition score ledger).** Scoring. The brief's 3/2/2 competition points and the existing PuntPoints loyalty rules are different
  things. Proposed: keep PuntPoints as the loyalty currency and add a separate, deterministic competition score
  ledger that drives leaderboards. Needs a yes before phase two.
- **D3 (decided 13 Nov: keep fictional teams, add badges).** Practice Mode data. On 11 Nov you chose fictional teams. The brief asks for real historical fixtures with
  hindsight protection. That reverses a recorded decision and needs real results data (see D4).
- **D4 (decided 13 Nov: Parallel Search + Gemini, see `docs/PFIE_INTEGRATION.md`).** Fixtures source. API-Football Pro (about $19 a month) is the only researched source with the current
  Betway Premiership season. The brief forbids paid APIs without approval, and PFIE's free-source route
  (OpenFootball, football-data.org, extraction) does not cover the PSL reliably. This needs a decision by about
  18 Nov to leave time to test settlement before 1 Dec.
- **D5. Affiliates and paid plans.** The brief says no bookmaker referral functionality; the product already has an
  affiliate registry (none live), PAYG and Pro plans decided on 6 Nov. I have treated the brief as "add nothing new
  here" and removed nothing.
- **D6. AI label.** Proposed: every AI-written article shows "Written with AI assistance, checked against the sources
  listed" and its sources. Wording is `[attorney review]`.

## 6. Database changes

- This PR: `20261113120000_content_engine.sql` (additive; see `docs/CONTENT_ENGINE.md`). **Not applied to production
  yet**: pending administrator approval.
- Phase two (proposed, not written): `competition_score_ledger`, `leaderboard_snapshots`, `prediction_markets`
  configuration, PFIE schema per the blueprint.
- Phase three (proposed): `practice_sessions`, `practice_feedback` (separate from auth data), analytics views.

## 7. Credentials

| Variable | Needed for | When |
|---|---|---|
| `GEMINI_API_KEY` (AI Studio project with no billing account) | writing and review | first live test run |
| `PARALLEL_API_KEY` | sports research | first live sports run (see D1) |
| `FIRECRAWL_API_KEY` | full-page reading (optional) | first live sports run |
| `CONTENT_GEMINI_RPD` | the engine's own daily ceiling | after reading the limits in AI Studio |
| `SPORTS_API_KEY` on a current-season plan, or PFIE sources | fixtures | phase two (D4) |

All go into Vercel (Production; Preview has no Supabase variables today). None is committed; `.env.example` holds
placeholders only.

## 8. Risks

- **Calendar.** 18 days to launch. Phases two and three as written are larger than the remaining time; the plan
  below cuts to what the Definition of Done needs and names what moves after launch.
- **Fixtures data** (D4) blocks picks, scoring, leaderboards and realistic practice.
- **Free-tier limits.** Reported free limits for `gemini-3.8-flash` range from 20 to 1,500 requests a day depending
  on the source; a run uses 2 to 4. Free-tier prompts may be used by Google to improve its products, so nothing
  personal or confidential may go into a prompt (already a `CLAUDE.md` rule).
- **Function time limit.** A run needs up to about 50 seconds. If the Vercel function limit on this project is
  lower, the review pass is skipped and the article waits for a human instead of publishing.
- **Daily notification.** Each published article creates one in-app notification for every member. Daily sports
  articles may be too many; a per-category notification rule is proposed for the admin desk.
- **Vercel deployment limit** (100 a day) and **Resend limit** (100 a day) stay as they are.

## 9. Execution plan

| Step | Scope | Target | Status |
|---|---|---|---|
| 1 | Repository audit (this document) | 13 Nov | **Completed** |
| 2a | Content engine foundation: adapters, model router, research, quality gate, pipeline, migration, cron route, tests | 13 Nov | **Completed** (code and tests; migration not applied) |
| 2b | Newsroom desk in `/admin`: queue, edit, reject, regenerate, publish, sources, job history, usage, status, settings, project-update feed; AI label and sources on the article page | 14 Nov | Not started |
| 3 | Live validation with real keys: dry runs, fallback, sources, cron; then switch on | 15 to 16 Nov | **Pending credentials** |
| 4 | Fixtures and results for PSL, EPL, UCL | 17 to 19 Nov | **Blocked** on D4 |
| 5 | Competition score ledger, leaderboards (global, competition, week, month, all time), own position, history filters, scoring rules page | 19 to 23 Nov | **Pending administrator approval** (D2) |
| 6 | Practice Mode 2.0: analytics, deterministic feedback, contextual and full survey, admin feedback analytics with CSV | 23 to 26 Nov | Scope depends on D3 |
| 7 | Admin: audit log, system health, second permission tier | 26 to 27 Nov | Not started |
| 8 | QA, security tests, advisor warnings, launch-day copy, production checks | 27 to 30 Nov | Not started |

After launch if time runs out: historical-fixture practice challenges, Puntr Markets statistics beyond form and
results, featured images for articles.

Documents still to be written as their phase starts: `PUNTR_ARCHITECTURE.md`, `PFIE_INTEGRATION.md`,
`PLAYER_DASHBOARD.md`, `PRACTICE_MODE.md`, `DATABASE_CHANGES.md`, `API_INTEGRATIONS.md`, `DEPLOYMENT_GUIDE.md`.
