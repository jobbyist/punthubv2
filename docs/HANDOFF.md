# Handoff: Puntr MVP

As of the evening of Thu 29 Oct 2026. Written so a new Claude account can carry on without the old conversation.
Blueprint (prompts P0 to P18, status, schedule, decisions): https://claude.ai/artifact/LKwEaVceitXRL6CgF8iBQ2 (version 1.2, updated 29 Oct 2026)
MVP readiness score: **78/100** (44 this morning, 13 before that), using the blueprint's weights. It counts what is built and tested; nothing has been verified end to end on the live site, so treat it as an upper bound until the P14 smoke test passes. P12, P13, P14 and PuntPoints (P19) are not started.
Repo `jobbyist/punthubv2` (site puntr.co.za). Soft launch Sun 1 Nov, production Mon 2 Nov 2026, goal 100 Founding Members in 30 days.

## Start here

1. Read `CLAUDE.md` (rules that override everything), then `docs/legal-alignment.md`, then this file.
2. Connect: GitHub (repo `jobbyist/punthubv2`), Supabase (project `hucjuekhitjuygcoomhw`), Vercel (project `punthubv2`, id `prj_ibZDxUlStsrePpHUwpOBxhvUE14l`, team `team_SsKFiB8H2aVoVKQAchiFleRR`), Resend if you need it.
3. `bun install`, then `bun run lint && bun run test && bun run build` (all pass on `main`). `bun run dev -- --host 127.0.0.1` runs the app.
4. The owner is the only decision-maker for legal, payments, providers and anything customer-facing. Ask when in doubt.

Working rules the owner set: a branch per task, a PR, push after each task, never force-push, rebase, amend or squash pushed commits, run lint and build before every commit, migrations as new files in `supabase/migrations` then update `src/integrations/supabase/types.ts`, run SQL tests in `supabase/tests/` on the live project (they roll back) and confirm tables are still clean, follow the copy rules in `CLAUDE.md` (never imply profit, SA English, 18+ and 0800 006 008 on every page).

## Standing rule: legal alignment

