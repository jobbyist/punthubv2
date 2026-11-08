# X Ads: Founding Member campaign (7–8 Nov 2026, R200)

Goal: qualified visits and free Founding Member sign-ups on `puntr.co.za/founding`. Budget R200 over two days (R100 a day). Everything below is in the order you do it.

## 0. Read first: X's gambling policy may block this ad

X's gambling policy lists "sites or services providing tips, odds, handicapping, sports picks, forecasts" as gambling content. For South Africa it allows sports betting and lottery ads with prior authorisation from X, and fantasy sports. Tips and picks sites are not listed as allowed. Puntr (picks, predictions, a site that carries bookmaker affiliate links) can be treated as gambling content and the ad can be rejected. Source: business.x.com/adspolicy/gambling.

- Submit the ads **tonight (Fri 6 Nov)**, not tomorrow, so review time doesn't eat the two days.
- At the same time open an X support ticket asking whether a free sports prediction community (not a bookmaker, no bets taken, 18+) can advertise in South Africa. Ask for authorisation if needed.
- Don't disguise the landing page or the ads to get past review. A rejected ad costs nothing; a suspended ads account costs more.
- If X rejects it, use Plan B (section 9). The creatives and tracking work for any channel.

## 1. Deploy (before any ad goes live)

1. Merge the `mvp/launch` changes so Vercel deploys `/founding`, the tracking and the admin Campaigns tab.
2. Database: `supabase/migrations/20261106235000_campaign_events.sql` was applied to the live Supabase project on 6 Nov, plus `20261106235100_privacy_r9_campaign_tracking.sql` (notice version row). If you ever rebuild the database, run both, or the Campaigns tab shows an error and no events are stored.
3. Test the tracking: open the link in section 2 in a private window, accept Analytics in the banner, click "Claim your Founding spot", then open `/admin` > Campaigns. You should see a landing view and a CTA click under `x / founding_x_nov26 / test`.
4. Note today's baseline in the Campaigns tab: "Founding spots taken (all)". Write it down. This is your true sign-up count; the funnel table only counts visitors who accepted Analytics.

## 2. Tracking links (UTM)

One link per creative. Only lowercase letters, numbers, `_`, `-`, `.` are kept. Paste the full link as the ad's website URL.

