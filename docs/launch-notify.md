# Launch notifications

## Who is on the list
`early_access` holds the people who asked for early access. Rows with `founding_reserved = true` hold a Founding number for the person who signs up with that email address (any letter case). The number is assigned in order when they finish setting up their profile (`profiles_assign_founding`). Everyone else can only take a number that is not held, and the public counter treats held spots as unavailable. The personal details for the first five were loaded straight into the database and are not in this repository.

Data fixes at import: a leading `www.` was removed from one email address. `cleanEmail()` in `src/lib/launch.ts` does the same for future imports. One phone number (07083645780) is not a South African format, so the admin panel shows no WhatsApp or SMS link for it. Check it by hand.

## Emails (Resend, three waves)
`/api/cron/launch-notify` runs every 10 minutes from 06:00 to 08:50 UTC (08:00 to 10:50 SAST) through pg_cron. It does nothing unless today is a wave date: launch day, +3 days, +7 days (`LAUNCH_DATE`, default 2026-11-02, so 2, 5 and 9 November).

- **Switch:** nothing is sent unless `LAUNCH_EMAILS_ENABLED=true` on the server. This is deliberate: set it only after the attorney has agreed the approach (D11).
- **Who:** early-access people with no profile yet, not unsubscribed, no privacy request. Wave 1 goes to all of them. Waves 2 and 3 go only to people who ticked marketing on the early-access form.
- **Safety:** each send is logged in `launch_email_sends` (primary key email + wave), so nobody gets the same wave twice. A failed send is retried at most once an hour. Every email has an unsubscribe link and `List-Unsubscribe`, 18+ and the 0800 006 008 helpline.
- **Wording:** `src/lib/email/launch-notify.ts`. The perks listed are the ones on /pricing. Nothing promises or implies profit.

## WhatsApp and SMS (sent by a person)
The system never sends these. On launch day (wave 1, once) it:
1. writes a row to `admin_notifications`, which appears live at the top of `/admin` through Supabase Realtime, and
2. emails the draft to every admin (their sign-in email) and to `ADMIN_NOTIFY_EMAIL` if set.

The Waitlist tab lists the people with one-tap WhatsApp and SMS links (message filled in). Only people who opted in to marketing get links, and only South African numbers are linked. The draft is also shown there ahead of launch.

## Setup
Server variables: `LAUNCH_EMAILS_ENABLED`, `LAUNCH_DATE` (optional), `ADMIN_NOTIFY_EMAIL` (optional), `WAITLIST_LINK_SECRET`, `RESEND_API_KEY`, `LOVABLE_API_KEY`, `CRON_SECRET`. Vault: `cron_base_url`, `cron_secret`. You also need to be an admin (`docs/admin.md`).

Test it before launch with a date in the past or future: set `LAUNCH_DATE` to today, `LAUNCH_EMAILS_ENABLED=true`, and `ADMIN_NOTIFY_EMAIL` to yourself, but first remove real people from the list or you will email them.
