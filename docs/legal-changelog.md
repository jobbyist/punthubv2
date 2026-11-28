## 2026-11-28, Tipster Support (Terms r26, Privacy 2026-11-28-tipster-support)

- **What changed:** new feature. A member who has passed identity verification and wins 10 picks in a row (first pick per match, wins below 1.40 settle odds don't count, any loss resets, voids skipped, matches played in the last 30 days) unlocks Tipster Support. The tipster sets PuntPoints prices per copied pick, weekly or monthly. Supporters (18+, good standing, account 14+ days old) get each new pick copied to a private Copied picks list with an in-app alert and an optional supporters-only note. Charges are held in escrow: per-pick charges release when the pick settles won/lost and are refunded if void or hidden; weekly/monthly charges release after the period once at least one pick copied in it has settled won/lost (waiting up to 14 days for unplayed matches), otherwise refunded in full. Platform fee 10% (0% for Puntr Pro tipsters) is burned. Free members can support 2 tipsters, Pro 10. 30-day cap 1,500 points; only transferable points; tipster receipts sit in the 7-day hold window.
- **Pages:** Terms §6 new paragraph (English and Afrikaans), "Last Updated" version r26; Privacy data table new row "Tipster Support" (English and Afrikaans). Notice versions in migration `20261128320000_tipster_support.sql`.
- **Review `[attorney review]`:** (1) points move between members in exchange for access to another member's picks: confirm this stays a loyalty-scheme feature (points never purchasable or cashable) and is not a paid tipping service or gambling under the National Gambling Act 7 of 2004 or provincial law; (2) whether paid tips need extra disclosure under the Consumer Protection Act (we state copied picks are opinion, not advice, and the charge does not depend on the result); (3) Pro-linked fee and limits; (4) the no-refund-for-current-period rule when a supporter stops a weekly or monthly plan; (5) identity verification as an eligibility gate; (6) retention of support records while the account is open.

## 2026-11-28, bookmaker profiles, member reviews and affiliate sign-up links (Privacy 2026-11-28-bookmaker-reviews)

- **What changed:** every bookmaker in `/bookmakers` now has a profile (popup on the directory, full page at `/bookmakers/<slug>`) showing licence details, deposit and withdrawal methods, popularity in South Africa (Semrush, October 2026), user-friendliness ratings and member reviews, each with its source and check date. Missing data is shown as "Not yet verified", never filled in.
- **New personal data:** signed-in members can rate a bookmaker (overall, ease of use, payouts, support; 1 to 5 stars) and add an optional comment of up to 600 characters (`bookmaker_reviews`). Reviews are public with the member's public display name or username; averages are shown per bookmaker. Members edit or delete their own; admins can hide a review. Nothing is sent to bookmakers.
- **Affiliate links:** a profile shows a "Visit <name>" sign-up link only when the bookmaker is a live partner in `public_affiliate_partners` (currently 1xBet and Hollywoodbets), labelled "Ad" with "18+ · T&Cs apply · 0800 006 008", revealed only after the session 18+ confirmation, `rel="sponsored nofollow"`, click tracked with `affiliate_partner_click` (placement `bookmaker_profile`).
- **1xBet:** added to the directory as an offshore entry (Curaçao Gaming Authority licence OGL/2024/1262/0493, Caecus N.V., verified on the CGA certificate). It is not on the NGB register. Its profile and sign-up box warn that betting with an operator without a South African provincial licence may not be lawful in the member's province.
- **Pages:** Privacy (new "Bookmaker reviews (optional)" row, English and Afrikaans, Last updated 28 November 2026); Affiliate disclosure (new paragraph on profile sign-up links and the offshore warning); `/bookmakers` intro copy no longer says Puntr provides no direct betting links. Notice version `privacy 2026-11-28-bookmaker-reviews` in migration `20261128310000_bookmaker_reviews.sql`.
- **Review `[attorney review]`:** (1) whether Puntr may promote 1xBet at all: CLAUDE.md requires a recorded provincial licence check before a bookmaker goes live, 1xBet holds only a Curaçao licence, and the National Gambling Act prohibits offering or advertising unlicensed interactive gambling to South Africans; the owner recorded it as "permitted to operate in South Africa" in the Affiliates tab, which we could not verify. (2) Consent as the lawful basis for public reviews, moderation (hide) and the defamation risk of member comments about named operators. (3) The Affiliate disclosure says ads are not shown to members who are on a break; Puntr has no in-product break flag yet, so neither the existing partner banner nor the new profile link can check it. (4) Payment and popularity data come from third-party review sites and Semrush estimates; confirm the attribution wording.

## 2026-11-28, referral FAQ aligned with recurring Pro commission (no notice version change)

- **What changed:** the Support FAQ answer "Can I invite friends?" no longer says "There are no cash payments for referrals", because Puntr now offers recurring commission to members who refer new paying Puntr Pro subscribers (10–30%, under the referral programme terms). The answer now separates invite PuntPoints (never cash) from Pro commission. English and Afrikaans.
- **Pages:** Support FAQ only. `/terms`, `/affiliate-disclosure`, `/referrals`, About, Pricing and Roadmap already described the programme. `CLAUDE.md` was updated so future work stops treating referrals as non-cash.
- **Review `[attorney review]`:** the programme agreement itself (tiers, thresholds, payout timing and tax treatment, clawback on refunds or chargebacks) is still pending. Until it is approved, copy must not state rates beyond "10–30% recurring" or payout dates.

## 2026-11-28, context-aware Discover and homepage (Privacy choices r3)

- **What changed:** Puntr now adapts Discover (the PWA start page) and other pages to the person using it: first-time and returning guests, new members with no pick yet, and active members see different headlines, primary buttons and tiles; members with favourites see their teams' matches first. Signals: (a) on-device only, in browser storage `puntr:context:v1` (visit count, first/last visit time, last eight Puntr paths without query strings, last match opened, tips hidden); (b) the member's own favourites and whether they have posted a pick (already stored; predictions are public).
- **Also listed:** `puntr:has-account` (sign-in form opens first on a device that has signed in) and `puntr:search:recent` (last six searches, from the header search shipped on 27 Nov).
- **Pages:** `/cookies` English and Afrikaans, Essential section. Notice version `tracking 2026-11-28-r3` (migration `20261128090000_tracking_notice_r3.sql`).
- **Review `[attorney review]`:** confirm on-device personalisation storage can sit under Essential (it is not sent anywhere and is not used for analytics or advertising) rather than behind a consent toggle.

## 2026-11-28, team crests sourced from SofaScore (no notice version change)

- **What changed:** club crests shown next to team names are now taken from the team's public SofaScore page (Wikipedia/Wikimedia stays the fallback) and copied into Puntr's own storage. No personal information is involved.
- **Pages:** none changed. The Terms do not describe crest sources, and the crests are shown only to identify clubs.
- **Review `[attorney review]`:** (1) whether SofaScore's terms allow automated retrieval and reuse of their crest images, or whether a licence or attribution is needed; (2) club crests are trademarks: confirm identification-only use next to fixtures and tables is acceptable, and whether a trademark notice belongs in the Terms.

## 2026-11-28, Team directory follows (Privacy 2026-11-28-team-follows)

- **What changed:** members can follow teams in the new team directory (`/teams`). Puntr stores the teams a member follows (`team_follows`) and an append-only follow/unfollow log (`team_follow_events`). Followed football teams are mirrored into the existing favourites (`member_preferences.teams`, max 10) to order the member's Matchday card.
- **Who sees what:** the member sees their own follows on `/account` and can unfollow there or in the directory. The public sees only an anonymous follower count per team (shown from 3 followers). Admins see totals and the most-followed teams in Admin > Analytics, never a list of who follows whom.
- **PFIE learning:** only for members with separate PFIE-learning consent, a follow or unfollow is recorded as a pseudonymous learning event (`team_followed` / `team_unfollowed`: sport, team name, source). No consent, no event.
- **Export:** the account data export now includes team follows and the follow log.
- **Pages:** Privacy (Favourites row renamed "Favourites and followed teams", PFIE learning row), English and Afrikaans; notice version `2026-11-28-team-follows` in migration `20261128080000_team_follows.sql`.
- **Review `[attorney review]`:** confirm consent as the lawful basis for follows, the public anonymous follower count, admin aggregate analytics, retention of the follow log while the account is open, and the Afrikaans wording.
## 2026-11-27, simpler sign-up flow (no notice version change)

- **What changed:** the first sign-up screen no longer shows a separate "I am 18 or older" checkbox. The line under the form now reads "By continuing you confirm you're 18 or older, agree to the Terms and have read the Privacy notice." The binding age check is unchanged: the profile step still asks for year of birth and an unticked "I am 18 or older" box plus Terms acceptance before any profile is created, and under-18 sign-ins are still discarded. Marketing consent stays as two separate, unticked, optional boxes.
- **Defaults:** new members are offered the passwordless email code first (a password is still one tap away); `/join` opens on Sign in on a device where someone has signed in before (a `puntr:has-account` flag in local storage, no personal data).
- **Pages:** none changed; Terms and Privacy already describe the profile-step age confirmation.
- **Review `[attorney review]`:** confirm that a continue-means-agree line at the email step plus the profile-step checkboxes is sufficient age attestation and Terms acceptance.

## 2026-11-23, PayFast payment disclosures and Brand Ambassador applications (Terms r24, Privacy r22)

- **Payments:** Terms, Privacy and Refunds now describe PayFast by Network as the current payment processor, the transaction details Puntr receives, and the fact that Puntr does not receive or store full card or bank credentials. Ozow is identified as planned but not integrated or available at checkout.
- **Paid features:** Terms and Refunds now describe PAYG credit purchases, monthly Puntr Pro renewal/cancellation and the separate once-off Founding Annual Pass. Refund requests remain subject to the checkout terms and applicable law. No new refund entitlement is promised by this wording.
- **Ambassador applications:** the public multi-step application collects contact, location, audience/profile links, content examples and application answers. Submissions are stored in `form_submissions` and emailed through Resend to `partners@puntr.co.za`. Privacy notice updated to describe the data, purpose and retention approach.
- **Notice versions:** Terms r24 and Privacy r22 are recorded in migration `20261123010000_terms_r24_privacy_r22_payment_processing.sql`.
- **Counsel review:** confirm PayFast by Network processor wording, POPIA purpose/retention for ambassador applications, payment and subscription cancellation language, and refund wording before treating these pages as final legal advice.

## 2026-11-22, Terms operator name consistency (Terms r23)

- **Correction:** the limitation-of-liability clause in both English and Afrikaans now names Gravitas Industries (Pty) Ltd,
  rather than the retired Puntr company name. Terms notice version r23 recorded in `notice_versions`.
- **Review `[attorney review]`:** counsel to confirm the operator is consistently identified as the contracting party
  and that the liability limitation is enforceable as drafted.

## 2026-11-22, Gravitas operator disclosure and new-signup support alerts (Terms r22, Privacy r20)

- **Operator:** Puntr South Africa is operated by Gravitas Industries (Pty) Ltd (CK No.: 2024/596436/07), a South
  African-registered company. English and Afrikaans Terms, Privacy, Cookies, Affiliate Disclosure and Refunds now
  identify the operator. Footer copyright was corrected to the operating company.
- **Signup alert:** on every new Supabase Auth account insert, a database trigger queues a service email to
  `support@puntr.co.za` with the new account email, account ID and SAST registration time. It is sent through the
  existing email outbox and Resend quota controls; a signup is not blocked if alert queuing fails. Events are
  deduplicated by Auth user ID. The Privacy Policy now describes the alert data and internal recipient.
- **Notices:** Terms `2026-11-22-r22`; Privacy `2026-11-22-r20`, recorded in `notice_versions`.
- **Review `[attorney review]`:** confirm the contracting-party and POPIA responsible-party wording, Information
  Officer details/registration, retention of internal support alerts, and the English/Afrikaans translations before
  treating either legal page as approved.
 
# Legal changelog (for the owner and counsel)

One entry per PR that changes the legal copy or should have. Newest first. "Review" lists what counsel should look
at. Everything is a draft until approved; approvals are recorded here once given.

## 2026-11-23, internal synthetic QA telemetry (no public legal text changed)

- Added service-role-only experiment tables for synthetic persona definitions, read-only browser sessions, fixture research outputs and a capped API budget ledger. The 50 persona records contain no real names, email addresses, phone numbers or account identifiers. The production browser runner is guest/read-only and does not create Auth users, founding memberships, public picks, rewards, referral records or campaign conversion events. Parallel receives public fixture/team/competition context only; no member or customer personal data is sent.
- No public Privacy or Terms wording changed because this is an internal QA-only dataset and does not collect real member activity. `[attorney review]`: confirm this internal operational telemetry and use of the existing Parallel processor do not require a public notice amendment under POPIA or the existing processor disclosure.
- The experiment is seeded as paused. No migration has been applied to the live database and no scheduled production runs are enabled by this PR.


## 2026-11-15, Season archive import (PR: feat/season-archive-import), no page changed

- **Product:** past and current league results (10 domestic leagues, seasons 2024/25 to 2026/27) are imported from
  two public full-season pages per league: FBref's "Scores & Fixtures" page and the Wikipedia season article's
  results matrix. A score is stored only when both pages agree; each stored result lists `fbref.com` and
  `wikipedia.org` as its sources (shown on `/results` like other season results). For the current season the
  Wikipedia league table replaces the stored table only when it matches the verified results exactly. No personal
  data is involved; no AI service sees anything.
- **Volume:** about 60 page reads once (Parallel Extract), then about 10 a day for the current season.
- **Pages:** none. The Terms already describe third-party data sources for fixtures and results.
- **Review `[attorney review]`:**
  - FBref (Sports Reference) terms of use restrict automated collection and commercial reuse of their data. Scores
    are facts, but the terms are a contract question. If counsel says no, remove `fbref` from
    `src/lib/pfie/archive.ts` and use another dated source (one constant per league).
  - Wikipedia text is CC BY-SA; we store only scores (facts), with attribution in the source list.

## 2026-11-15, Pre-match reference odds and "odds unverified" (PR: feat/odds-reference), Terms r21, Privacy r19

- **Product:** before kick-off Puntr collects market reference prices (1X2, over/under 2.5, both teams to score)
  from public pages of licensed South African bookmakers, at most twice a day, never in-play. The price shown is the
  median across bookmakers, labelled "Market reference, as at HH:MM"; no bookmaker name or link is shown. It is
  returned only to signed-in members who are 18+ attested, not on a break and not suspended (enforced in the
  database). Members still enter their own odds on every pick; those stay on the pick and in its hash.
- **Check:** if a member's odds are more than 25% above the reference when they post, the pick is saved as entered
  and marked "odds unverified"; its units and the weekly leaderboard's 1.50 minimum use the lower price. Points for
  correct picks are unaffected. An admin can clear or set the mark with a reason (logged in `admin_actions`); picks
  stay append-only.
- **Data:** `market_odds` (fixture, market, selection, price, source domain and URL, time; no personal data, service
  role only); `predictions.reference_odds` and `odds_unverified`; `prediction_odds_overrides` (admin corrections).
- **Pages:** Terms §4 new paragraph "Odds on predictions" (r21, English and Afrikaans). Privacy data table, picks row:
  the reference price and the unverified mark are stored and shown with the pick (r19, English and Afrikaans).
  `notice_versions` rows in migration `20261115031000`, applied after the copy is live.
- **Review `[attorney review]`:**
  - Reading bookmakers' public pages automatically: check each site's terms of use (list in
    `src/lib/odds/reference.ts`, `ODDS_SOURCE_DOMAINS` overrides it) and record the provincial licence check.
  - CLAUDE.md bans odds *comparison* at launch: we show one reference price, never a per-bookmaker table.
  - Hollywoodbets 2.10 (approved material only): no bookmaker names or logos next to reference prices.
  - Applying the lower price to "odds unverified" picks after they are posted: is the Terms wording enough notice?
  - Whether a reference price shown to members counts as gambling advertising (it carries no link or brand).

## 2026-11-14, Puntr Pro recurring billing (PR: feat/puntr-pro-billing), built OFF, no page changed yet

- **Product:** Puntr Pro at R99 a month through a PayFast subscription (monthly, until cancelled). Each paid month
  adds one month of Pro plus a 3-day grace period; a failed renewal or a cancellation stops renewals and Pro runs to
  the end of the paid period. Members cancel in `/wallet` (Puntr cancels at PayFast through its API). Pro includes AI
  actions up to a fair-use limit (default 90 a month, 15 a day, editable in `app_settings`); past it an action costs
  credits like Pay-As-You-Go. Paid Founding Annual Pass claims get 12 months of Pro from 1 Dec 2026 (as already
  promised on `/pricing` and `/terms`), same default limit.
- **Data:** tables `pro_subscriptions`, `pro_payments`, `pro_usage` (migration `20261114230000`). PayFast receives
  only the subscription id, amount and item name; no personal information. The subscription token is stored to allow
  cancellation. Subscriptions and payments are financial records kept after account deletion (linked to the
  anonymised profile id); `pro_usage` is deleted with the account.
- **Off until go-live:** same switch as the credit packs (`payments_enabled` + PayFast variables). No legal page is
  changed in this PR because nothing can be bought yet.
- **Copy to publish before switching on `[attorney review]`:** `/terms` (auto-renewal monthly until cancelled; how to
  cancel; access to the end of the paid period; fair-use limit and what happens past it; price changes with notice),
  `/refunds` (ECTA s44 seven-day cooling-off for the first payment; no pro-rata refund after that unless the law
  requires; failed renewals), `/privacy` (PayFast as payment processor for subscriptions; token kept; retention of
  payment records), `/pricing` (no longer "planned"; fair-use line).
- **Annual Pass fair use (owner decision 14 Nov, 20:16 SAST):** Terms r20 (English and Afrikaans) now say the
  Annual Pass includes AI actions up to 40 a month and 15 a day, past which an action uses credits; every other Pro
  feature is unlimited. `pro_cap_annual_pass = 40`. `notice_versions` terms r20 (migration `20261114231000`).
  `[attorney review]`: adding a limit after the pass was sold (4 holders; the limit starts with Pro on 1 Dec, and
  no AI feature had been promised in numbers); consider telling holders by email before 1 Dec.
## 2026-11-14, Fixtures surfacing and season results backfill (PR: feat/fixtures-and-history), no page changed

- **Product:** the daily PFIE fixture sync now writes each competition as soon as it is verified, in several short
  calls from 03:00 SAST (one long call had been timing out before it wrote anything). A time stated with a zone by
  one established sports outlet is accepted when another site lists the same match on the same date. Fixtures are no
  longer hidden when a team's badge has not been found yet (initials show until it is); `VITE_TEAM_BADGES_REQUIRED=true`
  restores the strict rule. New season backfill reads past final scores (this season, then last season) and keeps
  a score only when the competition's own site or two different sites agree; `/results` gains a "Season results"
  list that names the confirming sites for each score.
- **Data:** public sports facts only (teams, dates, scores, source domains). No personal information is collected,
  sent to Parallel or Gemini, or shown. No new processor: Parallel, Firecrawl and Gemini were already listed.
- **Legal pages:** none changed; `/terms`, `/privacy`, `/cookies`, `/affiliate-disclosure`, `/refunds` still match.
- **Review:** `[attorney review]` showing third-party match scores with the source domain named (factual data, no
  text or logos copied); team initials in place of crests are original rendering, not a club mark.

## 2026-11-14, Betting slips (PR: feat/bet-slips), Terms and Privacy r18

- **Product:** members can add a bookmaker slip by typing it, pasting its text or uploading a photo, review and edit
  every field, save it as a private draft, then publish. Each leg on a Puntr fixture with a supported market (match
  result, double chance, BTTS, over/under 2.5) becomes a normal pick through `create_prediction` (launch gate, 18+,
  limits and grading unchanged); other legs are "tracked only". Published slips are frozen. Up to 20 published slips
  a day. Tables `bet_slips`, `bet_slip_legs`, `slip_parses`; private storage bucket `slips` (migration
  `20261114150000_bet_slips.sql`).
- **Privacy design:** photos are re-encoded in the browser (drops EXIF/location) and read on the device with
  self-hosted tesseract.js; no image goes to an AI service. Slip text is scrubbed of detectable personal details in
  the browser and again on the server (emails, SA phone numbers, 8+ digit runs, lines labelled name, username,
  balance, account, ID, mobile and similar). Only if the deterministic parser finds no legs is the scrubbed text sent
  to Google Gemini (Flash-Lite first, through the existing quota guards; at most 20 AI-assisted reads per member per
  day). Photos are private to the owner and deleted after 30 days by the daily `slip-images` job. The bookmaker is
  visible only to the owner; stake and return are hidden on published slips unless the member opts in.
- **Pages:** `/privacy` data table ("Betting slips (optional)") and §6 processors paragraph (on-device reading,
  scrubbing, Gemini fallback); `/terms` §6 new Betting slips paragraph; both version 2026-11-14-r18 (English and
  Afrikaans in `src/content/legal/af/`). `notice_versions` r18 in `20261114150100_notices_r18.sql`, applied after
  the copy is deployed. `/cookies`, `/refunds`, `/affiliate-disclosure` unchanged (no new cookies, payments, partner
  links or partner content).
- **Review [attorney review]:**
  1. Whether sending scrubbed slip text to Gemini fits the "never send personal data to AI services" commitment.
     Scrubbing is pattern-based, so an unlabelled name on a slip could get through; the copy says "personal details
     we can detect" and asks members to cover their name and balance.
  2. Showing bookmaker names: shown only to the slip owner, never as a link or promotion, never on public slips. Is
     that consistent with the affiliate rules (only `live` partners may be promoted) and the Hollywoodbets terms?
  3. Stake and return amounts on public slips when the member opts in: is publishing a member's own stake a
     gambling advertisement or inducement concern?
  4. Retention: slip photos 30 days; published picks stay with the anonymous account after deletion.

## 2026-11-14 (15:00 SAST), Duel stakes switched on

- **Owner decision:** counsel has reviewed and approved PuntPoints stakes on Community Duels. `duels_stakes_enabled`
  set to `true` in production (migration `20261114130000_duel_stakes_on.sql` records it).
- **Pages:** no change. Terms r16 already describe stakes "when staking is switched on", with the limits.
- **Approval recorded:** item 1 of the 2026-11-14 Community Duels entry (gambling/wager question) approved by
  counsel per the owner.

## 2026-11-14, Favourites and member Matchday card (PR: feat/matchday-favourites), Privacy r17

- **Product:** members can save favourite sports, competitions and teams in their account (`member_preferences`,
  RLS own-row only). The signed-in home shows a Matchday card ordered by those favourites instead of the illustrative
  preview. Nothing is shown to other members or shared.
- **Pages:** `/privacy` data table "Favourites (optional)" row, version 2026-11-14-r17 (English and Afrikaans),
  `notice_versions` privacy r17 (migration `20261114090000_member_preferences.sql`). Terms unchanged (no new promise).
- **Deletion:** preferences are deleted when the account is deleted (trigger on anonymisation).
- **Review [attorney review]:** consent as the basis for an optional personalisation setting; no profiling beyond
  ordering the member's own fixtures.

## 2026-11-14, Community Duels (PR: feat/h2h-duels), Terms and Privacy r16

- **What changed in the product:** members can challenge another member (or post an open challenge) on an upcoming
  football match with 2-3 calls. Calls are hidden until kick-off, then public with usernames. Other members can vote
  "who called it better" (only totals are shown). Optional PuntPoints stakes are held in escrow in the PuntPoints
  ledger and paid to the member with more correct calls; ties, void matches and unaccepted challenges are refunded.
  Duel XP (win 3, draw 1) ranks a separate Duel leaderboard; PuntPoints never affect its order.
- **Stakes are OFF** (`duels_stakes_enabled = false` in Admin > System) until the owner decides with counsel.
  Friendly duels work without stakes.
- **Pages:** `/terms` section 6 (new Duels paragraph), `/privacy` data table ("Community Duels (from launch)" row),
  both versions 2026-11-14-r16, the Afrikaans copies in `src/content/legal/af/`, `notice_versions` r16 (migration
  `20261114080000_h2h_duels.sql`). `/cookies`, `/refunds`, `/affiliate-disclosure` unchanged (no new cookies,
  payments or partner content).
- **Review [attorney review]:**
  1. Whether staking PuntPoints (redeemable for vouchers and perks) on a match outcome between members is
     "gambling" or a "wager" under the National Gambling Act 7 of 2004 and provincial law, even with no cash value
     and no cash-out. This is why stakes ship switched off.
  2. Anti-abuse wording (collusion, multiple accounts) and the reuse of the transfer safeguards (14-day account,
     invite and recent points excluded, daily cap, per-pair weekly cap).
  3. Public display of calls with usernames from kick-off; vote counts only.
  4. Retention on deletion: open challenges cancelled, active duels voided and refunded, votes deleted, settled
     duels kept with the anonymised account.

## 2026-11-14, Afrikaans translations and Cookies page (PR: multi-language, Afrikaans)

- **Owner decision (14 Nov 2026):** translate every page into Afrikaans, including the legal pages; review in a new Admin > Translations tab; isiZulu shown as "Coming soon"; isiXhosa dropped.
- **Translated legal pages:** Afrikaans versions of `/terms`, `/privacy` (both version 2026-11-13-r15), `/cookies`, `/refunds`, `/affiliate-disclosure` and `/privacy/request`, each with a notice: "This is a translation of the English page. If the two differ, the English version applies." The English text is unchanged. `[attorney review]`: accuracy of the legal translations; whether the precedence notice is enough under the Consumer Protection Act's plain-language rules (s22) for an Afrikaans-speaking consumer; `[attorney review]` markers are carried over untranslated.
- **Not public yet:** Afrikaans is visible only to admins (preview) until a native speaker signs it off in Admin > Translations.
- **`/cookies` (English and Afrikaans):** new essential cookie listed: `puntr_lang_preview` (30 days), set only when an admin previews a language in review. No new `notice_versions` row: it is an essential, admin-only cookie and does not change what visitors consent to. `[attorney review]`: confirm no tracking-notice version bump is needed.
- **`/pricing`:** the Founding Annual Pass box said "payment opens before launch" and "does not charge you today", which no longer matched the product (reservation is free, then a PayFast link must be paid within 48 hours). It now says exactly that, matching `/terms` section 4 and `/founding`.
- **Admin data:** `translation_reviews` and `translation_signoffs` hold reviewer decisions, suggested wording, notes and the reviewer's admin id and signed name (admin-only, logged in `admin_actions`). Covered by the existing "Account administration" row in `/privacy`; no member data.
- Privacy and Terms text: not changed. Affiliate disclosure and Refunds text: not changed.

## 2026-11-14, no legal page text changed (PR: QA audit, UI polish, Gemini fallbacks)

- **What changed:** visual and layout work across the site (page banners with decorative motion graphics, new fixture, result, leaderboard and community card designs, empty and loading states), one copy fix (the Insights page no longer offers a "beta group" that does not exist; the button now opens the roadmap), and three more free-tier Gemini models as fallbacks for article drafting and fixture extraction.
- **Data:** nothing new is collected, stored, shown or sent. The Gemini fallbacks receive the same non-personal inputs as the existing models (organisation facts, public match pages); `CLAUDE.md`'s rule that no personal data goes to AI services still holds.
- **Database (migration `20261114030000_qa_public_reads_gemini_fallbacks.sql`):** restores the public read path the product already promises: signed-out visitors can see public usernames, display names, Founding numbers and avatars of non-banned members (through `public_profiles`) and non-moderated picks (through `visible_predictions`), as `/privacy` already describes for public profiles and the public record. Team badge and quest lists become readable to signed-out visitors again (they were failing on a permission check). No new columns are exposed.
- Privacy, Terms, Cookies, Affiliate disclosure, Refunds: not changed. Nothing for counsel to review.

## 2026-11-13, Privacy and Terms r15 (PR: no rewarded social follows; reward funding)

- **Owner decision:** remove any incentive that could put Puntr's social media pages at risk. Instagram, Facebook, X and TikTok quests no longer pay points; they are plain "visit" links. Open submissions for them were closed without points. WhatsApp and Telegram community groups keep their quests.
- **Terms (r15), section 6:** quests list "joining Puntr's WhatsApp or Telegram community"; community groups checked by our team; "Following or liking Puntr's social media pages never earns points."
- **Privacy (r15):** "Get-started quests" row now names the WhatsApp name or Telegram username only.
- **Rewards funding:** each reward is marked as funded by Puntr, a sponsor or a partner (Admin > Rewards); the catalogue shows "Reward from Puntr", "Sponsored by X" or "In partnership with X" (sponsor links carry `rel="sponsored"`).
- `notice_versions` r15 rows in migration `20261113233000_social_quests_reward_funding.sql`.
- Review `[attorney review]`: WhatsApp (Meta) group joins still earn points; confirm WhatsApp's business/community terms allow this.

## 2026-11-13, no legal page text changed (PR: motion, preloader, light/dark mode)

- **What changed:** branded preloader (once per browser session), route loading bar, light/dark mode switch, animated hero backgrounds, club-badge strip and scroll reveals on marketing and sports pages.
- **Storage:** the theme choice is kept in the browser's localStorage (`puntr-theme`) and "preloader shown" in sessionStorage (`puntr-preloaded`). Both are strictly necessary/functional preferences, never sent to Puntr or anyone else. `[attorney review]`: whether `/cookies` (Privacy choices) should list these two browser storage keys under functional storage.
- Privacy, Terms, Affiliate disclosure, Refunds: not changed.

## 2026-11-13, Privacy and Terms r14 (PR: onboarding quests and profile completion)

- **Terms (`/terms`, 2026-11-13-r14), section 6:** new paragraph on get-started quests: one-off PuntPoints per quest, paid only after a check (system, device, or our team for social follows); points for turning on updates are kept if updates are switched off later (no need to stay opted in); refusal/reversal for false usernames, multiple accounts or abuse; quests and points may change.
- **Privacy (`/privacy`, 2026-11-13-r14):** new row "Get-started quests": quest progress, points, and the social username/display name a member gives us, checked by our team on that platform. Social usernames are deleted 90 days after the check and straight away when the account is deleted (pg_cron `quest-evidence-purge`, daily).
- **Product:** 15 quests (13 live; install app and push notifications switch on with the PWA work). Profile completion tracker on `/account`. Quest checklist on the sign-up done screen and `/account`. Admin > Quests review queue; approvals and rejections go to the admin action log.
- `notice_versions` r14 rows in migration `20261113230000_onboarding_quests.sql`. Cookies, Affiliate disclosure, Refunds: not changed.
- Review `[attorney review]`: (1) POPIA s11 and the Consumer Protection Act on giving points for turning on marketing email and WhatsApp/SMS: consent must stay voluntary and specific, which is why points are kept if consent is withdrawn; (2) points for social follows/likes and the platforms' own promotion rules (Meta, X and TikTok restrict incentivised likes/follows in some cases); (3) "install the app" and "push on" are reported by the member's device and can't be fully proven; (4) 90-day retention for social usernames.
## 2026-11-13, Privacy and Terms r13 (PR: rewards catalogue)

- **Terms (`/terms`, 2026-11-13-r13), section 6:** names the catalogue types (OTT vouchers, Pay-As-You-Go credit packs, free Puntr Pro passes, Puntr and sports merchandise, match tickets); redemption opens at launch on 1 December 2026 (preview before); costs and stock may change; how each type is delivered; Pro passes never renew or bill; physical rewards and tickets to SA addresses only; tickets depend on availability and exclude travel; rewards provided by Puntr or partners.
- **Privacy (`/privacy`, 2026-11-13-r13):** new row "Reward delivery (from launch)": redemptions, and delivery details sent by email for physical rewards and tickets (name, address, phone, size or club, ticket holder names). Retention proposed: 12 months after delivery.
- **Product:** 16 starter rewards seeded (proposed points costs, owner edits in Admin > Rewards), public preview on `/rewards`, redemption refused before launch (`not_yet_available`) except for admins testing.
- `notice_versions` rows in migration `20261113220000_rewards_catalogue.sql`. Cookies, Affiliate disclosure, Refunds: not changed.
- Review `[attorney review]`: (1) OTT is a third-party brand: use of the name and whether a reseller/partner agreement is needed before listing; (2) club scarves/jerseys and match tickets use club and league marks, and PSL ticket resale/transfer rules; (3) Puntr funding rewards itself (CLAUDE.md said sponsors unless the owner decides otherwise; the owner asked for this catalogue on 13 Nov): any Consumer Protection Act promotional-competition or loyalty-programme rules; (4) the 12-month retention for delivery details.

## 2026-11-13, no legal page text changed (PR: real team badges)

- **What was added:** every team in fixtures and results shows its real club badge. Badges are found with Parallel Search (the club's Wikipedia article), the crest is checked and copied to Puntr's own storage, so visitors' browsers never load images from third parties. Fixtures and results whose teams have no verified badge are hidden until one is verified or set by an admin.
- **Data:** no personal data. Parallel receives only team and competition names.
- Review `[attorney review]`: (1) displaying club crests (trademarks) next to fixtures, predictions and results as nominative/identifying use, including whether any league or club (e.g. PSL, Premier League) restricts crest use by prediction or tipster sites; (2) crests copied from Wikipedia are usually non-free logos there (used on Wikipedia under fair use), so Wikipedia is a source, not a licence.

## 2026-11-13, no legal page text changed (PR: branded auth emails, password reset)

- **What changed:** Supabase Auth emails (sign-up confirmation, passwordless sign-in code, password reset, email change, invite, re-authentication, and security notices when a password, email, sign-in method or two-step verification changes) are now rendered by Puntr and sent through Resend from "Puntr - South Africa <support@puntr.co.za>" instead of Supabase's default sender. New `/reset-password` page (forgot password) and `/auth/confirm` page for email links.
- **Data:** the member's email address and a one-time code/link go to Resend, which `/privacy` already lists for sending email. Nothing new is collected or stored by Puntr; codes and addresses are never logged.
- Security notices are service messages (no unsubscribe), sent for every sign-in change.
- Privacy, Terms, Privacy choices, Affiliate disclosure, Refunds: reviewed, not changed. Review: none.
## 2026-11-13, no legal page text changed (PR: admin notifications composer)

- **What was added:** admins can send in-app notifications (the header bell) by hand to all members, Founding Members only or one member, with an optional link and schedule, see read counts and withdraw a notice. Founding-only notices are hidden from other members by the database.
- **Data:** no new personal data. The admin who sent each notice is recorded for the admin action log; read state was already stored.
- `/privacy` already covers this under "Account administration" ("messages we send you"). Terms, Privacy choices, Affiliate disclosure and Refunds: not changed.
- Review: none. Marketing-style notices in the bell are in-app only; email still follows the opt-in rules.
## 2026-11-13, no legal page text changed (PR: Annual Pass bank transfers)

- **What was added:** admins can record Founding Annual Pass payments made by bank transfer (EFT) and match them to a member. They count toward the 20-pass cap, so the public counter shows 16/20 after the 4 transfers the owner confirmed.
- **Data:** payer label as it appears on the bank statement, optional amount, bank reference and date, visible to admins only. No bank account numbers are stored. Matched transfers mark the member's pass as paid, as a PayFast payment would.
- Review `[attorney review]`: whether `/privacy` should name "bank transfer details you send us for the Annual Pass" in the payments row (today it names PayFast only). Terms, Privacy choices, Affiliate disclosure and Refunds: not changed.

## 2026-11-13, Privacy and Terms r12 (PR: platform controls, wallet, newsroom desk)

- **Privacy (`/privacy`, version 2026-11-13-r12):** two new rows in the data table: "Wallet (from launch)" (balances, history, PuntPoints sent and received with the other member's username, amount, note and time) and "Account administration" (account type, access granted for testing, warnings, suspensions or paused features with the reason, admin messages, and the admin action log). Section 6 now names Parallel, Firecrawl and Google Gemini as services that read public web pages and Puntr's approved project updates for newsroom articles and fixtures, with no personal data.
- **Terms (`/terms`, version 2026-11-13-r12):** section 6: PuntPoints can be sent to another member from launch within published limits; transfers are final; selling, buying or moving points between own accounts is not allowed. Section 10: credits unlock features one use at a time, cannot be sent to another member or exchanged for cash; credits given by Puntr carry no refund right. Section 18: warnings, paused features and time-limited suspensions short of termination.
- **Product changes behind it:** launch gate (live features for admins and invited testers only until 1 Dec 2026 00:00 SAST), admin portal (members and account controls, action log, analytics, newsroom desk, system and API limits), wallet (PuntPoints transfers with limits, PAYG credit ledger, nothing on sale yet), Practice Mode demo wallet (demo credits with no value), email outbox (admin messages and notices, sent within the daily email cap), AI label and cited sources on AI-assisted articles, generated article covers, daily sports articles no longer notify every member.
- **Deletion:** when an account is deleted, warnings, queued emails and access grants are removed. Transfer records stay, linked to the anonymous account, so the other member's history stays correct; the admin action log stays for audit.
- `notice_versions` rows added in migration `20261113170000_platform_controls_wallet.sql`. Cookies, Affiliate disclosure and Refunds: reviewed, not changed.
- Review `[attorney review]`: (1) PuntPoints transfers between members: points can buy betting vouchers, so transfers may move gambling-promotion value between people; limits, holds and the ban on referral-point transfers are meant to stop farming; (2) whether a transferable loyalty point raises any stored-value or e-money question (no cash in or out exists); (3) keeping transfer records and the admin log after deletion; (4) wording of warnings, suspensions and paused features in Terms; (5) the AI label on articles; (6) admin messages by email: service notices go to everyone, marketing only to members who opted in.

## 2026-11-13, no legal page text changed (PR: competition scoring and points leaderboards)

- **What was added:** a competition points score per member (3 points for a correct match-result pick, 2 for both-teams-to-score and over/under 2.5, 1 for double chance, 2 for handicap), a points leaderboard on `/leaderboards` showing username, profile picture, points, accuracy and pick counts, and badges for the invented Practice Mode clubs.
- **Data:** the score is calculated from picks and results the platform already stores and already shows publicly. No new information is collected from members. The leaderboard shows only username and profile picture, both already public on profiles. Banned members and hidden picks are left out.
- The board states that points rank members only, are not PuntPoints and have no cash value. No prize is attached.
- Privacy, Terms, Privacy choices, Affiliate disclosure and Refunds: reviewed, not changed. No `notice_versions` change.
- Review `[attorney review]`: (1) whether Terms should describe competition points and how a corrected result re-scores a pick; (2) whether the Privacy table should list the derived score next to picks; (3) if a prize is ever attached to this leaderboard it becomes a promotional competition and needs rules first.

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
- New limited Founding Annual Pass offer: the first 20 founding members to claim it before 30 November 2026 (23:59 SAST) reserve 12 months of Puntr Pro for a once-off R299, starting 1 December 2026, no auto-renewal. A claim takes no payment. It is stored in `annual_pass_claims` (account ID, time). The 12:00 campaign email and `/founding` carry the same terms. Terms §4 and Privacy §4 updated.
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

## 13 Nov 2026 (evening): missing database privileges fixed (migration 20261113180000)
- What changed: table privileges only. Signed-in members can now read their own notifications and ID-check status (the policies already limited them to their own rows), and the server can write notifications and save newsroom articles. TRUNCATE, REFERENCES and TRIGGER removed from client roles on every table.
- Pages: none. Nothing new is collected, stored, shown or sent; the product now does what the pages already describe.

## 2026-11-13: Mobile-friendly fixture cards

- What changed: layout only. Fixture and result cards (home, predictions, results, pick cards) now stack badge above team name on phones.
- Pages: none needed. No change to what is collected, stored, shown, sent or promised.
- Counsel: nothing to review.

## 2026-11-14: Logos/Branding admin and footer logo strip

- What changed: admin-only Logos/Branding tab (upload, resize, compress, choose placement, activate). A footer strip can show regulator, payment and partner logos; the Bookmaker Directory and About page can use uploaded images. Every logo starts inactive and nothing shows publicly until the owner uploads and activates it. No new data is collected from visitors; the logo list is a public read of active rows.
- Pages: none changed. `[attorney review]`: showing a regulator's or payment provider's logo can imply endorsement or a relationship; showing a bookmaker logo is an affiliate creative (Hollywoodbets terms: partner-issued, unaltered creatives only; no partner is Live yet). The admin tab warns about both. Counsel should confirm wording of the footer label ("Regulators, payment and technology partners") before any logo is activated.

## 2026-11-14: Endorsements admin and outreach emails

- What changed: admin-only Endorsements tab to track organisations (regulators, foundations) Puntr is asking for guidance or endorsement, with status, reasons and history, Gemini-drafted outreach and follow-up emails, and sending through Resend from michael@puntr.co.za or partners@puntr.co.za. Tables `endorsement_orgs`, `endorsement_emails`, `endorsement_events` are admin-only (no policies; service role through admin-checked server functions). No member data is stored or sent. Gemini receives only organisation facts and Puntr's fact sheet, never a contact person's name. Each email carries a signature and a "reply stop" line; one email per organisation per 24 hours; do-not-contact is enforced.
- Pages: none changed. Business contact details of third-party organisations are stored. `[attorney review]`: whether `/privacy` should say Puntr keeps business contact details of organisations it corresponds with (POPIA covers named individuals at them); the opt-out line in B2B outreach (ECTA s45); sender identity "Michael from Puntr" / "Puntr Partners" for Puntr (Pty) Ltd.

## 2026-11-14: Founding Annual Pass close date moved to 30 November 2026 (migration 20261114170000)
- What changed: the Annual Pass offer (first 20 founding members, R299 once-off, 12 months of Puntr Pro from 1 December) now closes at 23:59 SAST on 30 November 2026 instead of 16 November 2026 (owner decision, 14 Nov). Cap, price, hold period and benefits are unchanged. `annual_pass_offer()` and `claim_annual_pass()` carry the new deadline; the claim card, Founding copy, admin label and the expiry email use it.
- Pages: `/terms` (version 2026-11-14-r19, English and Afrikaans), `/refunds` (English and Afrikaans), Founding claim copy. New `notice_versions` row: terms 2026-11-14-r19.
- Counsel should look at `[attorney review]`: extending a stated offer period after it was published (members who saw "16 November"); the owner has decided this and the change only extends the period.
- Note: the scheduled Annual Pass promotion emails still stop at 15 November. They were not extended.

## 2026-11-14: PAYG credit packs through PayFast built (migration 20261114200000), switched off
- What changed: code and database for buying credit packs (R25, R60, R120) through PayFast. `payment_orders` stores the member, pack, amount and status; credits are granted on a verified PayFast notification. No personal information is sent to PayFast. Nothing is live: `payments_enabled` is false. One credit price list (AI preview 5, deep stats 2, match insight 2) now matches `/pricing` in the database.
- Pages: none changed yet, because the product does not take payments yet. `[attorney review]` before the switch is turned on: `/terms` (purchase and credit terms), `/privacy` (PayFast as operator, payment records kept), `/refunds` (credits are not refundable as cash; unused credits and failed payments), `/pricing` ("planned" wording) and the Privacy choices page. Prices are shown in rand; Puntr is not VAT-registered.
- New processor: PayFast (payments). The owner decides under their compliance policy; it is not enabled by this change.


## 11 Nov 2026: Draw terms confirmed by owner
- What changed: no copy change. The owner confirmed (11 Nov 2026, 21:53 SAST) the two terms already published on /feedback: Puntr team members and their immediate family cannot enter, and if the winner cannot be reached Puntr may select another winner. The Draw admin screen is documented separately.
- Pages changed: none. No new data is collected; no legal page text changed. Counsel retroactive review remains optional per the owner.

## 28 Nov 2026: Sponsored units, interstitial advertisements and ad-free Puntr Pro (migration 20261128300000)
- What changed: live affiliate partners (Hollywoodbets, 1xBet) now appear in sponsored banners, feed cards and text links in the Newsroom (list and articles) and Teams directory, plus a rare full-screen advertisement between page loads (from the 3rd page view, then every 4th, at least 3 minutes apart, at most 3 per visit, closes itself after 8 seconds, can be closed at once, never on sign-up, payment, help or legal pages, and only after the cookie banner is answered). Every unit is labelled "Sponsored" or "Advertisement", carries 18+, T&Cs and the helpline (`<RgNotice />`), and is hidden from Puntr Pro members, visitors who have not confirmed 18+, and members on a break. Admins manage partner-approved creatives in Admin > Affiliates; a creative cannot be switched on without a recorded partner approval date. Views, clicks and closes are counted anonymously (no account, browser ID, IP or device ID), only with Affiliate tracking consent, and pruned after 90 days. Ad-free browsing is a Puntr Pro entitlement.
- Pages: `/privacy` (Affiliate tracking row, version 2026-11-28-ads), `/cookies` (two session keys: `puntr:affiliate-age-confirmed`, `puntr:ads:overlay`; tracking r4), `/terms` section 10 (Pro includes ad-free browsing, r26), `/affiliate-disclosure` (labels, approved creatives, interstitial, Pro ad-free), English and Afrikaans. `/refunds` unchanged. New `notice_versions` rows in the migration.
- Counsel should look at `[attorney review]`: whether full-screen gambling advertisements between page loads fit the provincial advertising rules and the NGB/ASA codes; the neutral default unit copy ("Sign up at {partner}", "Set a budget before you play", "18+ only. New customers. T&Cs apply.") when a partner has not supplied approved copy; 1xBet's licence position for South African placements (recorded in Admin > Affiliates as a Curaçao licence).
