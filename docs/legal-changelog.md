# Legal changelog (for the owner and counsel)

One entry per PR that changes the legal copy or should have. Newest first. "Review" lists what counsel should look
at. Everything is a draft until approved; approvals are recorded here once given.

## 2026-11-13, no legal page text changed (PR: PFIE fixtures provider)

- **What was added:** fixtures and results can now be gathered from public web pages (Parallel Search finds them, Google Gemini lists what each page states, code checks and cross-checks). Off until `SPORTS_PROVIDER=pfie` is set. No personal data is sent to either service and none is collected.
- Privacy, Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed. No `notice_versions` change.
- Review `[attorney review]`: (1) fixture lists and scores are facts, but they are read from third-party sites, some of whose terms restrict automated reading; the engine stores short quotes and page hashes as evidence and does not republish page text; (2) whether Terms should say how results are verified and that a result can be corrected.

## 2026-11-13, no legal page text changed (PR: content engine foundation)

- **What was added:** code for an automated newsroom (research from public web pages, drafting by Google Gemini, automated checks, review queue). It is switched off, its database migration is not applied, and nothing is published by it yet. No member-facing behaviour changes with this PR.
- **New processors when it is switched on (owner decision needed, per the compliance policy):** Google (Gemini API, free tier), Parallel Web Systems (search), Firecrawl (page reading). They receive public web pages and approved Puntr update text only. No personal information is sent; the code has no path that reads member data into a prompt.
- **No new personal data collected or stored.** Privacy, Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed. No `notice_versions` change.
- Review `[attorney review]` before switching on: (1) whether Privacy should name the three services even though no personal data goes to them; (2) the label on AI-written articles (proposed: "Written with AI assistance, checked against the sources listed"); (3) reuse of facts from third-party news pages with attribution and links: the engine stores short supporting quotes for checking and shows source links, it does not republish source text; (4) Google's free tier may use submitted content to improve its products.

## 2026-11-11, no legal page text changed (PR: Annual Pass expiry notice, Practice Mode feedback email)

- **Annual Pass expiry notice (service email):** sent once per reservation, an hour or more after an unpaid Founding Annual Pass hold has lapsed, to the address the member reserved with. While the offer is open (to 16 November 2026) it says nothing was charged, the place was released and they may reserve again; after it closes it says the offer has closed. No marketing content or unsubscribe link (same basis as the reservation and reminder emails). Recorded in the existing `founding_campaign_sends` ledger.
- **Practice Mode + feedback email (marketing, opted-in Founding Members only, unsubscribe included):** invites members to Practice Mode (made-up fixtures, practice points that never convert to real PuntPoints, demo rewards with no value) and to leave feedback at `/feedback` for a chance to be entered into the R500 OTT voucher draw. **Sending is gated** on `PRACTICE_MODE_ENABLED=true` and nothing is scheduled: Practice Mode does not exist yet, so no real recipient gets this email until it ships.
- No new data collected or stored, no new processor or tracker. Privacy, Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed. No `notice_versions` change.
- Review `[attorney review]`: (1) the R500 OTT voucher draw is a promotional competition (CPA s36 and the CPA regulations). The `/feedback` page says the draw rules, closing date and how the winner is chosen and told "will be published on this page"; they are NOT published yet and must be before this email is sent and before any winner is chosen. The email repeats that wording and does not claim the rules exist. (2) Whether Privacy should say we email a notice when an unpaid reservation lapses. (3) Practice Mode itself (practice points, demo rewards) needs its own legal review when it is built.

## 2026-11-11, no legal page text changed (PR: Annual Pass payment reminder email)

- One service email is now sent automatically, once per reservation, to a member whose unpaid Founding Annual Pass hold lapses within 24 hours. It uses the same signed PayFast redirect as the reservation email. It is sent to the address the member reserved with, is about a reservation they made, and carries no marketing content or unsubscribe link (same basis as the reservation email).
- No new data is collected or stored: the send is recorded in the existing `founding_campaign_sends` ledger (email, campaign id, status, time). No new processor (Resend and PayFast are already listed). Privacy, Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.
- Review `[attorney review]`: whether Privacy should say we send a reminder about an unpaid reservation, and whether a lapsed hold should be described anywhere beyond the existing "expires and the place is released" wording.

