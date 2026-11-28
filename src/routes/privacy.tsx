import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { PrivacyAf } from "@/content/legal/af/privacy";
import { useLocale } from "@/lib/i18n/provider";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/privacy" }],
    meta: [
      { title: "Privacy Policy | Puntr" },
      {
        name: "description",
        content:
          "How Puntr collects, uses and protects your personal information under POPIA, in plain English.",
      },
      { property: "og:title", content: "Privacy Policy | Puntr" },
      {
        property: "og:description",
        content: "What we collect, why, how long we keep it, and your rights.",
      },
    ],
  }),
  component: Privacy,
});

const PURPOSES: [string, string, string, string][] = [
  [
    "Early-access list",
    "Name, email, optional phone, chosen plan, whether you opted in to marketing, and a held Founding spot",
    "Your request (consent)",
    "Until you sign up, unsubscribe or ask us to delete it [attorney review]",
  ],
  [
    "Launch messages",
    "Email address, and phone number if you gave one and opted in",
    "Your request; marketing consent for reminders",
    "Until you unsubscribe or ask us to delete it",
  ],
  [
    "Running your account",
    "Email (from your email or Google sign-in), a one-way hash of your password if you set one, username, display name, profile picture (optional), 18+ confirmation, birth year, language, Founding number, referral code",
    "Contract (providing Puntr to you)",
    "While your account is open; email and profile details are removed when you delete it",
  ],
  [
    "Internal signup notifications",
    "Your account email address, account ID and registration time, sent to Puntr's support inbox when a new account is created",
    "Our legitimate interest in monitoring new registrations and providing account support",
    "Retained in the support mailbox and email systems under their applicable retention controls and any legal obligations",
  ],
  [
    "Your details (optional)",
    "First name, last name, phone number, date of birth and province, only if you choose to save them in your account. Only you and Puntr admins can see them; they are never public",
    "Your consent (you choose to add them)",
    "While your account is open; deleted when you delete your account",
  ],
  [
    "Founding Member survey",
    "Your answers (ratings, what you expect, pricing view, Annual Pass interest, free-text comments), whether you want to enter the draw, and whether we may contact you about it",
    "Your consent (the survey and draw are optional)",
    "Kept after you delete your account, linked only to an anonymous id, without your name, email or other details; we stop contacting you [attorney review]",
  ],
  [
    "Practice Mode",
    "Your practice picks, practice points, demo reward redemptions and the leaderboard username. These use a fictional league, are kept apart from your real picks and PuntPoints, and are never public except your username on the practice leaderboard",
    "Your consent (you choose to try it); Founding Members only",
    "While your account is open; deleted when you delete your account [attorney review]",
  ],
  [
    "Favourites and followed teams (optional)",
    "The sports, competitions and teams you choose to follow, including teams you follow in the team directory, and a log of when you followed or unfollowed a team",
    "Your consent (you choose to set them; clear them or unfollow at any time in your account or the team directory)",
    "While your account is open; deleted when you clear them or delete your account. Used to order your own Matchday card and shortcuts and to show which teams you follow on your account page. Others see only an anonymous follower count per team; admins see follow totals and the most-followed teams, never a list of who follows whom. Never shared [attorney review]",
  ],
  [
    "Betting slips (optional)",
    "Slips you add: matches, markets, odds, and if you enter them the bookmaker, stake and potential return; an optional photo or screenshot of the slip. The bookmaker is shown only to you; your stake and return are shown on a published slip only if you switch that on. Published legs become normal picks shown with your username",
    "Your consent (you choose to add a slip) and contract (publishing picks you ask us to publish)",
    "Slip photos: deleted 30 days after upload, or when you delete the slip or your account. Slip details: while your account is open; on deletion drafts are deleted and the bookmaker, stake, return and note are cleared, while picks already published stay with the anonymous account like every other pick. A count of AI-assisted reads (no slip text) is kept for 24-hour limits and deleted with your account [attorney review]",
  ],
  [
    "Community Duels (from launch)",
    "Your duel challenges, calls, stakes, results and votes. Your calls are shown publicly with your username from kick-off; votes are only counted, never shown by name",
    "Contract (providing the duel feature you choose to use)",
    "While your account is open. On deletion, open challenges are cancelled, active duels are voided with stakes returned and your votes are deleted; settled duels stay with the anonymous account so the other member's record stays correct [attorney review]",
  ],
  [
    "Wallet (from launch)",
    "Your PuntPoints and Pay-As-You-Go credit balances and history; PuntPoints you send or receive (the other member's username, the amount, an optional note and the time)",
    "Contract (providing the loyalty scheme and the paid features to you)",
    "While your account is open; transfer records are kept with the anonymous account after deletion so the other member's history stays correct [attorney review]",
  ],
  [
    "Account administration",
    "Your account type (free, Pay-As-You-Go, Pro), access we grant (such as early access for testing), warnings, suspensions or paused features with the reason, messages we send you, and a log of what our admins changed and when",
    "Our legitimate interest in running a safe, fair platform, and the contract with you",
    "While your account is open; the admin log is kept for audit after your account is deleted, without your email [attorney review]",
  ],
  [
    "Payments and subscriptions",
    "Account ID, order or subscription ID, selected pack or plan, Annual Pass claim time and hold expiry, PayFast by Network transaction reference, amount, payment status, purchase or renewal dates, credits granted, subscription status and current paid-period end",
    "Contract (providing paid features), accounting and legal obligations, and fraud prevention",
    "For as long as tax and accounting law requires payment records to be kept and as needed to resolve payment disputes",
  ],
  [
    "Brand Ambassador applications",
    "Your name, email, city/country, confirmation that you are 18 or older, role, platforms, public profile links, optional audience-size information, content examples, sports/content interests, availability and application answers. The application is stored in our form-submissions system and emailed to partners@puntr.co.za.",
    "Your request to be considered for the programme and steps taken at your request before any agreement",
    "For as long as needed to assess the application, administer any resulting agreement and handle legal or dispute obligations; you may submit a privacy request",
  ],
  [
    "Get-started quests",
    "Which quests you started and completed, the points given, and for community quests the name or username you give us (your WhatsApp name or Telegram username), which our team checks in that group",
    "Your consent (you choose to do a quest); our interest in preventing reward abuse",
    "While your account is open; these names are deleted 90 days after the quest is checked [attorney review]",
  ],
  [
    "Reward delivery (from launch)",
    "Your redemptions, and for physical rewards and match tickets the name, delivery address, phone number, size or club choice you send us by email; ticket holder names where the venue requires them",
    "Contract (delivering the reward you redeemed)",
    "Delivery details: 12 months after delivery, then deleted; redemption records while your account is open [attorney review]",
  ],
  [
    "Verifying your identity (before redeeming rewards)",
    "A photo or scan of your ID or passport (deleted once checked), and the result: verified, 18 or older, who checked it and when",
    "Legal obligation (keeping gambling promotions to adults) and our interest in preventing fraud [attorney review]",
    "The document: until it is checked, at most 30 days. The result: while your account is open",
  ],
  [
    "Keeping accounts secure",
    "Whether your email is confirmed, authenticator-app two-factor details, sign-in sessions",
    "Contract and our interest in keeping accounts safe",
    "While your account is open",
  ],
  [
    "Push notifications (optional)",
    "Your browser push endpoint, encrypted subscription keys, device/browser details, account notification preference and delivery status. Notification title, message and destination are sent to your browser's push service; Puntr does not include private account or betting data in notification payloads.",
    "Your explicit consent to receive push notifications. You can withdraw it in Account settings or revoke the browser permission at any time.",
    "Device subscriptions are removed when you turn notifications off or delete your account. Limited campaign and delivery audit records may be retained for platform security, abuse prevention and operational reporting [attorney review].",
  ],

  [
    "Public pick record",
    "Your picks, odds, results, a hash of each pick, any correction made to a result with the reason, and, where one existed, the market reference price when you posted and whether your odds were marked unverified (shown with the pick)",
    "Legitimate interest: a verifiable, permanent track record",
    "Kept permanently, linked only to an anonymous id after deletion",
  ],
  [
    "Reports and moderation",
    "Reports you file (your id, the pick, your reason) and actions we take, such as hiding a pick or suspending an account",
    "Legitimate interest: fairness and safety",
    "While your account is open [attorney review]",
  ],
  [
    "PuntPoints and rewards",
    "What earned or spent points and when, your redemptions, and any voucher code issued to you",
    "Contract (the loyalty scheme you joined)",
    "While your account is open; kept without your name after you delete it [attorney review]",
  ],
  [
    "Invites",
    "A referral code that links a new member to the member who invited them, and whether the new member has posted a first pick",
    "Your request (using an invite link)",
    "While your account is open",
  ],
  [
    "PFIE learning (optional)",
    "If you opt in: pseudonymous feature and fixture engagement, selected sports, competitions and markets, teams you follow or unfollow, and your published pick actions (market, selection, odds and confidence). We exclude email, display name, private messages, payment details, stake amounts, IP addresses and device fingerprints. Data is stored separately from campaign analytics and used to evaluate user preferences, feature usefulness and PFIE data quality; user selections are never treated as verified match outcomes.",
    "Your separate, explicit consent. Off by default for this purpose; withdrawing stops new collection and deletes raw events and derived learning examples linked to your pseudonymous learning record.",
    "Up to 12 months for event-level learning records, followed by deletion or irreversible aggregation. Your public pick record remains subject to its separate retention rules.",
  ],
  [
    "Analytics",
    "Page views and button use, with the campaign tags of the ad or link that brought you (for example utm_source=x). Stored on our own database with a random browser ID, never with your name, email or account",
    "Your consent",
    "Up to 14 months [attorney review]",
  ],
  ["Affiliate tracking", "Which ad you clicked", "Your consent", "Up to 90 days [attorney review]"],
  [
    "Marketing email, WhatsApp and SMS",
    "Email address and, for WhatsApp or SMS, phone number",
    "Your consent, off by default",
    "Until you withdraw",
  ],
  [
    "Podcast episode notification",
    "Email address and consent timestamp for the one-off premiere alert",
    "Your explicit request",
    "Until the alert is sent, then up to 30 days; deletion on request",
  ],
  [
    "Privacy requests",
    "Email, what you asked for",
    "Legal obligation",
    "3 years [attorney review]",
  ],
];

