# Handoff: Puntr MVP

As of the evening of Thu 29 Oct 2026. Written so a new Claude account can carry on without the old conversation.
Blueprint (prompts P0 to P18, status, schedule, decisions): https://claude.ai/artifact/LKwEaVceitXRL6CgF8iBQ2 (version 1.2, updated 29 Oct 2026)
MVP readiness score: **78/100** (44 this morning, 13 before that), using the blueprint's weights. It counts what is built and tested; nothing has been verified end to end on the live site, so treat it as an upper bound until the P14 smoke test passes. P12, P13 and P14 are not started. PuntPoints (P19) and the referral and rewards programme (P20) are built but switched off (see `docs/puntpoints.md`).
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

## Sports scope (owner decision, 29 Oct 2026)

Football only at launch. The owner is paying for the API-Sports **Football** plan only (the free plan serves only seasons 2022 to 2024, so every competition was refused on the first real re-sync). Rugby (URC, Springbok tests) and horse racing are added after launch in weeks 1 to 2: rugby by setting `SPORTS_ENABLED=soccer,rugby` once an API-Sports Rugby subscription exists; horse racing needs its own data model. More football leagues are defined in `src/lib/sports/competitions.ts` and need their real IDs in `SPORTS_LEAGUE_IDS` (see `docs/sports.md`). The API-Sports account answered "suspended" when I tried to look the IDs up on 29 Oct, so the owner must check the API-Sports dashboard (billing or verification) before the IDs can be fetched or the sync will work. No page may claim rugby or racing coverage until they are live.

## Next work

**PuntPoints (P19) and the referral and rewards programme (P20): BUILT, switched off, waiting for the owner's decisions (D18 to D22). Read `docs/puntpoints.md`.** The original brief follows for context; the build matches it, with every value editable in `/admin` → Rewards, and the live SQL test `supabase/tests/puntpoints_rewards.sql` still to be run in the SQL editor (the Supabase connector asks for approval on its `update` statements and times out). Turning it on needs: values decided, rewards added (and sponsor voucher codes uploaded), PuntPoints then Rewards switched on, legal pages approved. Betting vouchers have their own switch and stay off until counsel signs off and a licensed partner funds them. The original brief follows.

