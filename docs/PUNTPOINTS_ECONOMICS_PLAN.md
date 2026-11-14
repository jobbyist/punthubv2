# PuntPoints economics, loss prevention and abuse guardrails (session plan)

Owner brief (14 Nov 2026): design and implement PuntPoints economics and mechanics with loss prevention, strict
fair-usage limits and abuse mitigation, **between Sat 21 Nov and Mon 23 Nov 2026**, before the 1 Dec launch.
Counsel has approved duel stakes (switched on 14 Nov).

## Where we are (14 Nov)
- Ledger: `puntpoints_ledger` (append-only kinds: award, spend, refund, adjust, reversal, transfer_in/out,
  duel_stake/payout/refund). Balance = sum. Transferable = balance minus invite points and points from the last
  7 days (`puntpoints_transferable`).
- Sources (minting): `point_rules` awards (picks, quests, streaks), referral bonus (up to 30%, not transferable),
  admin adjustments. Sinks (burning): rewards redemptions (locked until 1 Dec). Transfers and duels only move points.
- Limits: transfers 10-200 / 200 a day / 1,000 a month / 14-day account / 7-day hold; duels 10-100 stake,
  200 a day, 3 open, 3 per pair per week.
- Gaps: no global minting budget, no liability view (points outstanding x voucher cost), no velocity/anomaly
  alerts, no freeze/clawback tooling beyond manual adjust, no collusion detection between linked accounts.

## Session deliverables
1. **Economic model**: points-to-rand liability rate per reward (cost to Puntr or sponsor), target burn rate,
   monthly minting budget per member and platform-wide; documented in `docs/PUNTPOINTS_ECONOMICS.md`.
2. **Minting controls**: daily/weekly earn caps per rule and per member; diminishing returns on repeated actions;
   award only on settled, verified actions; streak caps.
3. **Liability guardrails**: `points_liability()` admin view; redemption caps per member per period; reward stock
   and budget caps per sponsor; automatic pause of a reward when its budget is used; owner alert thresholds.
4. **Abuse mitigation**: multi-account signals without new trackers (same payout details, same phone/ID check,
   referral loops, duel pairs that always lose to each other, transfer rings); risk score; holds on high-risk
   redemptions; review queue in Admin.
5. **Fair-usage limits**: consolidate all limits in `app_settings` with one Admin screen; per-account-type tiers
   (new, verified, Pro).
6. **Enforcement tooling**: freeze balance, reverse a chain of awards/transfers/duels with reason, audit trail in
   `admin_actions`, member notification.
7. **Monitoring**: Analytics tab panels (minted, burned, outstanding, top earners, anomaly list), daily email to
   admin@ when thresholds trip.
8. **Legal**: Terms PuntPoints section and Privacy (risk scoring) updates, legal changelog.

## Decisions needed from the owner before the session
- Rand value per point for liability (e.g. 100 points = R1?) and the monthly rewards budget Puntr funds itself.
- Whether risk scoring may use identity-check results (KYC) and device information (privacy impact).
- Earn caps by tier and whether Pro members earn faster.
