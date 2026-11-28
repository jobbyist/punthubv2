# Tipster Support

Built 28 Nov 2026. Migration `supabase/migrations/20261128320000_tipster_support.sql`. The UI hides itself (or
shows "switches on soon") until that migration is applied: every reader treats "function does not exist" as not live.

## Rules

- **Unlock:** identity verification approved + a current streak of 10 counted wins. Counted = the first pick a
  member posted on a fixture, settled won at settle odds ≥ 1.40, fixture kicked off in the last 30 days, not hidden.
  A loss at any price resets; voids are skipped. Checked on every settlement (`tipster_check_unlock`) and when an ID
  is approved. A streak without ID verification (or without good standing) is recorded as `qualified` and unlocks on approval or the next settlement; the UI shows `qualified` as "verify" or "pending", never as unlocked.
- **Offer:** the tipster sets any of: price per copied pick (5-100 PP), weekly (20-400), monthly (50-1,200), a 280-char
  pitch, and an "accept new supporters" switch. Price changes apply to new supporters; renewals use the lower of the
  old and new price.
- **Support:** 18+, good standing, account ≥ 14 days, only transferable points (not invite points or points from the
  last 7 days), 30-day cap 1,500 PP. Free members: 2 live supports; Pro: 10.
- **Copying:** every new pick by an active tipster is copied to each live supporter (`tipster_copies`) with an in-app
  notification. Copied picks are never written to `predictions`, so they never touch the supporter's record, streak,
  leaderboard or the hash chain. Tipsters can add one supporters-only note per upcoming pick (`tipster_pick_notes`).
- **Escrow:** every charge is a `tipster_charges` row plus a `tipster_hold` ledger debit. Per-pick: released
  (`tipster_earning`, less fee) when the pick settles won/lost; refunded (`tipster_refund`) when void or hidden.
  Weekly/monthly: held up front; at period end (cron `puntr-tipster-periods`, every 15 min) released once at least one
  pick copied in the period has settled won/lost (waits up to 14 days after period end for unplayed matches), otherwise
  refunded in full. Renewal or expiry runs at period end regardless.
  A per-pick plan pauses itself when a hold fails; the supporter resumes it.
- **Fee:** 10% of each release (0% for Pro tipsters) is not credited to anyone: a points sink.
- **Admin:** `admin_set_tipster_status(user, 'paused'|'revoked'|'active', reason)` ends live supports and refunds
  held period charges; `admin_tipster_overview()` lists tipsters, supporters, received and refunded points.

All settings are rows in `app_settings` (`tipster_*`), editable in Admin > System.

## Why open to everyone (not Pro-only)

Puntr's promise is "Predict smarter. Prove it.": the unlock is earned by a verified record, so gating it behind
payment would read as pay-to-be-a-tipster and shrink the pool of tipsters at launch. Pro adds capacity (10 supports
instead of 2) and keeps 100% for Pro tipsters, which is a clear upgrade reason without a paywall on merit.

## Where things are

- Data: `src/lib/tipster-support.ts` (+ tests)
- Page: `src/routes/tipster-support.tsx` (tabs: Supporting, My tipster hub, Find tipsters, How it works)
- Components: `src/components/tipster-support/` (unlock nudge on Discover, Account and own profile; support card on
  every unlocked tipster's `/u/$username`)
- Strings: `src/locales/en-ZA/tipster.json`
- Legal: Terms §6 (r26), Privacy data table, `docs/legal-changelog.md`

## After applying the migration

1. Regenerate `src/integrations/supabase/types.ts`.
2. Smoke test with two staff accounts in a SQL transaction: insert a tipster profile as `active`, support with each
   plan, create a pick as the tipster, settle it won and void, run `process_tipster_periods()`.