function Privacy() {
  const { locale } = useLocale();
  if (locale === "af") return <PrivacyAf />;
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Privacy Policy"
        subtitle="A clear explanation of the personal information we handle, why we need it and the choices and rights available to you."
      />
      <div className="card-surface space-y-8 p-6 sm:p-8 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong>Last updated:</strong> 28 November 2026 (version 2026-11-28-team-follows). Draft pending
          attorney review.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">1. Who is responsible</h2>
          <p>
            Puntr South Africa (puntr.co.za) is operated by Gravitas Industries (Pty) Ltd (CK No.:
            2024/596436/07), a company registered in South Africa. Gravitas Industries (Pty) Ltd is
            the responsible party under the Protection of Personal Information Act (POPIA). Our
            Information Officer is the founder, [name to be confirmed], registered with the
            Information Regulator [registration pending]. Contact:{" "}
            <a className="underline" href="mailto:privacy@puntr.co.za">
              privacy@puntr.co.za
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">2. What we collect and why</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="py-2 pr-3">Purpose</th>
                  <th className="pr-3">What</th>
                  <th className="pr-3">Basis</th>
                  <th>Kept for</th>
                </tr>
              </thead>
              <tbody>
                {PURPOSES.map((row) => (
                  <tr key={row[0]} className="border-b border-border align-top">
                    {row.map((cell, i) => (
                      <td key={i} className="py-2 pr-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            We collect your ID document only if you choose to verify your identity, which you need
            to do before redeeming rewards. You upload a photo or scan of your ID or passport; a
            Puntr admin compares it with your name and birth year and we delete the document as soon
            as the check is done (and within 30 days if it is never checked). We keep only the
            result: verified or not, that you are 18 or older, who checked it and when. We never
            record your ID number, and we do not collect a selfie or biometrics. [attorney review]
            We do not store your IP address or device details with your sign-up. PayFast by Network
            receives and processes payment credentials directly; Puntr receives the transaction
            reference, amount, payment status and order or subscription details needed to provide
            the service and keep accounting records. We do not see or store your full card or bank
            details. We never see your password: our sign-in provider keeps only a one-way hash of it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">3. How you sign in</h2>
          <p>
            You can sign up and sign in with an email and password, with an emailed code or link, or
            with Google. If you choose Google, Google tells us your email address and that it is
            verified; we do not receive your Google password, and Google&apos;s own privacy policy
            applies to what it does. You can also sign in with your username and password: we look
            up your email on our server to complete the sign-in and never show it to anyone. You can
            turn on two-factor sign-in with an authenticator app on your account page. When you sign
            up with an email, we email you a code or link and you confirm your address before you
            can sign in. Once two-factor is on, posting and changing your profile need the code from
            your app.
          </p>
        </section>

        <section id="marketing">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            4. Early access, launch messages and marketing
          </h2>
          <p>
            If you asked for early access, we hold your name, email, optional phone number and
            whether you ticked marketing. We send a short series of emails around the launch: one
            when Founding Member sign-ups open (2 November 2026) and, if you have not yet signed up,
            up to two reminders. Every email has an unsubscribe link. The reminders go only to
            people who ticked marketing. If you opted in and gave a phone number, a person at Puntr
            may also send you a one-off launch message on WhatsApp or SMS from our own accounts.
            Marketing is never a condition of joining and is off unless you tick it. You can change
            your choice at any time on{" "}
            <Link to="/account/privacy" className="underline">
              your privacy page
            </Link>{" "}
            or by using the unsubscribe link.
          </p>
          <p className="mt-3">
            If you join as a Founding Member and ticked marketing, we also send you one welcome
            email from the Founder shortly after you sign up, and we record that it was sent. For
            any paid feature, we store the account and order or subscription identifiers, payment
            reference, amount, status and relevant purchase or renewal dates. PayFast by Network
            receives your payment details directly; we do not see or store your full card or bank
            details. If you submit a Brand Ambassador application, we store the details and answers
            you provide so our partnerships team can assess it and contact you. We email that
            application to partners@puntr.co.za using our email provider. If you add a profile picture, we
            store a compressed copy and show it publicly on your profile and next to your username;
            you can remove it at any time on your account page. [attorney review]
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            5. Your picks are a public, permanent record
          </h2>
          <p>
            Picks are published with your username so anyone can check a track record, and each pick
            is chained to the one before it so it cannot be quietly changed. Because of that, picks
            cannot be deleted or edited. Results are filled in automatically from sports data. If we
            have to correct a result, the correction is added as a new entry with a reason and the
            earlier entry stays on the record. When you delete your account we remove your name,
            email and profile details and your picks stay under an anonymous id. Do not put personal
            information in a pick&apos;s reasoning.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            6. Who processes data for us
          </h2>
          <p>
            Supabase (database, sign-in and live notifications to our admins, hosted in Ireland,
            EU), Vercel (website hosting), Google (only if you choose Google to sign in), PayFast by
            Network (South Africa; it
            processes paid Puntr transactions and returns the transaction reference, amount and
            status), and Resend (transactional email, including Brand Ambassador applications sent
            to partners@puntr.co.za). Ozow is a planned future payment option; it is not currently
            integrated and does not receive your personal or payment information through Puntr.
            We will update this notice before enabling it. We also get match fixtures and results
            from a sports-data provider; no personal
            information is sent to it. Reward sponsors do not receive your personal information from
            us: vouchers come from bulk codes the sponsor supplies, and a sponsor&apos;s own site
            collects data when you use a code. Sending data outside South Africa is allowed under
            POPIA section 72 where the receiving country or contract gives comparable protection. We
            never send personal data to AI services. When you upload a slip photo, its text is read
            on your own device (the photo is never sent to an AI service). Before slip text is used,
            we remove the personal details we can detect (email addresses, phone numbers, long
            account, ID or card numbers, and lines labelled with a name, username, balance, account
            or ID); if our own reader cannot find the bet, that cleaned text alone may be sent to
            Google Gemini to read the matches, markets and odds. Please cover your account name and
            balance before uploading. [attorney review] To write newsroom articles and to read
            football fixtures and results from public web pages we use Parallel (web search),
            Firecrawl (page reading) and Google Gemini (summarising those pages): they receive only
            public web pages and Puntr&apos;s own approved project updates, never information about
            you. We do not sell your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">7. Children</h2>
          <p>
            Puntr is for people aged 18 and over. If we learn someone under 18 has an account we
            will remove it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">8. Your rights</h2>
          <p>
            You can ask to see your data, correct it, delete it, object to its use, or withdraw
            consent at any time. Use{" "}
            <Link to="/privacy/request" className="underline">
              our request form
            </Link>{" "}
            or the controls on{" "}
            <Link to="/cookies" className="underline">
              Privacy choices
            </Link>
            . We aim to reply within 30 days. If you are unhappy, you can complain to the
            Information Regulator at{" "}
            <a className="underline" href="https://inforegulator.org.za" rel="noreferrer">
              inforegulator.org.za
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">9. If something goes wrong</h2>
          <p>
            If your personal information is compromised we will tell the Information Regulator and
            the people affected as soon as reasonably possible.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            10. Cookies, browser storage and affiliate links
          </h2>
          <p>
            Only what is needed to run Puntr is used until you agree to more. See{" "}
            <Link to="/cookies" className="underline">
              Privacy choices
            </Link>{" "}
            and the{" "}
            <Link to="/affiliate-disclosure" className="underline">
              affiliate disclosure
            </Link>
            .
          </p>
        </section>

        <p className="text-xs">18+ only. Gambling can be addictive. Helpline: 0800 006 008.</p>
      </div>
    </AppShell>
  );
}
