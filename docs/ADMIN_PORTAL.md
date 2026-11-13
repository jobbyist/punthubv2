# Admin portal

`/admin` (admins only; every server function re-checks `is_admin()`, and every change is written to `admin_actions`).

| Tab | What it does |
|---|---|
| System | Key and job status, API limits per service (edit caps), launch time and transfer settings, competition points, recent fixtures checks |
| Users | Every member with email, sign-in, plan, access, warnings, balances. Send an update (in-app, optional email), warn, change plan, grant or revoke access (Early access lets a member test live features before launch), add or remove credits, limit, suspend, ban. Message all members. Moderation (hide a pick) below |
| Newsroom | Review queue with check results, edit, publish, back to review, reject, sources and run log; generate (first run: 3 articles); engine settings; project-update feed |
| Analytics | Members, activity, consented first-party events, top pages and sources, visitors per day |
| Action log | Every admin change, newest first, append-only |

## Launch gate

Live MVP features (picks, wallet, points leaderboard, credit spends) open to everyone at `launch_at`
(`2026-11-30T22:00:00Z`, 1 December 00:00 SAST). Before that: admins, and members with the `early_access`
entitlement. Practice Mode stays open to Founding Members. The database enforces it (`predictions_launch_gate`
trigger, wallet and credit functions); the app only hides what a member cannot use.

## API limits

Every external call claims one unit in `api_quota_claim` first; over the daily or monthly cap the call is not made
(fail closed). Defaults (edit in System): Gemini 3.8 Flash 18/day, Gemini 3.1 Flash-Lite 450/day, Parallel search
60/day 1,500/month, Parallel extract 60/day 1,500/month, Firecrawl 30/day 450/month, Resend 80/day 2,500/month (room
left for Supabase sign-in emails if they go through Resend).

## Email

All app email goes through `sendViaResend`, which claims the `resend` quota. Batch senders stop at the cap and resume
on the next run. Admin messages and broadcasts go into `email_outbox`; `/api/cron/email-outbox` sends 15 per run,
every 15 minutes, 07:00 to 19:59 SAST. Marketing broadcasts go only to members who opted in.