- Proposed rules (owner decides): points reward activity, never results. Confirm email +10 once; first pick +20; each locked pick +2 (max 10 a day); each settled pick +3 (a void earns 0); a referred friend who joins and posts a first pick +25 each side. No points for winning, units, payments or affiliate clicks, so they cannot encourage risk-taking or spending.
- Hard rules already promised in the copy and Terms: no cash value, not exchangeable for cash, not transferable, never purchasable, paying never earns points, no effect on ranking, the leaderboard or prize eligibility. No points for unconfirmed emails, banned accounts or accounts on a break.
- Build: append-only `puntpoints_ledger` (RLS: members read their own rows; awards only through a security-definer function or the service role; idempotent on user, rule code and reference id) and a `point_rules` table; balance on the profile, account page history and a header chip; a `points()` formatter in `src/lib/format.ts`; admin adjustment with a required reason (written as a new row); strings through i18n keys.
- Redemption: none at launch unless the owner decides points convert to PayFast credits (rate and cap are then a legal decision as well).
- Legal in the same PR (standing rule): Terms section 6 (rules, no cash value, revocation for fraud, 30 days' notice before changing or ending), Privacy data table (the ledger), About and Support copy, notice version bump, `docs/legal-changelog.md` entry marked `[attorney review]`.
- Tests: awards are idempotent and capped; unconfirmed emails earn nothing; points never change leaderboard ranking; a SQL test in `supabase/tests`.


**Referral programme and PuntPoints rewards (blueprint prompt P20), owner request 29 Oct. Built and switched off (see above).** A high-value referral incentive coupled with PuntPoints, which work like a loyalty scheme: points are redeemed for betting vouchers, sponsored rewards and other perks. **No cash prizes.** Decisions D19 to D22 in the blueprint (reward values, who funds them, what is live at launch, referral size) are the owner's to make; the values are editable in `/admin` after the fact.

- Qualifying referral (proposal): the invited person signs up through the link, is 18+ attested, confirms their email and posts a first pick (posting already needs a confirmed email). Rewards vest after 7 days and are clawed back if the account is banned or deleted within 30 days. Both sides earn points; the referrer also earns milestone rewards (for example 3, 10 and 25 qualified referrals: a Founding Ambassador badge, then a sponsor-funded perk, then a larger sponsor-funded voucher). The owner sets the numbers.
- Rewards catalogue and redemptions: `rewards` (kind `perk`, `sponsored`, `retail_voucher`, `betting_voucher`; points cost; stock; sponsor; active) and `redemptions` (requested, approved, fulfilled, cancelled; points spent as a negative ledger row, never an edit). Voucher codes are held securely (RLS: only the member and admins) and fulfilled by an admin at first. High-value rewards need manual approval. Redeeming is atomic, so stock and points cannot go wrong.
- Flags: `REWARDS_ENABLED` and a separate `BETTING_VOUCHERS_ENABLED`, off until counsel signs off and a licensed partner (Supabets or Playbet) has agreed to fund them. Perks, sponsored rewards and retail vouchers (for example Mr Price Sport) can go live earlier. Rewards are funded by sponsors, not by Puntr, unless the owner decides otherwise.
- Betting vouchers are a gambling promotion: show them only to members who are 18+ attested, email-confirmed, not on a break and not banned, labelled "Ad" with 18+, "T&Cs apply" and 0800 006 008, and never with profit or "free bet" style claims. No personal information goes to a partner; use bulk codes the partner supplies.
- Abuse controls: caps on referral rewards per member per month, a review queue in `/admin` for suspicious patterns (many sign-ups in minutes, similar email patterns), and no device or IP tracking (privacy). Multiple accounts are already prohibited in the Terms.
- Legal in the same PR (standing rule): Terms (the rewards scheme, eligibility, no cash value, fraud revocation, changes with notice) and section 7 Invites, Privacy (redemptions and voucher codes, what a partner sees), Affiliate disclosure, notice version bump, `docs/legal-changelog.md`. Questions for counsel, marked `[attorney review]`: whether any part is a promotional competition under CPA s36, whether betting vouchers as incentives breach the National Gambling Board's advertising rules on inducements, and tax treatment.

**PayFast credits and recurring billing, planned Fri 30 Oct 2026 at 12:00 SAST.** The owner decided to add Pay-As-You-Go credits and recurring billing (Puntr Pro, indicatively R99/month) with their PayFast merchant account before launch. A scheduled message was set in the previous account's session; in a new account start it by hand with this brief:

- Env vars (owner sets them in Vercel; never ask for credentials in chat): `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, a sandbox flag. Sandbox first; the owner approves live mode.
- Append-only credits ledger with RLS; packs from `/pricing`; a checkout server function that builds a signed PayFast form with no personal data beyond what PayFast needs; an ITN route that verifies signature, source IP range, amount and PayFast's server-side validation before granting credits, idempotent on `pf_payment_id`; PayFast subscriptions for Puntr Pro with cancel and pause; account pages for balance, history and cancellation; refund and cancellation terms.
- Paying must never affect ranking, points or prize eligibility.
- Legal in the same PR: `/terms` (payments and a subscription clause marked `[attorney review]`), `/privacy` (PayFast as a processor), `/refunds`, `/pricing`, notice version bump, `docs/legal-changelog.md`, and the Launch scope line in `CLAUDE.md`.

**Then** P12 affiliate and content engine (approved partners, `/go` click tracking, Firecrawl + Gemini drafts the owner approves; no personal data to AI services), P13 Afrikaans, isiZulu, isiXhosa (switch on only after a native-speaker review), P14 hardening and the launch PR. Post-launch: AI previews (P16), seed round pages (P17, P18), prizes only after legal sign-off.

## Decisions the owner has made

- PuntPoints must be configured before launch: built and switched off; the earning rules are still to be decided (D18).
- A referral programme with a high-value incentive, coupled with PuntPoints as a loyalty scheme redeemable for betting vouchers, sponsored rewards and perks. No cash prizes. Built and switched off; values, funding and what is live at launch are still to be decided by the owner (D19 to D22).

- Sign-in: email + password without a confirmation step, with email confirmation and two-factor encouraged afterwards; code or link, username + password and Google also offered; X/Twitter not enabled.
- Posting a pick (which puts it on the feed and the leaderboard) needs a confirmed email. Identity verification (KYC) is not built and not decided: the privacy notice says no ID document, selfie or biometrics are collected, so KYC needs a provider, a privacy-notice change and attorney review first.
- Launch emails: one on launch day and two reminders (reminders only for people who ticked marketing); WhatsApp and SMS are sent by a person from `/admin`, only to opted-in people.

## Known risks and gaps

- Nothing has run against live API-Sports, live Resend, real Google sign-in or the real crons yet; UI was verified against mock servers.
- Unconfirmed email sign-up allows pre-registration of someone else's address (mitigations in `docs/auth-email.md`).
- Referral farming (many accounts) is not prevented. Age check is by birth year plus attestation.
- `/support` contact form only shows a toast. PuntPoints are built but switched off until the owner decides the values and turns them on (P19, D18); the About, Support and Terms copy already describes the scheme.
- Username sign-in attempts share the server's IP for Supabase's rate limits.
- Legal pages are drafts until counsel approves.
