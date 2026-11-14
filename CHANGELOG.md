# Changelog

Implementation log for the master brief (13 November 2026). Newest first. Earlier history is in the Git log and
`docs/HANDOFF.md`.

## 14 November 2026 (batch 1, PR B): /fixtures hub and wider coverage

Added
- `/fixtures` is a real page (it redirected to /predictions): search, date strip, region and competition filters
  (counts follow the other filters), group by day or competition, cards or compact list, analytics sheet on every
  match, coverage panel, SportsEvent JSON-LD, sitemap entry.
- PFIE coverage from 6 to 21 competitions: + Europa League, Conference League, Ligue 1, EFL Championship, FA Cup,
  EFL Cup, Eredivisie, Liga Portugal, Saudi Pro League, Nedbank Cup, Motsepe Foundation Championship, CAF Champions
  League, CAF Confederation Cup, AFCON (incl. qualifiers), Bafana Bafana friendlies.

Fixed
- European leagues published no fixtures because their pages print no time zone (see docs/PFIE_INTEGRATION.md):
  SAST queries plus zone-less confirmation (still two independent sites).
- Results checks back off instead of searching every 50 minutes for 36 hours when a result stays unconfirmed.
- Filter chip highlight hidden inside cards (stacking context).

## 14 November 2026 (batch 1, PR A): modern match cards

Added
- Match card v2 (`FixtureCard` + `LiveMatchCard`): competition monogram (original artwork, no league logos),
  kick-off pill ("Today 15:30 SAST", live countdown in the last 6 hours), crests with last-5 W/D/L form guides, a
  one-line goals-per-game read, and a "View Deep Analytics" sheet (bottom on phones, right on desktop) with form,
  goals per game, head to head, community split and the model placeholders, without leaving the list.
- Form, goals and head to head come only from final scores Puntr has stored (`src/lib/match/form.ts`). No xG or
  third-party stats; averages need 3 recorded results. Empty guides show until results are recorded.
- Animated filter chips (`FilterChips`, motion shared layout) on /predictions (All, Today, each competition) and
  the weekly leaderboard; cards animate in and out when filters change (reduced motion respected).
- Match page header: monogram, kick-off pill, form guides, insight line and the same analytics sheet.

Changed
- /predictions no longer shows the illustrative sample fixtures above the real feed (Task 1, /predictions part).
- Fixed the untranslated "side.liveNow" heading in the right rail.

## 14 November 2026 (later): Afrikaans, Admin > Translations, isiZulu coming soon

Added
- Afrikaans for every public section (`src/locales/af/`, 37 files) and the six legal pages
  (`src/content/legal/af/`), with an English-prevails notice. New `pages` namespace moves the hardcoded Tools,
  Bookmakers, Refer a friend, PuntPoints and Live scores pages (and the home proof demo and bookmaker notice) onto
  translation keys.
- Admin > Translations: side-by-side review, approve or suggest per string, approve a section, legal pages page by
  page, stale detection when either text changes, named sign-off. Migration `20261114050000_translation_reviews.sql`.
- Language selector (Radix): enabled languages, "In review" languages for admins (preview cookie), "Coming soon"
  badge for isiZulu. isiXhosa removed.
- `src/lib/translations.test.ts`: every English key must exist in Afrikaans with the same placeholders.

Fixed
- `/pricing` Annual Pass box described an old payment flow; now matches the reservation + PayFast link flow.

Known gap before Afrikaans goes public
- Weekday and month names in dates are English in every language (`src/lib/format.ts`); needs a locale-aware hook.

## 14 November 2026: QA audit, UI/UX polish, Gemini fallbacks

Fixed
- Signed-out visitors got "permission denied" on the community feed, weekly leaderboard, tipster stats, public
  profiles, team badges (so no fixtures showed) and quests. Cause: `public_profiles` and `visible_predictions` were
  switched back to caller's rights outside the repo, and two anon policies called `is_admin()`. Migration
  `20261114030000_qa_public_reads_gemini_fallbacks.sql` (apply with owner approval).
- `main`'s committed `.env` pointed at another Supabase project and `types.ts` was a one-table stub (Lovable commit
  7592ef4); restored.
