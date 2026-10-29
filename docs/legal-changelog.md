# Legal changelog (for the owner and counsel)

One entry per PR that changes the legal copy or should have. Newest first. "Review" lists what counsel should look
at. Everything is a draft until approved; approvals are recorded here once given.

## 2026-10-29, betting vouchers switched on (no page text changed)

- The owner switched `betting_vouchers_enabled` on in the live database for launch. No reward of that type exists yet, so nothing is listed to members. Terms §6 and the Affiliate disclosure already describe betting vouchers ("if we offer them"): once a betting-voucher reward is added, change that wording to say they are offered, in the same PR.
- Review for counsel before a betting voucher is listed: the National Gambling Board's advertising rules on inducements, the Consumer Protection Act promotion rules, the licensed partner's written agreement and data terms, and the required labels ("Ad", 18+, T&Cs apply, 0800 006 008). Members see them only if 18+, email-confirmed, not on a break and not banned.

## 2026-10-29, Terms `2026-10-29-r5` (PR: football leagues, rugby after launch)

- **Terms** §4 now says Puntr covers football (soccer) predictions at launch and that rugby and horse racing are planned for after launch and not yet available. This narrows a claim the product could not meet (rugby coverage); no new data is collected.
- New `notice_versions` row: `terms` `2026-10-29-r5`. Privacy and Privacy choices unchanged.
- Site copy that named URC and Springbok fixtures (home, predictions, How it works, About, nav) was corrected in the same PR.

## 2026-10-29, Terms `2026-10-29-r4`, Privacy `2026-10-29-r3` (PR: PuntPoints and rewards)

- **Terms** §6 now describes PuntPoints as a loyalty scheme (earned for activity, never for winning or spending; no cash value; not bought, sold, transferred or exchanged for money; no effect on rankings), redeemable for vouchers, sponsored rewards and perks provided by partners, with eligibility, reversal for fraud, and 30 days' notice before ending the scheme. §7 Invites now says both sides earn points after a waiting period (currently 7 days) and that no cash is paid. §8 clarifies that rewards redeemed with points are a loyalty scheme, not a prize or contest.
  Review: whether any part is a promotional competition (CPA s36); whether betting vouchers as rewards breach the National Gambling Board's advertising rules on inducements (they are **off** until you switch them on); the 30 days' notice; reversal of points on fraud; tax and VAT on sponsored rewards.
- **Privacy** data table: a PuntPoints and rewards row (ledger, redemptions, voucher codes). Processors paragraph: sponsors receive no personal information from us; vouchers come from bulk codes. Review: retention of the ledger and redemptions after deletion.
- **Affiliate disclosure**: sponsored rewards and betting vouchers (labelled "Ad", 18+, not on a break).
- Everything ships **switched off** (PuntPoints, rewards and betting vouchers each have their own switch in /admin). The pages describe the scheme as built; turn it on only when the rules and rewards are final.
- New `notice_versions` rows: `terms` `2026-10-29-r4`, `privacy` `2026-10-29-r3`.

## 2026-10-29, Terms version `2026-10-29-r3` (PR: confirmed email to post)

- **Terms** §4 and §9: posting a prediction (which puts it on the community feed and the leaderboard) needs a
  confirmed email address. Enforced in the database (`can_post`, trigger on `predictions`).
  Review: whether a confirmed email is enough for posting to the public leaderboard, or whether identity
  verification (KYC) is wanted. KYC is **not built**; `/privacy` currently says no ID document, selfie or biometrics
  are collected, so adding KYC would need that statement, a verification provider and a lawful basis changed first.
- New `notice_versions` row for `terms` at `2026-10-29-r3`. Privacy and Cookies are unchanged (`r2`).

## 2026-10-29, notice version `2026-10-29-r2` (PR: legal alignment)

Brought the pages in line with the platform as built through PRs #18 to #27.

- **Terms**: removed claims the product does not make (odds comparison, a recurring-commission affiliate programme,
  PuntPoints being awarded, invites moving people up a waitlist). Added sign-in methods and account security (§3),
  what the service actually provides (§4), invites as recorded today (§7), a new §9 on locked, public, chained
  predictions, automatic grading, void rules and corrections, a new §10 on paid options not being on sale, public
  record licence (§14), self-service account deletion (§18). Sections renumbered.
  Review: §9 void rules (72 hours for postponed matches); §10 subscription wording for Puntr Pro (an
  indicative R99 per month is mentioned); §14 licence surviving deletion.
- **Privacy Policy**: data table rewritten (early-access list, launch messages, account, security, public record,
  reports and moderation, invites, analytics, affiliate tracking, marketing, privacy requests). New §3 How you sign
  in (email and password, code or link, username and password, Google, authenticator-app two-factor). New §4
  Early access, launch messages and marketing, with a `#marketing` anchor (the marketing notice link already
  pointed there and the anchor did not exist). Processors: Supabase, Vercel, Resend, Google (optional), a sports-data
  provider (no personal data). Sections renumbered.
  Review: retention for reports and moderation, for the early-access list and for launch messages; the launch email
  sequence (one email, then up to two reminders only for people who ticked marketing); manual WhatsApp and SMS to
  people who opted in; Google as an independent controller for its own sign-in.
- **Privacy choices (cookies)**: the essential list now names every cookie and storage key in use
  (`puntr_consent`, `puntr_lang`, the sign-in session, `puntr:ref`, `puntr:security-prompt`, `puntr:claim:…`).
  Review: whether the language cookie and the invite code count as essential.
- **Affiliate disclosure** and **Refunds**: reviewed, still accurate, not changed.
- **Support FAQ**: "invites move friends up the waitlist" corrected.
- **Database**: new `notice_versions` rows (`terms`, `privacy`, `marketing`, `tracking` at `2026-10-29-r2`). New
  sign-ups record acceptance against these; older consent rows keep the version they were given.
- **Decisions**: X/Twitter sign-in was built and **not enabled** (PR closed, branch `mvp/x-signin` kept).

## Open for counsel (carried forward)

- Terms need a subscription clause before Puntr Pro goes on sale.
- Name the Information Officer and register with the Information Regulator (`/privacy` §1).
- Retention periods marked `[attorney review]` on `/privacy`.
- Whether unconfirmed email sign-up creates any obligation to verify before the public leaderboard shows a member.
