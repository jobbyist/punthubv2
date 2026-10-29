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
      { property: "og:description", content: "What we collect, why, how long we keep it, and your rights." },
    ],
  }),
  component: Privacy,
});

const PURPOSES: [string, string, string, string][] = [
  ["Waitlist and founding membership", "Name, email, optional phone, chosen plan", "Your request (consent)", "Until launch emails are done, then until you ask us to delete it [attorney review]"],
  ["Running your account", "Username, display name, 18+ confirmation, birth year if given", "Contract (providing Puntr to you)", "While your account is open; anonymised when you delete it"],
  ["Public pick record", "Your picks, odds, results, a hash of each pick", "Legitimate interest: a verifiable, permanent track record", "Kept permanently, linked only to an anonymous id after deletion"],
  ["Analytics", "Page views and button use", "Your consent", "Up to 14 months [attorney review]"],
  ["Affiliate tracking", "Which ad you clicked", "Your consent", "Up to 90 days [attorney review]"],
  ["Marketing email", "Email address", "Your consent, off by default", "Until you withdraw"],
  ["Privacy requests", "Email, what you asked for", "Legal obligation", "3 years [attorney review]"],
];

function Privacy() {
  return (
    <AppShell>
      <PageHeading title="Privacy Policy" subtitle="Plain English. What we collect, why, and what you can do about it." />
      <div className="card-surface space-y-8 p-6 sm:p-8 text-sm leading-relaxed text-muted-foreground">
        <p><strong>Last updated:</strong> 29 October 2026. Draft pending attorney review.</p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">1. Who is responsible</h2>
          <p>
            Puntr (puntr.co.za) is the responsible party under the Protection of Personal Information Act (POPIA). Our
            Information Officer is the founder, [name to be confirmed], registered with the Information Regulator
            [registration pending]. Contact: <a className="underline" href="mailto:privacy@puntr.co.za">privacy@puntr.co.za</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">2. What we collect and why</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="py-2 pr-3">Purpose</th><th className="pr-3">What</th><th className="pr-3">Basis</th><th>Kept for</th>
                </tr>
              </thead>
              <tbody>
                {PURPOSES.map((row) => (
                  <tr key={row[0]} className="border-b border-border align-top">
                    {row.map((cell, i) => <td key={i} className="py-2 pr-3">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            We do not collect your ID document, a selfie or biometrics. We do not store your IP address or device
            details with your sign-up. Puntr does not take payments at launch, so we hold no card or bank details.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">3. Your picks are a public, permanent record</h2>
          <p>
            Picks are published with your username so anyone can check a track record, and each pick is chained to the
            one before it so it cannot be quietly changed. Because of that, picks cannot be deleted. When you delete
            your account we remove your name, email and profile details and your picks stay under an anonymous id.
            Do not put personal information in a pick&apos;s reasoning.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">4. Who processes data for us</h2>
          <p>
            Supabase (database and sign-in, hosted in Ireland, EU), Vercel (website hosting) and an email provider for
            service emails. Sending data outside South Africa is allowed under POPIA section 72 where the receiving
            country or contract gives comparable protection. We never send personal data to AI services. We do not sell your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">5. Children</h2>
          <p>Puntr is for people aged 18 and over. If we learn someone under 18 has an account we will remove it.</p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">6. Your rights</h2>
          <p>
            You can ask to see your data, correct it, delete it, object to its use, or withdraw consent at any time.
            Use <Link to="/privacy/request" className="underline">our request form</Link> or the controls on{" "}
            <Link to="/cookies" className="underline">Privacy choices</Link>. We aim to reply within 30 days. If you are
            unhappy, you can complain to the Information Regulator at{" "}
            <a className="underline" href="https://inforegulator.org.za" rel="noreferrer">inforegulator.org.za</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">7. If something goes wrong</h2>
          <p>
            If your personal information is compromised we will tell the Information Regulator and the people affected
            as soon as reasonably possible.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">8. Cookies and affiliate links</h2>
          <p>
            Only an essential cookie is used until you agree to more. See <Link to="/cookies" className="underline">Privacy choices</Link> and
            the <Link to="/affiliate-disclosure" className="underline">affiliate disclosure</Link>.
          </p>
        </section>

        <p className="text-xs">18+ only. Gambling can be addictive. Helpline: 0800 006 008.</p>
      </div>
    </AppShell>
  );
}
