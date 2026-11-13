# Branded Supabase Auth emails (Send Email Hook + Resend)

All auth emails are rendered by `src/lib/email/auth-emails.ts` and sent by `src/routes/api.auth.send-email.ts`
through Resend from **Puntr - South Africa <support@puntr.co.za>** (`RESEND_FROM` overrides; falls back to the older
community sender only if Resend rejects the domain).

| Supabase action | Email | Link lands on |
| --- | --- | --- |
| signup | Confirm your email (code + button) | `/auth/confirm` → `/join` |
| magiclink / email | `<code> is your Puntr sign-in code` | `/auth/confirm` → `/join` |
| recovery | Reset your Puntr password | `/auth/confirm` → `/reset-password` |
| email_change | Two emails (current + new address) when Secure Email Change is on | `/auth/confirm` → `/account/security` |
| invite | You're invited to Puntr | `/auth/confirm` → `/join` |
| reauthentication | `<code> is your Puntr verification code` | (code only) |
| *_notification | Security notices (password, email, phone, sign-in method, two-step) | `/reset-password` |

`/auth/confirm` verifies only when the member taps **Continue**, so mail scanners cannot use the link up.

## One-time setup (owner, Supabase dashboard + Vercel)

1. Supabase > Authentication > **Hooks** > *Send Email hook* > Enable > type **HTTPS** > URL
   `https://puntr.co.za/api/auth/send-email` > **Generate secret** > Save.
2. Vercel > punthubv2 > Settings > Environment Variables (Production + Preview): `SEND_EMAIL_HOOK_SECRET` = the
   `v1,whsec_...` value. Redeploy.
3. Supabase > Authentication > **URL Configuration** > Redirect URLs: add `https://puntr.co.za/reset-password` and
   `https://puntr.co.za/auth/confirm` (keep `/join`).
4. Optional, for the security notices: Authentication > Emails > *Security notifications*, switch on the ones you want.
5. Test: request a sign-in code at `/join` and a reset at `/reset-password` with your own address.

Order matters: deploy this code and add the secret **before** enabling the hook, or sign-in emails fail.
Auth emails are never held back by Puntr's daily email cap (members must always be able to sign in) but count toward it.
Resend free plan: 100 emails/day; at higher volume upgrade Resend or move marketing sends later in the day.
