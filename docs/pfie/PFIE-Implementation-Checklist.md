# PFIE implementation checklist

Version 1.0 · 5 November 2026 · Companion to `PFIE-Product-Technical-Blueprint.md`. Technical completion: Monday 9 November 2026. Public launch: Tuesday 1 December 2026.

## Phase 0: Founding-member acquisition (before PFIE)
- [x] `/founding` landing page, sitewide Founding bar, home hero, header and footer copy (branch `mvp/launch`, PR #42)
- [x] Legal changelog entry for the copy change
- [ ] Owner: merge PR #42 and confirm `/founding` is live on puntr.co.za
- [ ] Owner: run migration `20261105200000_privacy_r4_launch_dates.sql` in Supabase
- [ ] Post the social assets and reel; share the campaign canvas for export
- [ ] Review Founding sign-up count every Monday until 100

## Phase 1: Foundation (Fri 6 Nov)
- [ ] Migration: schema `pfie`, all ten tables, RLS on, no `anon` or `authenticated` grants
- [ ] Seed `competitions` (51, status `planned`) and `data_sources`
- [ ] Quota ledger table and settings for each provider's allowance
- [ ] Regenerate `src/integrations/supabase/types.ts`
- [ ] Legal alignment check (`docs/legal-alignment.md`) and changelog entry if anything shown or stored changes

## Phase 2: Tier A and B sources (6 to 7 Nov)
- [ ] OpenFootball importer (England first; check each other country repository's coverage and freshness)
- [ ] football-data.org adapter (12 competitions, 10 calls a minute); written answer on commercial use requested
- [ ] `source_mappings` and alias seed for Priority 1 teams
- [ ] Admin queue for unresolved names

## Phase 3: Extraction (7 to 8 Nov)
- [ ] Record terms and robots checks in `data_sources` for each source before enabling it
- [ ] Firecrawl fetcher (markdown only), content-hash cache
- [ ] Gemini extractor: JSON schema, evidence quotes, temperature 0, model name in configuration
- [ ] Read the real Gemini free-tier limits from Google AI Studio and put them in configuration
- [ ] Validator: schema, evidence match, football rules, status transitions
- [ ] Tests: hallucinated fixture rejected, injected page text ignored, duplicate ingestion is a no-op

## Phase 4: Corroboration and publishing (8 Nov)
- [ ] Observation store and corroborator (`verified`, `single_source`, `disputed`)
- [ ] Confidence formula from section 7.2, with unit tests
- [ ] Publisher into `pfie.fixtures` and `pfie.results`; append-only change log
- [ ] Projection into `public.fixtures` (`provider = 'pfie'`); settlement tests still pass
- [ ] Grading only on `verified` results

## Phase 5: Feeds and integration (8 to 9 Nov)
- [ ] CSV and JSON export routes
- [ ] "Last verified" shown beside fixtures in the app (through i18n keys)
- [ ] Planner: tiered schedule, quota modes (Normal, Conserve, Critical, Exhausted)
- [ ] pg_cron jobs through `public.invoke_cron` (not Vercel Cron)
- [ ] Nightly backup job and a tested restore

## Phase 6: QA and deploy (Mon 9 Nov)
- [ ] Compare Priority 1 fixtures with official sources by hand
- [ ] Drill: quota exhausted, source down, Gemini returns bad JSON, conflicting kick-offs
- [ ] Deploy and watch the first scheduled runs
- [ ] `bun run lint && bun run build` pass; PR description says what legal copy changed

## Phase 7: Coverage and monitoring (10 to 30 Nov)
- [ ] Switch competitions to `active` one at a time, only after the source rule is met
- [ ] Review the admin queue daily
- [ ] Check quota ledger weekly; keep Firecrawl under 70% by 29 November
- [ ] Confirm no page claims live scores, odds or complete coverage

## Owner decisions
- [ ] D1 Vercel plan and commercial-use restriction
- [ ] D2 Parallel: use with a card that cannot be charged, or skip
- [ ] D3 Written commercial-use answers from Firecrawl and football-data.org
- [ ] D4 Pick-lock rules (blueprint 7.3)
- [ ] D5 Scope of 9 November
- [ ] D6 When to start API stage S1 (after launch, subject to counsel)
