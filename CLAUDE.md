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
- Soccer (Betway Premiership/PSL, EPL, UCL) and Rugby (URC, Springbok tests) only.
- No payments, subscriptions, cash referrals or odds comparison at launch.

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

## Before every commit
`bun run lint && bun run build` must pass.
