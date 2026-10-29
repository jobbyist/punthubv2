# Handoff: Puntr MVP (as of Thu 29 Oct 2026, after P4; P5 on branch mvp/p5-localisation)

Blueprint (prompts P0–P18): https://claude.ai/artifact/LKwEaVceitXRL6CgF8iBQ2 (version 4)
Original build session: https://claude.ai/code/session_01H72HwojUL7ZLfrT7zuovqi
Soft launch Sun 1 Nov; production target Mon 2 Nov 2026; goal 100 founding members in 30 days.

## Done (merged to main in PR #15)

- P0 CLAUDE.md guardrails and `src/lib/flags.ts` (bookmaker wall, affiliates, AI chat, payments, prizes all off).
- P1 trust and claims sweep (copy, canonicals, sitemap, dev route removed).
- P2 free-launch pricing, refunds holding policy, grading rules, "No prizes at launch" terms.
- P3 core schema (`supabase/migrations/20261029071500_mvp_core.sql` + hardening): profiles, fixtures, append-only predictions with SHA-256 chain, `create_prediction` RPC, settlement events, leaderboard views.
- P4 POPIA: `privacy` migration, consent library/banner, `/cookies` (Privacy choices), `/privacy`, `/privacy/request`, `/affiliate-disclosure`, `docs/privacy/README.md`.

## P5 (localisation) in one paragraph

i18next + react-i18next, SSR-safe, no flash. See `docs/i18n.md`. Strings live in `src/locales/en-ZA/*.json`; only en-ZA is enabled (af, zu, xh wait for reviewers, P13). Formatters in `src/lib/format.ts` (`money()`, `odds()`, `pct()`, dates in SAST). `<RgNotice />` is the only responsible-gambling message. Migration `20261030060000_profiles_language.sql` is applied on the live project. `bun run i18n:check`, `bun run test`.

## P6 (accounts) in one paragraph

`/join` (email code, 18+ box, OTP, onboarding), `complete_signup` SQL function (profile + 4 consent rows in one transaction, Founding number shown only after), `completeSignup` / `discardUnderageSignup` / `deleteMyAccount` server functions (`src/lib/accounts.functions.ts`, logic and tests in `accounts.logic.ts`), Supabase `SessionProvider` (`useSession`: user, profile, isSignedIn, isAdmin, signOut), header account menu, `/account`, `/account/privacy` (export, marketing, delete), minimal `/u/$username`. Early-access modal and timed popup are no longer rendered. The OTP email text is in `docs/auth-email.md` and must be pasted into Supabase Auth templates by hand.

## P7 (fixtures) in one paragraph

Provider interface + API-Sports implementation, sync routes with a bearer secret, pg_cron schedule (migration applied), admin CSV fallback, `/predictions` and the home page read real upcoming fixtures. See `docs/sports.md`. Not run against the live API (no key). League IDs come from `SPORTS_LEAGUE_IDS`.

## P8-P10 in brief

P8 `/match/$fixtureId` and the pick form (`create_prediction` only, no edit or delete anywhere), community feed of locked picks. P9 `grade()` and `/api/cron/settle`, leaderboard, results, profile record. P10 founding counter, referrals (`referral_rewards`, pending), waitlist invite script (dry run by default; do not `--send` until D11), `/unsubscribe`. See `docs/growth.md` and `docs/sports.md`.

## Environment facts

- Supabase project `hucjuekhitjuygcoomhw` ("Puntr South Africa", eu-west-1, free plan: no branching). Old Lovable project `cntoniedcjwsgereqrib` must not be referenced.
- Vercel project `punthubv2` (id `prj_ibZDxUlStsrePpHUwpOBxhvUE14l`, team `team_SsKFiB8H2aVoVKQAchiFleRR`), domain puntr.co.za. Supabase env vars were set for Production only: tick Preview too.
- Supabase recorded migrations under its own timestamps, which differ from repo filenames.
- Never force-push, rebase, amend or squash pushed commits (Lovable sync). `src/routeTree.gen.ts` is generated.
- Check builds on the Vercel preview as well as locally; run `bun run lint && bun run build` before every commit.

## Testing

- `supabase/tests/mvp_core.sql` and `privacy.sql` are BEGIN…ROLLBACK scripts. Run them on the live project via the Supabase connector (no branch available). Absence of an error means pass; confirm tables are still empty afterwards.
- No app test runner is installed. Add vitest when convenient.

## Open items

- `/join` does not exist yet: the pricing CTA 404s until P10.
- `/account/privacy` (export via `export_my_data`, delete via `anonymise_account` + auth admin delete) waits for accounts in P6.
- Privacy requests are stored in `privacy_requests`; nobody is emailed. Add a notification or an admin view.
- Create privacy@puntr.co.za; name the Information Officer and register; attorney review of terms, privacy (retention marked [attorney review]) and seed-offer items.
- Retire the old Lovable Supabase project and the FormBackend processor.
- Confirm the service-role key belongs to the new project.
- 5 early-access sign-ups to add as founding members (user supplies details; marketing consent defaults to no).

## Next: P5 → P14 (P15–P18 are post-launch)

P5 localisation foundation and SA English; P6 accounts; P7 fixtures; P8 post a pick; P9 settlement and leaderboard; P10 founding counter, referrals, waitlist invites, `/join`; P11 admin and /verify; P12 affiliate and content engine; P13 Afrikaans, isiZulu, isiXhosa; P14 hardening and launch PR.
