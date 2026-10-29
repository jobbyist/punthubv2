# PuntPoints, referrals and rewards

Built as blueprint prompts P19 and P20. **Everything ships switched off.** Nothing is awarded, no referral vests and no reward is offered until you turn it on in `/admin` → Rewards. The values below are proposals and are editable there.

## What it does

- **Points reward activity, never results.** They are never cash, never purchasable, never transferable, and no public view reads them, so they cannot change rankings, the leaderboard or prize eligibility (a SQL test checks this).
- **Earning rules** (table `point_rules`, proposed values, all inactive): confirm email +10 once; first pick +20; each locked pick +2 (max 10 a day); each settled pick +3 (a void earns 0); join through an invite +25; a friend you invited posts a first pick +25 (max 20 a month). Milestone bonuses (table `referral_milestones`, inactive): 3, 10 and 25 qualified invites for +100, +300 and +800.
- **Members earn only when in good standing:** 18+ attested, confirmed email, not banned, not on a break. Awards are idempotent (one per member, rule and reference) and capped in the database.
- **Referrals:** a referral is recorded at the invited member's first pick and vests after 7 days (`referral_rewards.vests_at`). A daily job (`vest-referrals`, 03:15 UTC) awards both sides and any milestone. It does nothing while points are off, so referrals wait instead of being lost. A referral that vested in the last 30 days is reversed if either account is banned or deleted. `/admin` → Rewards → Referral review flags a member who qualified four friends within an hour and can reverse a referral with a reason.
- **Rewards catalogue** (tables `rewards`, `reward_codes`, `redemptions`): kinds are perk, sponsored reward, retail voucher and betting voucher. A reward with uploaded codes uses them as stock; others use a stock number or no limit. Redeeming is one locked transaction (no double spend, no over-stock), writes a negative ledger row, and an admin marks it sent (the code then shows to the member). Cancelling refunds points and frees the code as new rows. Perks can be set to fulfil straight away.
- **Betting vouchers** have their own switch. They appear only to 18+, email-confirmed members not on a break, labelled "Ad" with the responsible-gambling message.
- Members see `/rewards` (balance, earning rules, invite card, catalogue, redemptions, history) and a PuntPoints item in the account menu.

## Turn it on (owner checklist)

1. Decide the values (decisions D18 to D22 in the blueprint): edit the rules and milestones in `/admin` → Rewards.
2. Add rewards (title, type, cost, stock, sponsor) and upload any voucher codes the sponsors supplied. New rewards start inactive: switch each on.
3. Switch on **PuntPoints**, then **Rewards**. Switch on **Betting vouchers** only after counsel signs off and a licensed partner funds them.
4. Make sure the legal pages are approved (see `docs/legal-changelog.md`): Terms §6 to §8, the Privacy table and the Affiliate disclosure describe this scheme.
5. Run `supabase/tests/puntpoints_rewards.sql` in the Supabase SQL editor (it rolls back; any `ASSERT FAILED` is a failure).

## Where things are

Migration `supabase/migrations/20261030150000_puntpoints_rewards.sql`. App: `src/routes/rewards.tsx`, `src/lib/rewards*.ts`, `src/hooks/use-points.ts`, `src/components/admin/rewards-admin.tsx`, strings in `src/locales/en-ZA/rewards.json` and the `rewards` block of `admin.json`.
