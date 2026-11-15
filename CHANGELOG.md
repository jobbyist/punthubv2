# Changelog

Implementation log for the master brief (13 November 2026). Newest first. Earlier history is in the Git log and
`docs/HANDOFF.md`.

## 15 Nov 2026 – Current-season tables: tolerant table reader + diagnostics
- The Wikipedia league-table reader now accepts `Team vte` headers and rows whose empty trailing cells were dropped, and the archive job records what it saw (and which club names failed to match) when it cannot read a table. No change to what is shown or collected; legal copy unchanged.
## 15 Nov 2026 – Bundesliga fixtures from a page that prints UTC
- Bundesliga fixtures now also read `products.bundesliga.com/fixtures`, an official page printing each kick-off in CET and UTC, so more matches carry a verified time zone. No legal copy change (same data, same sources).

## 15 November 2026 (morning): kick-off time zones

- About 95 fixtures a run were lost to "no kick-off time with a known time zone" (La Liga, Serie A, Eredivisie, UCL,
  Championship, Saudi). New rule (`src/lib/pfie/time.ts`, `corroborate.ts`): national outlets (.es, .it, .de, .fr,
  .nl, .pt, .sa, .co.uk and named sites such as marca.com) and the official site read in the league's home zone
  (`HOME_ZONES` in `provider.ts`) give an INFERRED instant. It never decides alone (not even for the official
  site): two different sites must infer the same instant, or a zone-less page must confirm it, or it confirms a time
  another site printed. Disagreeing inferred instants are a dispute and block the trusted single-outlet rule.
- Fixture searches add national-press and South African phrasings per league (same call, max 5 phrasings).
- Labels WET/WEST and KSA recognised. 8 new tests.
## 15 November 2026 (morning): season archive import

- New job `archive` (`src/lib/pfie/archive.ts`, `archive-run.ts`): whole seasons for PSL, EPL, La Liga, Serie A,
  Bundesliga, Ligue 1, Eredivisie, Liga Portugal, Championship and Saudi Pro League (2024/25, 2025/26, current) from
  FBref's schedule page and Wikipedia's results matrix, parsed in code (no model) and stored only when both agree.
  Current-season tables are replaced when the Wikipedia table matches the verified results exactly. Cron
  `sync-archive` 02:10-02:55 SAST (migration `20261115060000`). The search-based season backfill now skips these
  leagues. Manual run: `/api/cron/sync-tables?job=archive&max=3`.

## 15 November 2026 (night): dark-mode logo wall, staff admin, admin notch

- Bookmaker logos (`public/logos`) are transparent PNGs, trimmed to their artwork and capped at 720 px wide. The
  opaque white backgrounds turned into solid white blocks under the dark-mode invert filter. Interior whites are real
  cut-outs now, so marks stay legible as white silhouettes. `wsb.PNG` is now `wsb.png`. In dark mode the logos stay
  white and brighten on hover (several marks are near-black, so the colour reveal is light mode only).
- `@puntr.co.za` accounts are admins automatically (migration `20261115043000_staff_auto_admin`): only for a confirmed
  email, exact domain, applied at profile creation and when the email is confirmed or changed. Banned accounts and
  MFA rules still apply through `is_admin()`. No automatic demotion. Each grant logs `staff_auto_admin` in
  `admin_actions` (admin_id null).
- `AdminNotch`: slim dismissible tab on the middle right edge, admin-only, opens `/admin`, hidden inside the portal.
  Dismissal is remembered for 7 days in localStorage (UI preference only).
- Legal copy: nothing needed (no new data collected, no new processor, no new promise to members).

## 15 November 2026 (later): odds feed hardened after a live probe