## 2026-11-06 (explainer video, Tipster Support wording), no legal page text changed

- The explainer video is now served from Supabase Storage (a public `media` bucket) instead of a YouTube embed, on the home page and `/about`. No YouTube request or cookie is made; the file only downloads when a visitor presses play. Supabase is already a listed processor, so Privacy §6 is unchanged.
- Tipster Support copy (from #57) toned down to match the copy rules: "monetise their knowledge" and "long winning streaks" are replaced with "recognise verified Tipsters with a consistent track record", and every mention says it is planned, not available yet, that points have no cash value and that it never affects rankings. Review: the planned transfer of PuntPoints between members still needs Terms §6 and attorney sign-off before it is built `[attorney review]`.
## 2026-11-06, Privacy `2026-11-06-r10` (PR: account deletion erases member details; survey retention)

- **Gap fixed:** deleting an account anonymises the profile row but keeps it (pick chain), so the optional `member_details` (first/last name, phone, date of birth, province) were NOT removed. `anonymise_account()` now deletes that row. The authenticated role loses `DELETE` on `member_details` (erasure is server-side).
- **Survey responses are kept** after deletion (owner, 6 Nov 2026), linked only to the anonymised profile id; `contact_ok` is switched off so we stop contacting. Free-text comments could contain personal details a member typed.
- Privacy data table: two new rows, "Your details (optional)" and "Founding Member survey" (these were not listed before). Previously nothing in the policy covered either.
- Review `[attorney review]`: lawful basis and purpose for keeping pseudonymised survey data after deletion, whether the free-text field needs a "do not include personal information" notice at the form, retention length for survey data (none set), and how the draw entry is handled for an anonymised member. Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.
- New `notice_versions` row: `privacy` `2026-11-06-r10`.

## 2026-11-06, Privacy `2026-11-06-r9` (PR: X Ads Founding campaign tracking)

- Analytics events (already consent-gated) are now also stored first-party in Supabase (`campaign_events`) with the ad's UTM tags (source, medium, campaign, content, term), the page path and the random browser ID from the `puntr_consent` cookie. No account ID, name, email, IP address or user agent. Kept up to 14 months (daily purge). Only admins can read it (admin Campaigns tab).
- UTM tags from an ad link are kept in sessionStorage for the visit before consent; they are not personal information and are sent nowhere unless the visitor accepts Analytics.
- No new tracker, pixel or processor: the X (Twitter) conversion pixel is NOT installed. `/founding` gains Open Graph/Twitter card tags, trust points and an FAQ (free, not a bookmaker, 18+, email confirmation).
- Privacy §4 Analytics row updated. Review: whether storing UTM tags with a consent-cookie ID needs any wording beyond the Analytics row `[attorney review]`; the X Ads creatives say "Free to join", "First 100", "18+" and carry no profit claim. Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.
- New `notice_versions` row: `privacy` `2026-11-06-r9`.

## 2026-11-06 (KYC), Terms `2026-11-06-r10` and Privacy `2026-11-06-r8` (PR: identity verification, manual phase)

- **Identity verification (owner, 6 Nov 2026):** phase 1 is manual for Founding Members. A member uploads a photo or scan of their SA ID or passport to a private storage bucket; an admin compares it with their name and birth year in `/admin` (ID checks tab) and approves or rejects it. The document is deleted straight after the decision, and within 30 days if never checked (daily `identity-retention` cron). Puntr keeps only the outcome (`identity_verifications`: status, over 18, reviewer, dates). No ID number is ever stored in a column. Phase 2 after launch: VerifyNow API (new processor, to be added to Privacy §6 when built).
- **Required before redeeming any reward** (owner): enforced by a trigger on `redemptions`. Terms §6 updated.
- Privacy: the "we do not collect your ID document" statement is replaced; new row in the data table; "no payments at launch" line corrected (payments are made on PayFast).
- Review `[attorney review]`: lawful basis for ID documents (legal obligation for gambling promotions vs legitimate interest), whether an ID document is special personal information under POPIA s26 (it isn't by itself, but it shows race on the green ID book; collecting it may still need care), the 30-day retention, admin access controls, and a breach plan for the bucket. Staff must never copy an ID number.

## 2026-11-06 (intel cards), no legal page text changed (PR: intelligence fixture cards, guest gate, mobile nav, sports pages)

- Fixture cards show Confidence Score, Algorithmic Pick and model analysis as "available at launch" placeholders (owner decision: no model data yet), and "Odds comparison coming soon" with no bookmaker names (launch rule: no odds comparison).
- Guests see the first two items in full; later items' intelligence fields are blurred under a Founding conversion card. The card says the account is free and the Founding Annual Pass is R299 once-off (claiming includes payment), first 20, before 16 November.
- New `/sports/<sport>` pages describe each sport and how Puntr plans to cover it, in future tense, with dates from `src/lib/roadmap.ts`. They don't claim coverage of a sport that isn't switched on.
- No new data collected, stored, shared or sent. Review: whether the "FOUNDING ACCESS • 100 SPOTS" tag and the placeholder Confidence Score read as a promise before the model exists `[attorney review]`.

## 2026-11-06 (PayFast prep), Terms `2026-11-06-r9` and Privacy `2026-11-06-r7` (PR: Annual Pass payment onboarding, profile pictures)

- **Annual Pass claim includes payment (owner, 6 Nov 2026):** R299 once-off through PayFast. A claim holds a place for 48 hours; the place is confirmed when payment is received; unpaid places are released. Shown in the join flow's last step (Founding members), `/founding`, `/account`, both Founding emails and the survey upsell. Payments stay off until `PAYFAST_ENABLED=true` (PayFast task, owner go-ahead). Terms §4, Privacy (table, §4, §6) and Refunds updated.
- **New processor: PayFast** (payments only; receives payment details directly, we store reference, amount and date). Owner decision under the compliance policy.
- **Refunds page** no longer says Puntr charges nothing: it covers the Founding Annual Pass and states statutory rights (CPA, ECTA cooling-off) are unaffected `[attorney review]`: whether a fixed refund window should be stated, and how a refund interacts with a pass that starts on 1 December.
- **Profile pictures:** optional, compressed in the browser (512 px square, WebP), public on the member's profile and in the header; removable on `/account`. Privacy table and §4 updated `[attorney review]`: moderation of uploaded images and a takedown route.
- New `notice_versions` rows: `terms` `2026-11-06-r9`, `privacy` `2026-11-06-r7`.

## 2026-11-06 (later), Terms `2026-11-06-r8` and Privacy `2026-11-06-r6` (PR: welcome-cron fix, referral wording, confirm-before-sign-in)

- **Referral wording (owner, 6 Nov 2026):** referrals are described as "Earn up to 30% in bonus PuntPoints" on qualifying purchases made by invited people, never cash. Roadmap, Terms §4 and the welcome email now say this and that PuntPoints are redeemable only for vouchers, sponsored rewards and perks. Still a plan: nothing is built or promised as available `[attorney review]` (is a purchase-linked bonus a commission or an inducement; qualifying-purchase terms before it opens).
- **Confirm email before sign-in (owner, 6 Nov 2026):** join copy, How it works, Founding steps and Privacy §3 now say the address is confirmed with an emailed code before sign-in. Terms §4 ("Posting needs a confirmed email address") still holds for members who signed up before this change.
- Welcome-cron sends now stop and log if the send record cannot be saved. Email templates now support light and dark mode with the real logo. No new data collected.
- Review: none beyond the referral item above. Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed.
- New `notice_versions` rows: `terms` `2026-11-06-r8`, `privacy` `2026-11-06-r6`.

## 2026-11-06, Terms `2026-11-06-r7` and Privacy `2026-11-06-r5` (PR: Founding welcome email, Annual Pass offer)

- New Founding Member welcome email from the Founder (new sign-ups only, opted-in members, one per address, logged in `founding_welcome_sends`). Privacy §4 says so.
- New limited Founding Annual Pass offer: the first 20 founding members to claim it before 16 November 2026 (23:59 SAST) reserve 12 months of Puntr Pro for a once-off R299, starting 1 December 2026, no auto-renewal. A claim takes no payment. It is stored in `annual_pass_claims` (account ID, time). The 12:00 campaign email and `/founding` carry the same terms. Terms §4 and Privacy §4 updated.
- "Refer and earn 30%" added to the roadmap "Also on the way" as a plan only (owner wording, 6 Nov 2026): the earlier launch rule was no cash referrals at launch, so nothing is built or promised as available. Terms §4 says referral rewards are planned and unavailable until terms are published.
- Athletics added to the roadmap (weeks 6 to 8 with combat sports), the sidebar and mobile sports list; Terms §4 sports list updated. A LIVE marker now shows beside Soccer in the sports menus.
- Review: whether the reservation-before-payment wording and the 20-place limit are acceptable under the Consumer Protection Act and the ECT Act `[attorney review]`; whether "earn up to 30%" on the roadmap reads as a profit or income claim, and whether referral payments on purchases need Terms and Affiliate-disclosure wording before launch `[attorney review]`; the LIVE marker before launch day (soccer starts 1 December). Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed (Refunds still says no paid products; revisit when checkout opens).
- New `notice_versions` rows: `terms` `2026-11-06-r7`, `privacy` `2026-11-06-r5`.

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

## 6 Nov 2026: forms to support, member details, Founding-only survey, campaign email
- Every public form now also writes to `form_submissions` and emails support@puntr.co.za. Contact form: name, email, subject, message. Privacy request: email and request type (details stay in the database). Survey: member number, rating, Annual Pass answer. Pages: `/privacy` (what we collect, who receives it) [attorney review].
- New private table `member_details` (first and last name, mobile, date of birth, province), optional, member and admins only, never on public profiles. Pages: `/privacy` [attorney review].
- Survey is for Founding Members only, stores structured answers and Annual Pass interest. R500 OTT voucher draw rules and closing date still to be published [attorney review].
- One-off marketing email about the Founding Member Annual Pass, sent only to people who opted in, with unsubscribe. Pages: `/privacy`, `/refunds` (Annual Pass is prepaid, no auto-renewal; checkout not live yet) [attorney review].
- Email sender is now Puntr - South Africa <support@puntr.co.za> through Resend (processor already disclosed).


## 6 November 2026 — South African English and plain-language review

- **Pages reviewed:** Terms and Conditions, Privacy Policy, Affiliate Disclosure and Refunds.
- **Changes:** Refined page introductions and descriptions for clarity, applied South African English spelling where relevant, and clarified that commercial partners do not control Puntr's prediction assessments, editorial content or leaderboards.
- **Policy impact:** No new data processing, product capability, payment commitment, user obligation or legal right was introduced or removed. Existing policy substance and version references remain unchanged.
- **Counsel review:** Please review the wording refinements alongside the existing draft legal notices before approval.

## 8 Nov 2026: rewritten Founding Member emails and support inbox alerts
- **Emails (marketing, opted-in members only, one send per address, unsubscribe in every one):** welcome, launch checklist, Annual Pass offer, Founding Member survey (links to `/feedback`), referral invitation and launch countdown, all rewritten to match the live product (confirm email first, Annual Pass is reserve-then-pay by PayFast link within 48 hours, 1 December 2026 launch, football first). The referral email says referral bonus PuntPoints are "coming soon" and does not promise earnings. The survey email does not mention the R500 voucher draw because its rules are not yet published. No new processor or tracker; links carry `utm_` tags only, never personal data.
- **Support inbox alerts (support@puntr.co.za):** now also sent when a Founding spot is claimed (number, name, username, email), when an Annual Pass is reserved (name, email, pay-by time), when a survey is submitted (now includes the free-text comment, price view, username and whether follow-up is allowed) and when a prediction is reported. Each alert is sent once; the only thing stored for that is a dedupe key in `form_submissions`.
- **Pages to check `[attorney review]`:** `/privacy` (support inbox receives these alerts; survey comment now included in the alert), `/affiliate-disclosure` and `/terms` (referral wording stays "coming soon"). No legal page text changed in this PR.
- **Sending limits:** Resend's free plan allows 100 emails a day, so the senders stop at `EMAIL_DAILY_CAP` (default 90) and continue on the next run.

## 9 Nov 2026: Newsroom articles
- What changed: the three Newsroom articles were rewritten in full (author Michael C., publish dates 6, 7 and 8 Nov 2026) and the Newsroom pages now render them. No new data is collected, stored or sent.
- Pages: none of `/terms`, `/privacy`, `/cookies`, `/affiliate-disclosure` or `/refunds` needed changing.
- Counsel should look at: the Annual Pass article (R299 once-off, R99/month comparison, "saves R889", no auto-renewal) and the roadmap article ("not launching with" list, PuntPoints never cash). `[attorney review]`

## 9 Nov 2026: Default share image
- What changed: a new default Open Graph / Twitter image (`/og/puntr.png`) with the brand line, "18+ | T&Cs apply | Helpline 0800 006 008". No data collected; no legal page changed.

## 9 Nov 2026: Sign-up confirmation wording
- What changed: the post-sign-up card no longer says "Post your first pick before kick-off" (the platform is not live until 1 Dec 2026). It now states the launch date. CTA changed from "See predictions" to "See the roadmap". No legal page changed; this removes a claim the product did not match.

## 9 Nov 2026: Pre-launch copy sweep
- What changed: copy on home, community, predictions, how-it-works, Founding, pricing, rewards, matchday gate and sign-up now states that picks, the leaderboard and rewards open at launch on 1 Dec 2026, instead of implying they are live. Home hero now carries the owner's campaign positioning. No data collection changed; no legal page text changed. List of strings to flip at launch: `docs/launch-day-copy.md`.

## 9 Nov 2026: Annual Pass PayFast short links
- What changed: the Annual Pass payment redirect now also accepts PayFast's own short-link domain `payf.st` (https only). No new processor, no data collected, no legal page changed; PayFast was already the stated processor.

## 11 Nov 2026: Practice Mode and the R500 OTT voucher draw rules
- What changed: new `/practice` page for Founding Members (fictional league, practice points, demo rewards with masked DEMO codes, Practice Graduate badge). Practice data lives in separate `practice_*` tables, is never public (except username on the practice leaderboard), never converts to PuntPoints and is deleted with the account (`anonymise_account` updated). The draw rules are now published on `/feedback`: Founding Members only, 18+, must have tried Practice Mode at least once and submitted the survey with the draw box ticked, one entry each, closes when Puntr goes live on Tuesday 1 December 2026, one winner picked at random with a witness, announced by username and Founding number on puntr.co.za and socials, told by email or phone, R500 OTT voucher with no cash alternative. A Founding Member email (`founding-practice-1`) invites members to try Practice Mode, then leave feedback.
- Pages changed: `/privacy` (new Practice Mode row, version 2026-11-11-r11), `/terms` (section 6: practice points have no value; version 2026-11-11-r11), `/feedback` (draw rules). `notice_versions` rows added in migration `20261111213000_practice_mode.sql`. `/cookies`, `/affiliate-disclosure` and `/refunds` unchanged: no new tracker, processor or cookie.
- Counsel should look at (owner says no review is needed; marked per project rules `[attorney review]`): the draw is a promotional competition (Consumer Protection Act s36 and the National Gambling Act "free-to-enter" position); retention of practice data; the winner being published by username and Founding number.
- Staff exclusion line and "we may pick another winner" were added to the rules as standard terms, so the owner should confirm them.

## 11 Nov 2026: Draw admin screen
- What changed: admin-only `/admin` Draw tab to run the R500 OTT voucher draw (lists valid entries, picks one winner at random through a service-role-only database function, records witness and result in `practice_draw_log`). It cannot run before the draw closes (Tue 1 Dec 2026, 00:00 SAST). The winner's email and phone are shown to admins only; the announcement uses username and Founding number only, as the published rules say. No new data is collected and no legal page changed.

## 11 Nov 2026: Draw terms confirmed by owner
- What changed: no copy change. The owner confirmed (11 Nov 2026, 21:53 SAST) the two terms already published on `/feedback`: Puntr team members and their immediate family cannot enter, and if the winner cannot be reached we may pick another winner. The Draw admin screen (PR #80) is merged.
- Pages changed: none. Counsel retroactive review remains optional per the owner.
