# Legal alignment

Rule (also in `CLAUDE.md`): every PR that changes what Puntr collects, stores, shows, sends or promises updates the
legal pages in the same PR. The owner and counsel approve afterwards, so each change is logged in
`docs/legal-changelog.md`.

## Which page covers what

| Feature or change | Terms | Privacy | Privacy choices (cookies) | Other |
|---|---|---|---|---|
| New sign-in method, provider or password rule | §3 | §3 How you sign in, §6 processors, data table | Essential list if storage changes | `docs/auth-email.md` |
| Two-factor, email confirmation | §3 | §3, data table (security) | | |
| Betting slips (upload, OCR, AI reading, slip images) | §6 Betting slips | Data table "Betting slips", §6 processors (Gemini fallback) | | `docs/BETTING_SLIPS.md` |
| New data field on a profile or table | | Data table in §2 | | `docs/privacy/README.md` data map |
| New processor or third-party service | §5 payment processing | §6 processors and payment data table | Cookies if it sets any | PayFast by Network current; Ozow planned, not integrated |
| New cookie, localStorage or sessionStorage key | | §10 | Essential or optional list | `docs/legal-alignment.md` storage list |
| Emails, WhatsApp or SMS the platform sends | | §4 marketing | | `docs/launch-notify.md` |
| New-account support notification | | §2 internal signup notifications | | Supabase Auth trigger → `email_outbox` → Resend → `support@puntr.co.za` |
| Picks, grading, corrections, hiding | §9 | §5 public record | | `/how-it-works#grading` |
| Invites and referrals | §7 | Data table (invites) | | `docs/growth.md` |
| Brand Ambassador applications | | Data table (applications), §6 processors (Resend/Supabase) | | `partners@puntr.co.za` via Resend |
| Points, rewards, prizes | §6, §8 | | | |
| Tipster Support (unlock, support plans, copied picks, notes) | §6 Tipster Support | Data table "Tipster Support" | | `docs/tipster-support.md` |
| Pay-As-You-Go, Puntr Pro, Annual Pass and any payment | §5 and §10 | Payment data table and §6 processors | | `/refunds`, `/pricing`, PayFast by Network |
| Partner links, ads | §5 | §10 | Affiliate tracking switch | `/affiliate-disclosure` |

## Browser storage in use (keep `/cookies` in step)

- Cookies: `puntr_consent` (180 days), `puntr_lang` (1 year).
- localStorage: Supabase session (`sb-…-auth-token`), `puntr:ref`, `puntr:security-prompt` (3-day snooze).
- sessionStorage: `puntr:claim:<user id>`.
- Optional, behind consent: analytics events and affiliate click tracking.

## Processors and recipients

Supabase (database, sign-in, Realtime to admins; Ireland), Vercel (hosting), Resend via the Lovable email gateway (transactional email and partner application delivery), PayFast by Network (current payment processor; South Africa), and Google only when a member chooses Google sign-in. Ozow is planned but not yet integrated.way
(email), Google (only when a member chooses Google sign-in), API-Sports (fixtures and results; no personal data).
X/Twitter sign-in is **not** enabled (decision, 29 October 2026).
