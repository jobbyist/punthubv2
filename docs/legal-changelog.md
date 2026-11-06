# Legal changelog (for the owner and counsel)

One entry per PR that changes the legal copy or should have. Newest first. "Review" lists what counsel should look
at. Everything is a draft until approved; approvals are recorded here once given.

## 2026-11-05, no legal page text changed (PR: Founding Member landing page and sitewide copy)

- New public page `/founding`, a sitewide Founding Member strip, a new home hero ("Predict what's next. Prove your worth." / "Get in early. Become a Founding Member. Be part of what's next."), a footer link and a clearer header button. They link to the existing `/join` sign-up. No new data is collected, stored or sent, and no new tracker, processor or sign-in method.
- The perks shown are the ones already on `/pricing`: numbered badge #1 to #100, full access, and 30 free Pay-As-You-Go credits a month for 3 months once credits launch (credits are not on sale). The launch date (1 December 2026) is shown as a plan.
- Review: whether "Prove your worth" and "Get in early" read as inducements under the advertising rules `[attorney review]`; whether the 30-credit perk needs a fuller condition on `/terms` before credits launch. Terms, Privacy, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.

## 2026-11-05, Privacy `2026-11-05-r4` (PR: launch date 1 December, Founding sign-ups from 2 November)

- Owner decision (5 Nov 2026): the official platform launch is **1 December 2026**; Founding Member sign-ups (first 100, free) open from **2 November 2026**.
- **Privacy** §4 now says the early-access emails are sent when Founding Member sign-ups open (2 November 2026), then up to two reminders, instead of "on launch day". Nothing new is collected or sent.
- Product wording corrected in the same PR so nothing says Puntr "is live" before 1 December: the three early-access emails, the WhatsApp/SMS drafts for the admin, the admin reminder email, and the intro on `/roadmap` (launch date 1 Dec, "Founding Member sign-ups are open now"). The roadmap's weeks now count from 1 December.
- Review: whether "Founding Member" perks described before launch (numbered badge, 30 free Pay-As-You-Go credits a month for 3 months once they launch) need extra wording while credits are not on sale `[attorney review]`. Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.
- New `notice_versions` row: `privacy` `2026-11-05-r4`. Terms stays `2026-10-30-r6`.

## 2026-10-30, Terms `2026-10-30-r6` (PR: product roadmap)

- **Terms** §4 now lists the sports planned after launch (basketball, rugby, horse racing, combat sports, cricket, tennis), says none is available until it appears on the site, and that the target dates on `/roadmap` are plans, not commitments. No new data is collected.
- New public page `/roadmap`: target weeks per sport counted from launch; a sport shows as "Live" only when it is switched on for the fixtures sync. "Also on the way" lists languages, PuntPoints rewards, Puntr Pro and mobile apps without dates.
- Site copy corrected in the same PR: the sidebar listed rugby as an active sport (it is not live); How it works now points to the roadmap.
- Review: whether publishing target dates creates a Consumer Protection Act expectation (the page and Terms both say dates can move); combat sports and horse racing content under the advertising rules once live.
- New `notice_versions` row: `terms` `2026-10-30-r6`. Privacy and Privacy choices unchanged.

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

## 2026-11-06: Pay-As-You-Go and Puntr Pro "available at launch" copy

- **Changed**: `/pricing` and `/about` now say Pay-As-You-Go credits and Puntr Pro (indicative R99 per month) are available
  at the official launch on 1 December 2026 (previously "coming later"). Nothing is on sale yet and the CTA stays
  disabled until the PayFast work, its legal copy and the owner's go-ahead are done.
- **Review** `[attorney review]`: Terms still need a subscription clause and the Refunds page needs the credits and
  subscription position before either product goes on sale on 1 December.

## 2026-11-06: member survey, R500 OTT voucher draw, Newsroom, in-app notifications

- **New data**: `survey_responses` (rating, free-text feedback, features wanted, pricing view, optional draw entry and
  contact consent, one row per member). `notifications` and `user_notifications` (read state per member).
  `newsroom_articles` (public company updates). No new processor or tracker. Newsroom analytics events use the existing
  consent-gated helper.
- **Pages to update** `[attorney review]`: `/privacy` data table (survey answers: purpose, retention, who sees them)
  and `/terms` or a dedicated draw rule for the R500 OTT voucher draw. The draw is a promotional competition: closing
  date, eligibility, how the winner is chosen and told, and the prize-draw rules (Consumer Protection Act and
  Regulation 11 of the CPA regulations) are not yet written. The `/feedback` page says the rules will be published
  there; they must be before the first winner is chosen.
- **Founding Member Annual Pass (R299 once-off, 12 months of Puntr Pro, no auto-renewal)** is announced in the bell
  and on `/about` as a prepaid membership, not an investment or donation. Checkout is not built. Refunds and Terms
  need the pass position before it goes on sale.