- Header overflowed on phones (compact Founding counter ignored `hidden`); community feed showed "no picks yet" when
  loading failed; match page had two `h1`s and sport-blind badges; publish-on-schedule control looked active while
  auto-publish was off; `FundingRow` kept stale input after saving; Insights offered a non-existent beta group.

Added
- `PageArt`: ten original animated SVG scenes (CSS only, reduced-motion safe) on page banners, account screens and
  empty states. `FixtureCard`, `EmptyState`, `Podium`/`RankRow` shared components; shimmer skeletons.
- Results as cards (no sideways table), leaderboards as podium plus ranked rows with share bars, community threads
  with a vote rail and comment bubbles, consistent section spacing utilities.
- Gemini fallbacks: 3.6 Flash, 3.5 Flash, 3.5 Flash-Lite (plus 3.8 Flash and 3.1 Flash-Lite). The router moves on
  from a busy model and retries only the last one. Quota rows added in the migration.

## 13 November 2026 (evening): launch gate, admin portal, wallet, newsroom desk, API limits

Owner decisions (13 Nov, 16:12 and 16:51 SAST): all recommendations approved; wallet holds PuntPoints and
Pay-As-You-Go credits with transfers; demo wallet in Practice Mode with demo credits; first newsroom run of 2 to 3
articles with branded covers; schema, SEO and AI discoverability across the site; Users and Analytics tabs; strict
limits on every API; emails batched inside Resend's free quota; live MVP features only for admins until 1 December.

Added
- Migration `20261113170000_platform_controls_wallet.sql`: launch gate (`mvp_open`, picks refused before launch for
  non-admins), admin action log, account type, entitlements, suspensions, warnings, private notifications, API quota
  claims (fail closed), email outbox, PuntPoints transfers with limits, PAYG credit ledger and prices, Practice demo
  wallet, admin analytics, sports articles without notifications, deletion clean-up, notice versions r12.
- Admin tabs: System (status, API limits, launch and transfer settings, scoring), Users (account controls, messages,
  broadcast), Newsroom (queue, checks, edit, publish, reject, generate, sources, run log, engine settings, project
  updates), Analytics, Action log.
- `/wallet` (launch-gated), demo wallet and paid match insight in `/practice`, launch-gate component, points board
  gated until launch.
- Quota guard for Gemini (per model), Parallel search and extract, Firecrawl and Resend; email outbox cron.
- Generated branded article covers (`/api/newsroom-cover/<slug>`), AI label and source list on articles, absolute
  share images.
- `robots.txt` (AI crawlers allowed on public pages, private pages excluded), `llms.txt`, FAQ and breadcrumb data
  on `/founding`, sitemap additions.
- Privacy and Terms r12.

Fixed
- `robots.txt` described Puntr as "odds comparison", which the product does not offer at launch.
- Article share images were relative URLs, which social networks ignore.

## 13 November 2026: competition scoring, points leaderboards, practice club badges

Added
- Migration `20261113160000_competition_scoring.sql`: `scoring_rules` (1X2 3, BTTS 2, OU25 2, DC 1, HCP 2; admin
  editable, every change logged), append-only `competition_score_ledger` written by a trigger on each settlement
  event, `competition_leaderboard()` and `my_competition_rank()` (week, month, all time; all or one competition).
- `/leaderboards`: "Competition points" board with period and competition filters, the member's own row when it is
  outside the first page, and the scoring rules.
- `src/lib/scoreboard.ts` with the same rules in TypeScript, tested.
- Eight original badges for the invented Practice Mode clubs (`public/teams/practice`), shown on practice fixtures.

Tested
- Scoring migration on a local Postgres 16 with stand-ins: tie-break order, weekly and per-competition boards, a
  corrected result re-scoring a pick, void picks not counted, hidden picks and banned members left out, rule change
  applying only to later picks, ledger append-only, member cannot edit rules or read other members' ledger rows.

Not done
- Leaderboard snapshots, admin screen for scoring rules (the table is editable by admins in Supabase for now),
  history filters on the profile page.

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

## 13 Nov 2026 (evening): newsroom first-run fixes
- Generated articles could not be saved: `on conflict (generation_job_id)` needs a non-partial unique index (migration 20261113190000, applied).
- Gemini primary timeout 40 s to 30 s so the fallback has time; run budget 50 s to 120 s (a production run took 88 s without being stopped).
- One revision pass when the first draft fails a critical check.