| Creative | utm_content | Link |
|---|---|---|
| Image A (dark headline) | `img_a_predict` | `https://puntr.co.za/founding?utm_source=x&utm_medium=paid_social&utm_campaign=founding_x_nov26&utm_content=img_a_predict` |
| Image B (#001–100) | `img_b_number` | `https://puntr.co.za/founding?utm_source=x&utm_medium=paid_social&utm_campaign=founding_x_nov26&utm_content=img_b_number` |
| Image C (locked picks) | `img_c_proof` | `https://puntr.co.za/founding?utm_source=x&utm_medium=paid_social&utm_campaign=founding_x_nov26&utm_content=img_c_proof` |
| Video (12 s) | `vid_a_story` | `https://puntr.co.za/founding?utm_source=x&utm_medium=paid_social&utm_campaign=founding_x_nov26&utm_content=vid_a_story` |
| Test (you only) | `test` | `https://puntr.co.za/founding?utm_source=x&utm_medium=paid_social&utm_campaign=founding_x_nov26&utm_content=test` |

Tags are remembered for the visit (same tab). A visitor who accepts Analytics is counted at: landing view, CTA click, join started, email verified, sign-up completed. No X pixel is installed (POPIA: no new tracker without consent and legal copy).

## 3. Creatives

Files are in the `ads` folder (1200×1200 and 1200×675 for each image, 1080×1080 MP4 for video). Use 1:1 for the feed; the 16:9 files are spares.

- `puntr-founding-A-sq.png`: "Predict what's next. Prove your worth." Brand line, strongest recall.
- `puntr-founding-B-sq.png`: "Your number is waiting." Scarcity (#001–100).
- `puntr-founding-C-sq.png`: "Every pick locked. Every result public." Proof (example pick, labelled as an example).
- `puntr-founding-video-1x1.mp4`: 12 seconds, no voice-over, reads on mute.

All carry "Free to join. 18+. Puntr is a prediction community, not a bookmaker. Gambling can be addictive. Helpline 0800 006 008."

## 4. Post text (one per creative, under 280 characters)

**A (img_a_predict)**
Predict what's next. Prove your worth.
Puntr locks every football pick before kick-off and grades it automatically, so your record is public.
The first 100 members get a permanent numbered Founding badge. Free. 18+.

**B (img_b_number)**
Founding Member #001–#100.
A permanent numbered badge on a public football prediction record. Free to join, first 100 only. 18+.

**C (img_c_proof)**
Every pick locked. Every result public.
Back your football calls on Puntr and let the record speak. Founding spots are open now. Free. 18+.

**Video (vid_a_story)**
Everyone has a take. Few can prove it.
Puntr locks and grades every pick. Become one of the first 100 Founding Members. Free. 18+.

Don't add words like "win", "earn", "sure", "guaranteed" or odds. They break Puntr's copy rules and X's policy.

## 5. Build the campaign in X Ads Manager

1. ads.x.com > **Create campaign** > objective **Website traffic** (you pay per link click). Don't use Conversions: it needs the X pixel, which isn't installed.
2. Funding source: add a card if you haven't. Check the account currency; R200 is roughly US$11, so confirm the rate on the day.
3. Campaign name `founding_x_nov26`. Budget: **R100 daily**, total **R200**. Start Sat 7 Nov 06:00 SAST, end Sun 8 Nov 23:59 SAST.
4. One ad group, name `za_football_18plus`. Bid: **Automatic** (X lowers cost per click for you). Placement: **Home timeline** and **Profile**; untick Search and Replies/Related posts unless X pushes you to keep them.
5. Targeting:
   - Location: South Africa.
   - Language: English.
   - Age: 21+ (leave out 18–20; gambling-adjacent audiences are the NGB's focus, and 21+ keeps a safety margin).
   - Gender: all.
   - Interests: Soccer / Football, Premier League, UEFA Champions League.
   - Followers lookalikes and keywords: search in the tool for the official PSL, SuperSport, Kaizer Chiefs, Orlando Pirates, Mamelodi Sundowns and Premier League accounts and add them. Keywords: `PSL predictions`, `Betway Premiership`, `EPL predictions`, `football predictions`, `Chiefs vs Pirates`. Avoid the word "betting"; it narrows approval.
   - Audience size: aim for 50k–500k. If X shows "too narrow", add more accounts.
6. Ads: click **Create new post** (not "use existing") for each creative: paste its text from section 4, upload the image or video, paste its UTM link as the website URL, headline "Become a Founding Member", button "Sign up" (or "Learn more"). Add all four to the one ad group.
7. Review and launch tonight so approval lands before Sat 06:00. If an ad is rejected, read the reason and fix only what X names; don't re-submit identical text.

## 6. Timeline

| When | Do |
|---|---|
| Fri 6 Nov, evening | Deploy, migration, tracking test, build campaign, submit, open X ticket |
| Sat 7 Nov 06:00 | Confirm all ads are "Active" (not "In review") |
| Sat 7 Nov 12:00, 18:00 | Check Ads Manager (spend, link clicks) and the Campaigns tab |
| Sun 8 Nov 06:00 | Decision point (section 7) |
| Sun 8 Nov 23:59 | Campaign ends. Record the results |

## 7. Decision rules after day 1

R200 is a directional test, not a statistical one: about R25 a creative per day, so a handful of clicks each. Judge on three things in order:

1. **Cost per link click** (Ads Manager). Pause any ad above double the average.
2. **Click to sign-up rate** (Campaigns tab, Sign-up rate column). If a creative has 15+ clicks and zero CTA clicks, the creative attracts the wrong people or the page loads badly on mobile; pause it.
3. **Sign-ups per R** (spots taken now minus baseline, divided by spend). This is the number that counts.

On Sunday morning pause the bottom two creatives and keep the budget on the top two. If every ad has high clicks and no sign-ups, the page or the offer is the problem, not the creative: open `/founding` on a phone and check the flow through `/join` before spending more.

## 8. Reading the Admin Campaigns tab

`/admin` > **Campaigns**. Choose 24 hours, 48 hours, 7 days or 30 days. Type `founding_x_nov26` in the filter to see only this campaign. Each row is one ad (`utm_content`) with unique visitors at each step, and a sign-up rate. The tiles show ad visitors, ad sign-ups, visit-to-sign-up rate, and total Founding spots taken (all sources).

Limits: only visitors who accept the Analytics prompt are counted, so the table undercounts. Use the "spots taken" tile as the truth and the table to compare ads with each other.

## 9. Plan B if X rejects the ads

- Same links, same creatives, different channel: organic X posts from the Puntr account on match days, WhatsApp groups and PSL/EPL fan communities (read each group's rules; no spam), and email to the early-access list (it already runs, check the Waitlist tab).
- Keep the UTM pattern (`utm_source=whatsapp`, `utm_source=x_organic`, ...) so the Campaigns tab compares channels.
- Don't move the same ads to Meta or Google as-is: Google only allows licensed sportsbook operators in South Africa, and Meta has its own gambling permission process. Check each policy before spending.

## 10. Compliance checklist

- 18+ and helpline 0800 006 008 on every creative (done) and the landing page footer.
- No profit, "win", "earn", "sure" or odds claims (checked).
- "Prediction community, not a bookmaker" on every creative (done).
- No X pixel and no tracking without Analytics consent (kept).
- Legal copy: Privacy r6 and `docs/legal-changelog.md` updated; the attorney should look at the new first-party campaign storage `[attorney review]`.
