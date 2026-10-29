import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";

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
    "Email (from your email or Google sign-in), a one-way hash of your password if you set one, username, display name, 18+ confirmation, birth year, language, Founding number, referral code",
    "Contract (providing Puntr to you)",
    "While your account is open; email and profile details are removed when you delete it",
  ],
  [
    "Keeping accounts secure",
    "Whether your email is confirmed, authenticator-app two-factor details, sign-in sessions",
    "Contract and our interest in keeping accounts safe",
    "While your account is open",
  ],
  [
    "Public pick record",
    "Your picks, odds, results, a hash of each pick, and any correction made to a result with the reason",
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
  ["Analytics", "Page views and button use", "Your consent", "Up to 14 months [attorney review]"],
  ["Affiliate tracking", "Which ad you clicked", "Your consent", "Up to 90 days [attorney review]"],
  [
    "Marketing email, WhatsApp and SMS",
    "Email address and, for WhatsApp or SMS, phone number",
    "Your consent, off by default",
    "Until you withdraw",
  ],
  [
    "Privacy requests",
    "Email, what you asked for",
    "Legal obligation",
    "3 years [attorney review]",
  ],
];

function Privacy() {
  return (
    <AppShell>
      <PageHeading
        title="Privacy Policy"
        subtitle="Plain English. What we collect, why, and what you can do about it."
      />
      <div className="card-surface space-y-8 p-6 sm:p-8 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong>Last updated:</strong> 29 October 2026 (version 2026-10-29-r3). Draft pending
          attorney review.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">1. Who is responsible</h2>
          <p>
            Puntr (puntr.co.za) is the responsible party under the Protection of Personal
            Information Act (POPIA). Our Information Officer is the founder, [name to be confirmed],
            registered with the Information Regulator [registration pending]. Contact:{" "}
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
            We do not collect your ID document, a selfie or biometrics. We do not store your IP
            address or device details with your sign-up. Puntr does not take payments at launch, so
            we hold no card or bank details. We never see your password: our sign-in provider keeps
            only a one-way hash of it.
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
            confirm your email and turn on two-factor sign-in with an authenticator app on your
            account page. Once two-factor is on, posting and changing your profile need the code
            from your app.
          </p>
        </section>

        <section id="marketing">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            4. Early access, launch messages and marketing
          </h2>
          <p>
            If you asked for early access, we hold your name, email, optional phone number and
            whether you ticked marketing. We send a short series of emails when Puntr launches: one
            on launch day and, if you have not yet signed up, up to two reminders. Every email has
            an unsubscribe link. The reminders go only to people who ticked marketing. If you opted
            in and gave a phone number, a person at Puntr may also send you a one-off launch message
            on WhatsApp or SMS from our own accounts. Marketing is never a condition of joining and
            is off unless you tick it. You can change your choice at any time on{" "}
            <Link to="/account/privacy" className="underline">
              your privacy page
            </Link>{" "}
            or by using the unsubscribe link.
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
            EU), Vercel (website hosting), Resend (sending email, through an email gateway) and
            Google (only if you choose Google to sign in). We also get match fixtures and results
            from a sports-data provider; no personal information is sent to it. Reward sponsors do
            not receive your personal information from us: vouchers come from bulk codes the sponsor
            supplies, and a sponsor&apos;s own site collects data when you use a code. Sending data
            outside South Africa is allowed under POPIA section 72 where the receiving country or
            contract gives comparable protection. We never send personal data to AI services. We do
            not sell your data.
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