Fixed (found by a live Parallel probe of this weekend's Premier League pages before the first scheduled run)
- Hollywoodbets shows "profit" odds (winnings per R1, without the stake: a 1.60 favourite appears as 0.6). Prices
  from `PROFIT_ODDS_DOMAINS` are copied as shown and converted (+1) after the quote check. Without this every
  Hollywoodbets price would have been rejected (safely) by the margin check.
- Search excerpts can be days old (a bookmaker excerpt showed "last updated" two days earlier). The odds feed now uses
  live page reads only: Firecrawl (always live, renders JavaScript) then Parallel Extract with
  `fetch_policy.max_age_seconds = 900` and no stale fallback.
- One malformed item in the model's answer no longer discards the whole answer.

## 15 November 2026 (later): pre-match reference odds and the member-odds check

Added
- `sync-odds` cron (07:00-07:50 and 14:00-14:50 SAST, two competitions a call): competitions with fixtures in the
  next 72 hours; Parallel Search (cached 6 h) for licensed SA bookmaker pages, Extract of the best two, Gemini copies
  prices with quotes, plain code keeps only complete markets with plausible margins whose prices appear on the page;
  median across bookmakers. `src/lib/odds/` with 14 tests.
- Migration `20261115030000_reference_odds.sql`: `market_odds`, `predictions.reference_odds` / `odds_unverified`
  set by a trigger at posting (more than 25% above the reference), `prediction_odds_overrides` and
  `admin_set_odds_check()`, `prediction_odds_state` (settle odds = lower price for unverified picks) used by
  settlement, admin settlement and the weekly leaderboard, `reference_odds()` for eligible members only.
- Pick form: "Market reference 2.10, as at 14:00" with "Use this price", and a warning when the typed odds would be
  marked unverified. Pick cards: "Odds unverified · ranked at 2.10".
- Terms r21 and Privacy r19 (English and Afrikaans); legal changelog entry with `[attorney review]` items.

## 15 November 2026 (later): Parallel data layer foundation

Added
- `docs/PARALLEL_ARCHITECTURE.md`: which Parallel API powers each feature, cache lifetimes, the pre-match and manual
  odds rules, the credit budget (about $0.20 a day after launch) and the one-off jobs to fund before the prepaid
  balance expires on 7 Dec.
- `src/lib/parallel/`: prices and provider keys, cache keys (SHA-256 of normalised requests), a read-through
  response cache (`cachedCall`, `withSearchCache`), Task API and Responses API clients. 12 tests.
- Migration `20261115010000_parallel_data_layer.sql` (APPLIED 15 Nov at the owner's approval): `parallel_cache`, `api_unit_prices`,
  `api_budgets` (Parallel $25 for November, $5 from 7 Dec), `api_budget_claim()`, `api_spend_status()`, call caps
  for Task, Chat and Monitor, daily cache purge. Tested first on production in a transaction that was rolled back.
- Migration `20261115020000_parallel_budget_dec.sql` (APPLIED): one-shot pg_cron job that sets the Parallel budget to
  US$5 at 00:05 SAST on 7 Dec 2026, then removes itself (owner decision, 15 Nov).
- `types.ts`: the three new tables and four functions added by hand (matching production).
- Admin > System shows spend against the monthly budget once the migration is applied.
- /dev checklist: nine new tasks from the owner's 15 Nov directions (pre-match reference odds and the member-odds check, team news, match
  stats, one-off research jobs, Parallel layer, Confidence Score, Punt AI chatbot, page motion, Afrikaans go-live).

Changed
- `createQuotaClaim()` now checks the USD budget first (`api_budget_claim`) and falls back to the call caps alone
  while the migration is not applied, so this code is safe to deploy before it.

## 15 November 2026: Marquee Matchup card (home)

Changed
- Home preview card (`src/components/match-preview.tsx`): the static Soweto Derby card is now a Marquee Matchup card
  with six rivalries (Soweto Derby, Boks vs All Blacks, El Clásico, Stormers vs Bulls, Celtics vs Lakers, Proteas vs
  Australia). Rivalry tabs, an 8-second auto-rotation with a progress bar (pauses on hover, focus, touch or the pause
  button; off with reduced motion; stops once a visitor picks), an animated confidence dial, floodlight backdrop,
  glowing VS badge, spring-animated community split bars and a "Punt AI pick" badge. SSR always renders the Soweto
  Derby, so hydration is unchanged.
- Guest picks open a Founding Member dialog naming the rivalry and team; the CTA carries the pick to `/founding` in
  router history state (no cookie or storage), where a confirmation line shows it.

Added
- `src/lib/marquee-matchups.ts` (sample data, roadmap tags from `SPORT_ROADMAP`) and tests; `home.matchups.*` and
  `founding.marqueePick*` strings in English and Afrikaans.

Not done, on purpose
- Odds comparison teaser: CLAUDE.md rules out odds comparison at launch.
- Form guide / head-to-head drawer: form comes only from recorded results, and these are illustrative matchups.
- Team-colour glows: CLAUDE.md allows no new colours, so the glow uses brand green.

## 14 November 2026 (later): betting slips

Added
- `/slips`: add a slip by typing, pasting or uploading a photo; review and edit every leg (Puntr fixture, market,
  selection, odds), bookmaker, stake and return; save as a draft or publish. Community and My slips feeds with
  results from settled picks. "Slips" in the side nav; sitemap.
- On-device OCR (self-hosted tesseract.js copied to `public/ocr` at build time), PII scrubber, deterministic parser
  with bookmaker-wording to market mapping, Gemini fallback on scrubbed text only (20 a day per member), fixture
  matching, bookmaker adapter registry for post-MVP share-link and API imports (`src/lib/slips/`).
- Database: `bet_slips`, `bet_slip_legs`, `slip_parses`, `publish_slip`, `slip_detail`, `slips_feed`, private `slips`
  bucket, `slip-images` daily job (03:25 SAST) removing photos after 30 days.
- Terms and Privacy r18 (English and Afrikaans); `docs/BETTING_SLIPS.md`.

## 14 November 2026 (later): league standings and form sync

Added
- `/standings` (12 leagues: PSL, EPL, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Liga Portugal, EFL
  Championship, Saudi Pro League, Motsepe Foundation Championship, UCL league phase) with last-five form from
  completed matches and a stale-data notice; "Tables" in the side nav; sitemap.
- Daily standings sync and one-time form history backfill (`/api/cron/sync-tables`, 04:10-05:50 SAST), matchday
  updates by trigger without API calls, `sync_status` monitoring (Admin > System > Data sync).
- Form everywhere (cards, analytics sheet, match page, tables) now reads `completed_matches` (fixtures + verified
  history), so guides are filled from launch.
- Migration `20261114140000_standings_form_sync.sql`.

## 14 November 2026 (batch 1, PR E): /tools copy and plan

Changed
- Betting Slip Converter card description (owner copy, English and Afrikaans): positioned as a bridge from bookmaker
  slips to trackable Puntr picks, AI match analysis and community sentiment. The card stays "Coming soon".

Added
- `docs/TOOLS_PLAN.md`: what "live" means for each tool, order, dependencies and the decisions needed before launch.

## 14 November 2026 (batch 1, PR C): member Matchday card and favourites

Added
- Account > Your favourites: sports (roadmap sports marked "soon"), up to 10 competitions and up to 10 teams (search
  over teams with upcoming fixtures). Private, RLS own-row only; deleted with the account.
- Signed-in home: the illustrative preview is replaced by "Your matchday" (favourite teams first, then favourite
  competitions, with reason tags), "View full intelligence" (filtered /fixtures when one competition is chosen),
  "Challenge a tipster", and the member's active duels. Guests keep the illustrative preview (also in server HTML).
- Migration `20261114090000_member_preferences.sql` (applied); Privacy r17 (English and Afrikaans).

## 14 November 2026 (batch 1, PR D): Community Head-to-Head Duels

Added
- `/duels` hub (how it works, open/live/settled/my duels, H2H Duel Leaderboard) and `/duels/$duelId` duel room
  (both members' calls side by side, hidden until kick-off, accept/decline/cancel, share, "Who called it better?"
  poll with an animated split bar).
- Challenge dialog (named opponent or open challenge, 2-3 calls from 1X2/BTTS/OU25, optional stake, message) on the
  hub and in every match room ("Duels on this match"); Duels in the side nav; Duel board on /leaderboards.
- Settlement in `/api/cron/settle` with the shared `grade()`; unaccepted challenges expire at kick-off.
- Migrations `20261114080000_h2h_duels.sql`, `20261114081000_duel_config.sql` (applied). Admin > System: duel
  switches and limits. Stakes default OFF pending counsel.
- Legal: Terms and Privacy r16 (English and Afrikaans).

Fixed
- Analytics sheet could show the previous match's community split (review finding on #113).
- Duplicate `uefa.com` in the PFIE trusted list (review finding on #114).

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
