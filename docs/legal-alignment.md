# Legal alignment

Rule (also in `CLAUDE.md`): every PR that changes what Puntr collects, stores, shows, sends or promises updates the
legal pages in the same PR. The owner and counsel approve afterwards, so each change is logged in
`docs/legal-changelog.md`.

## Which page covers what

| Feature or change | Terms | Privacy | Privacy choices (cookies) | Other |
|---|---|---|---|---|
| New sign-in method, provider or password rule | §3 | §3 How you sign in, §6 processors, data table | Essential list if storage changes | `docs/auth-email.md` |
| Two-factor, email confirmation | §3 | §3, data table (security) | | |
| New data field on a profile or table | | Data table in §2 | | `docs/privacy/README.md` data map |
| New processor or third-party service | | §6 processors | Cookies if it sets any | |
| New cookie, localStorage or sessionStorage key | | §10 | Essential or optional list | `docs/legal-alignment.md` storage list |
| Emails, WhatsApp or SMS the platform sends | | §4 marketing | | `docs/launch-notify.md` |
| Picks, grading, corrections, hiding | §9 | §5 public record | | `/how-it-works#grading` |
| Invites and referrals | §7 | Data table (invites) | | `docs/growth.md` |
| Points, rewards, prizes | §6, §8 | | | |
| Pay-As-You-Go, Puntr Pro, any payment | §10 | | | `/refunds`, `/pricing` |
| Partner links, ads | §5 | §10 | Affiliate tracking switch | `/affiliate-disclosure` |

## Browser storage in use (keep `/cookies` in step)

- Cookies: `puntr_consent` (180 days), `puntr_lang` (1 year).
- localStorage: Supabase session (`sb-…-auth-token`), `puntr:ref`, `puntr:security-prompt` (3-day snooze).
- sessionStorage: `puntr:claim:<user id>`.
- Optional, behind consent: analytics events and affiliate click tracking.

## Processors and recipients

Supabase (database, sign-in, Realtime to admins; Ireland), Vercel (hosting), Resend via the Lovable email gateway
(email), Google (only when a member chooses Google sign-in), API-Sports (fixtures and results; no personal data).
X/Twitter sign-in is **not** enabled (decision, 29 October 2026).
