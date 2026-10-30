# Puntr: rules for every task

Repo: jobbyist/punthubv2. TanStack Start + Vite (React 19, Tailwind v4, shadcn/ui), built in Lovable, deployed to Vercel (project "punthubv2", domain puntr.co.za). Backend: Supabase. Goal: ship the MVP to production on Monday 2 November 2026.

## Stack
- File routes live in `src/routes`. `src/routeTree.gen.ts` is generated: never edit it by hand.
- Server logic uses `createServerFn` or server routes. Authenticated server functions use the `requireSupabaseAuth` middleware in `src/integrations/supabase/auth-middleware.ts`.
- Admin and cron work uses `src/integrations/supabase/client.server.ts` (service role, server-only).
- Do not edit the auto-generated files in `src/integrations/supabase` except `types.ts` after a schema change.

## Lovable sync
- Never force-push, rebase, amend or squash pushed commits.
- All launch work happens on one branch, `mvp/launch`. Push after each task so Vercel builds a preview. `main` stays buildable.

## Database
- Every schema change is a new SQL file in `supabase/migrations` named `<UTC timestamp>_<slug>.sql`.
- RLS on every table. Regenerate `src/integrations/supabase/types.ts` after applying.

## Brand
- Montserrat (display, 700-800) + Inter (body). Ink #0D0D0D, primary green #16A34A (hover #1E9752), white background, square corners, 8px spacing grid.
- Use the existing tokens in `src/styles.css`. No new colours.

## Copy
- Never imply profit: no "earn more", "win money", "sure", "guaranteed", "value bet", "#1".
- Brand line: "Predict smarter. Prove it."
- Keep 18+ and the 0800 006 008 helpline on every page.

## Launch scope
- Football (soccer) only at launch: Betway Premiership/PSL, EPL, UCL and more leagues as their league IDs are set. Sports roadmap (owner decision, 30 Oct 2026; weeks count from launch week = week 1): basketball and rugby in week 2, horse racing in week 4, combat sports (boxing, MMA) in weeks 6 to 8, cricket in week 10, tennis in week 12. The single source is `src/lib/roadmap.ts`, shown at `/roadmap`. A sport is switched on with `SPORTS_ENABLED` (e.g. `soccer,rugby`) once its data provider and grading work; horse racing needs its own data model. `/roadmap` shows a sport as live only when it is switched on. Until then no page may claim coverage of it.
- No cash referrals, no cash prizes and no odds comparison at launch.
- Rewards: PuntPoints are a loyalty scheme redeemable only for vouchers, sponsored rewards and perks, never cash (owner decision, 29 Oct 2026). Betting vouchers are offered at launch: the owner switched `betting_vouchers_enabled` on in the live database on 29 Oct 2026 and is responsible for counsel's sign-off and a licensed partner's written agreement to fund them before any betting voucher is added to the catalogue (the switch alone lists nothing). They are a gambling promotion (labelled "Ad", 18+, "T&Cs apply", 0800 006 008, shown only to eligible members). Rewards are funded by sponsors, not by Puntr, unless the owner says otherwise.
- Payments: the owner decided on 29 Oct 2026 to add Pay-As-You-Go credits and recurring billing (Puntr Pro) through PayFast before launch. They are built in the PayFast task (30 Oct, 12:00 SAST) and stay off until that work, its legal copy and the owner's go-ahead are done. Until then: no payments or subscriptions.

## Affiliates
- Links and creatives only for partners in the `affiliate_partners` registry with status 'live' (approved: Supabets, Playbet, Mr Price Sport via Admarula).
- A bookmaker goes live only with a recorded provincial licence check.
- Every gambling creative is labelled "Ad" and carries 18+, "T&Cs apply" and 0800 006 008.
- No affiliate units for users who aren't 18+ attested or who are on a break.

## Privacy (POPIA)
- Collect the least. No tracker or non-essential cookie before consent.
- Never put personal information in a partner link.
- Never send personal data to Firecrawl, Gemini or any AI service.
- Record consent in `consent_records`.
- Never claim in the product or the policies something the product doesn't do.

## Language
- Every user-facing string goes through the i18n keys from P5. SA English spelling.
- Rand amounts through `money()` and odds through `odds()` from `src/lib/format.ts`.
- The responsible-gambling message only through `<RgNotice />`.

## Legal pages stay aligned
- With every PR that changes what the platform collects, stores, shows, sends or promises, update the legal copy in the same PR: `/terms`, `/privacy`, `/cookies` (Privacy choices), `/affiliate-disclosure` and `/refunds`, plus the Supabase `notice_versions` rows (new version, new migration) and "Last updated". The attorney approves retroactively, so the PR must make the change easy to review.
- Add an entry to `docs/legal-changelog.md` (what changed, which pages, what counsel should look at). Mark anything uncertain `[attorney review]`. Never state something the product doesn't do, and never leave a claim the product no longer matches.
- Use `docs/legal-alignment.md` to find which page covers which feature. Say in the PR description what legal copy changed, or that nothing needed to.
- Do not enable a new sign-in provider, tracker, processor or paid product without saying so in the PR; the owner decides under their compliance policy.

## Before every commit
`bun run lint && bun run build` must pass.