Every PR that changes what Puntr collects, stores, shows, sends or promises updates `/terms`, `/privacy`, `/cookies`, `/affiliate-disclosure` and `/refunds` in the same PR, bumps `notice_versions` with a new migration, and adds an entry to `docs/legal-changelog.md`. The attorney approves afterwards, so mark doubts `[attorney review]`. Never claim something the product does not do. Do not enable a new sign-in provider, tracker, processor or paid product without telling the owner. X/Twitter sign-in was built and deliberately not enabled (PR #28 closed, branch `mvp/x-signin`).

## What is built (all merged to `main`)

| PR | Content |
|---|---|
| #15 | P0 to P4: guardrails and flags, trust and claims sweep, free-launch pricing, core schema (append-only predictions with a SHA-256 hash chain, `create_prediction`), POPIA layer |
| #16, #17 | This handoff doc (first version); homepage match card and partner strip restored |
| #18 | P5 localisation: i18next, SA English, `money()`/`odds()` formatters, `<RgNotice />`, pseudo-locale, only en-ZA enabled |
| #19 | P6 accounts: `/join`, onboarding, `complete_signup`, consent records, `/account`, `/account/privacy` (export, marketing, delete) |
| #20 | P7 fixtures: API-Sports provider, sync and results crons, CSV fallback, real fixtures on the site |
| #21 | Copy polish across the site; Pricing now shows Pay-As-You-Go and Puntr Pro (R99/month, "Coming soon") |
| #22 | P8 post a pick: `/match/$fixtureId`, pick form, community feed, report button |
| #23 | P9 settlement: `grade()`, settle cron, leaderboard, `/results`, profile records |
| #24 | P10 growth: Founding counter, referrals, waitlist invite script, `/unsubscribe` |
| #25 | P11 admin and `/verify`: `/admin` tabs, admin corrections as new entries, daily chain heads, in-browser hash check |
| #26 | Launch notifications: five early-access people reserved, three-wave launch emails, WhatsApp/SMS draft pushed to `/admin` with Supabase Realtime |
| #27 | Sign-in: email + password (no confirmation step), email code or link, username + password, Google; `/account/security` (confirm email, authenticator-app two-factor, password); two-factor enforced in the database |
| #29 | Legal pages rewritten to match the product; notice version `2026-10-29-r2` |
| next | Posting needs a confirmed email (`can_post`), Terms `r3`, `CLAUDE.md` payments note, this handoff |

PR #28 (X sign-in) is closed unmerged on purpose. PR #14 (old footer text, side branch) is stale.

## Where things live

- Routes `src/routes`, generated `src/routeTree.gen.ts` (never edit). Server logic: `createServerFn` with `requireSupabaseAuth`; service-role work in `*.server.ts` using `src/integrations/supabase/client.server.ts`. Do not edit generated files in `src/integrations/supabase` except `types.ts`.
- Strings: `src/locales/en-ZA/*.json` (namespaces in `src/locales/config.ts`). Formatters: `src/lib/format.ts`.
- Docs: `docs/admin.md`, `auth-email.md` (all sign-in methods, Supabase and Google setup), `growth.md`, `i18n.md`, `launch-notify.md`, `sports.md`, `privacy/README.md`, `legal-alignment.md`, `legal-changelog.md`.

## Database (Supabase `hucjuekhitjuygcoomhw`, eu-west-1, free plan, no branching)

Migrations in `supabase/migrations`, all applied: `mvp_core`, `mvp_core_hardening`, `privacy`, `profiles_language`, `accounts`, `cron_schedule`, `settlement`, `growth`, `admin_chain`, `chain_head_fix`, `launch_notify`, `launch_notify_cron`, `auth_passwords_mfa`, `notice_versions_r2`, `confirmed_email_to_post` (Supabase records its own timestamps, which differ from the filenames).

SQL tests in `supabase/tests` (BEGIN to ROLLBACK, run with the Supabase connector or the SQL editor; any `ASSERT FAILED` is a failure): `mvp_core`, `privacy`, `profiles_language`, `accounts`, `settlement`, `growth`, `admin_chain`, `launch_notify`, `auth_passwords_mfa`, `confirmed_email_to_post`. All pass on the live project except `auth_passwords_mfa`, which was merged but has not been run live yet.

Live data right now: five early-access rows (reserved Founding spots, details loaded directly and not in the repo); everything else is empty. Cron jobs (pg_cron, via `invoke_cron` and Vault secrets `cron_base_url`, `cron_secret`): `sync-fixtures`, `sync-results`, `settle`, `chain-head`, `launch-notify`.

Key rules enforced in the database: predictions, settlement events and consent records are append-only for every role; posting needs a confirmed email (`can_post`) and, once two-factor is on, an aal2 session (`mfa_ok`); Founding numbers 1 to 100 are assigned in order and held for reserved early-access emails that are confirmed.

Tool quirk: the Supabase connector asks the owner to confirm statements containing `delete` or `drop` and times out after 60 seconds if unanswered. Give the owner the SQL to run in the SQL editor instead.

## Environment (names only; never paste values into chat or the repo)

Vercel Production has the Supabase variables, `LAUNCH_EMAILS_ENABLED=true`, `CRON_SECRET`, `WAITLIST_LINK_SECRET`, `SPORTS_API_KEY`, `SPORTS_LEAGUE_IDS` (chosen from `bun run sports:ids`: PSL 288, EPL 39, UCL 2, URC 76, Springbok tests 84). Vault has `cron_secret` and `cron_base_url`.

Still missing: `RESEND_API_KEY` and `LOVABLE_API_KEY` (email gateway), Preview copies of the Supabase variables, and the PayFast variables below. Optional: `LAUNCH_DATE` (default 2026-11-02), `ADMIN_NOTIFY_EMAIL`, `RESEND_FROM`.

## Owner actions still open

1. Set `RESEND_API_KEY` and `LOVABLE_API_KEY`, then redeploy. No email goes out before they exist.
2. Supabase Auth: switch "Confirm email" OFF, enable TOTP, set the Confirm signup and Magic Link templates to the code-and-link text in `docs/auth-email.md`, set Site URL `https://puntr.co.za`, redirect `https://puntr.co.za/**`. Set up the Google provider (steps in the same doc).
3. Create the owner's profile at puntr.co.za/join (the owner is using `support@puntr.co.za`), then run the one-line admin SQL (`docs/admin.md`) with `returning`.
4. Run `supabase/tests/auth_passwords_mfa.sql` in the SQL editor.
5. First live check in `/admin`: Fixtures, "Re-sync now" (proves the sports key and league IDs).
6. Information Officer registration and `privacy@puntr.co.za`; attorney review (see `docs/legal-changelog.md`); the owner approves legal copy retroactively.
7. Brand and affiliate: partner licence checks and tracking links for Supabets, Playbet and Mr Price Sport (P12 inputs).
8. Translators for Afrikaans, isiZulu, isiXhosa (P13).

## Next work

**PuntPoints must be configured before the Mon 2 Nov 2026 launch (owner requirement, 29 Oct). Blueprint prompt P19.** Today nothing awards PuntPoints: the About, Support and nav copy mention them, and Terms section 6 says they are "not awarded yet". Do not build before the owner confirms the earning rules (decision D18); propose the defaults below and ask. Suggested slot: Sat 31 Oct, after PayFast.

- Proposed rules (owner decides): points reward activity, never results. Confirm email +10 once; first pick +20; each locked pick +2 (max 10 a day); each settled pick +3 (a void earns 0); a referred friend who joins and posts a first pick +25 each side. No points for winning, units, payments or affiliate clicks, so they cannot encourage risk-taking or spending.
- Hard rules already promised in the copy and Terms: no cash value, not exchangeable for cash, not transferable, never purchasable, paying never earns points, no effect on ranking, the leaderboard or prize eligibility. No points for unconfirmed emails, banned accounts or accounts on a break.
- Build: append-only `puntpoints_ledger` (RLS: members read their own rows; awards only through a security-definer function or the service role; idempotent on user, rule code and reference id) and a `point_rules` table; balance on the profile, account page history and a header chip; a `points()` formatter in `src/lib/format.ts`; admin adjustment with a required reason (written as a new row); strings through i18n keys.
- Redemption: none at launch unless the owner decides points convert to PayFast credits (rate and cap are then a legal decision as well).
- Legal in the same PR (standing rule): Terms section 6 (rules, no cash value, revocation for fraud, 30 days' notice before changing or ending), Privacy data table (the ledger), About and Support copy, notice version bump, `docs/legal-changelog.md` entry marked `[attorney review]`.
- Tests: awards are idempotent and capped; unconfirmed emails earn nothing; points never change leaderboard ranking; a SQL test in `supabase/tests`.


**PayFast credits and recurring billing, planned Fri 30 Oct 2026 at 12:00 SAST.** The owner decided to add Pay-As-You-Go credits and recurring billing (Puntr Pro, indicatively R99/month) with their PayFast merchant account before launch. A scheduled message was set in the previous account's session; in a new account start it by hand with this brief:

- Env vars (owner sets them in Vercel; never ask for credentials in chat): `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, a sandbox flag. Sandbox first; the owner approves live mode.
- Append-only credits ledger with RLS; packs from `/pricing`; a checkout server function that builds a signed PayFast form with no personal data beyond what PayFast needs; an ITN route that verifies signature, source IP range, amount and PayFast's server-side validation before granting credits, idempotent on `pf_payment_id`; PayFast subscriptions for Puntr Pro with cancel and pause; account pages for balance, history and cancellation; refund and cancellation terms.
- Paying must never affect ranking, points or prize eligibility.
- Legal in the same PR: `/terms` (payments and a subscription clause marked `[attorney review]`), `/privacy` (PayFast as a processor), `/refunds`, `/pricing`, notice version bump, `docs/legal-changelog.md`, and the Launch scope line in `CLAUDE.md`.

**Then** P12 affiliate and content engine (approved partners, `/go` click tracking, Firecrawl + Gemini drafts the owner approves; no personal data to AI services), P13 Afrikaans, isiZulu, isiXhosa (switch on only after a native-speaker review), P14 hardening and the launch PR. Post-launch: AI previews (P16), seed round pages (P17, P18), prizes only after legal sign-off.

## Decisions the owner has made

- PuntPoints must be configured before launch. The earning rules are still to be decided (D18).

- Sign-in: email + password without a confirmation step, with email confirmation and two-factor encouraged afterwards; code or link, username + password and Google also offered; X/Twitter not enabled.
- Posting a pick (which puts it on the feed and the leaderboard) needs a confirmed email. Identity verification (KYC) is not built and not decided: the privacy notice says no ID document, selfie or biometrics are collected, so KYC needs a provider, a privacy-notice change and attorney review first.
- Launch emails: one on launch day and two reminders (reminders only for people who ticked marketing); WhatsApp and SMS are sent by a person from `/admin`, only to opted-in people.

## Known risks and gaps

- Nothing has run against live API-Sports, live Resend, real Google sign-in or the real crons yet; UI was verified against mock servers.
- Unconfirmed email sign-up allows pre-registration of someone else's address (mitigations in `docs/auth-email.md`).
- Referral farming (many accounts) is not prevented. Age check is by birth year plus attestation.
- `/support` contact form only shows a toast. PuntPoints are mentioned in the About, Support and nav copy but nothing awards them yet; they must be configured before launch (P19, decision D18).
- Username sign-in attempts share the server's IP for Supabase's rate limits.
- Legal pages are drafts until counsel approves.
