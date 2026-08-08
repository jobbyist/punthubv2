import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Statement | Puntr" },
      {
        name: "description",
        content:
          "Puntr's Privacy Statement - POPIA and FICA compliant. Learn how we protect your personal information with VerifyNow verifications.",
      },
      { property: "og:title", content: "Privacy Statement | Puntr" },
      { property: "og:description", content: "How Puntr protects and processes your personal information." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <AppShell>
      <PageHeading
        title="Privacy Statement"
        subtitle="Your privacy matters to us. Learn how we collect, use, and protect your personal information."
      />

      <div className="card-surface p-6 sm:p-8">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated:</strong> 1 January 2025
          </p>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Puntr (Pty) Ltd ("Puntr", "we", "us", or "our") is committed to protecting your privacy and personal
              information. This Privacy Statement explains how we collect, use, disclose, and safeguard your
              information in compliance with:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>POPIA</strong> - Protection of Personal Information Act, 2013 (Act No. 4 of 2013)
              </li>
              <li>
                <strong>FICA</strong> - Financial Intelligence Centre Act, 2001 (Act No. 38 of 2001)
              </li>
              <li>Other applicable South African laws and regulations</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              By using Puntr's services, you consent to the practices described in this Privacy Statement.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">2. Information We Collect</h2>
            
            <h3 className="mb-2 mt-4 text-lg font-semibold">2.1 Personal Information</h3>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We collect the following personal information when you register or use our services:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Full name and surname</li>
              <li>Date of birth</li>
              <li>ID number or passport number</li>
              <li>Email address</li>
              <li>Mobile phone number</li>
              <li>Physical and postal address</li>
              <li>Banking details (for commission payments)</li>
              <li>Username and password (encrypted)</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">2.2 FICA Verification Information</h3>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              To comply with FICA requirements and prevent money laundering and terrorist financing, we collect and
              verify identity information through our trusted verification partner, <strong>VerifyNow</strong>:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Government-issued identification documents</li>
              <li>Proof of residence (not older than 3 months)</li>
              <li>Biometric verification data</li>
              <li>Source of funds information (where applicable)</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              VerifyNow processes this information securely on our behalf and provides verification results. We do not
              store copies of your identity documents on our servers; these are securely stored by VerifyNow in
              accordance with FICA requirements.
            </p>

            <h3 className="mb-2 mt-4 text-lg font-semibold">2.3 Usage & Technical Information</h3>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We automatically collect certain technical information when you use our Service:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>IP address and location data</li>
              <li>Device information (type, operating system, browser)</li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Cookies and similar tracking technologies</li>
              <li>Prediction history and betting preferences</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">3. How We Use Your Information</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We process your personal information for the following lawful purposes:
            </p>

            <h3 className="mb-2 mt-4 text-lg font-semibold">3.1 Service Provision</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Create and manage your account</li>
              <li>Provide access to predictions, odds comparison, and community features</li>
              <li>Process referral commissions and rewards</li>
              <li>Enable communication with other users (where applicable)</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">3.2 Compliance & Security</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Verify your identity and age (18+) in compliance with gambling regulations</li>
              <li>Comply with FICA and anti-money laundering requirements</li>
              <li>Prevent fraud, unauthorized access, and illegal activities</li>
              <li>Detect and prevent problem gambling behaviors</li>
              <li>Comply with legal obligations and regulatory requests</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">3.3 Communication</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Send account-related notifications and updates</li>
              <li>Provide customer support</li>
              <li>Send marketing communications (with your consent - you may opt out anytime)</li>
              <li>Notify you of promotions, new features, and platform updates</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">3.4 Improvement & Analytics</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Analyze usage patterns to improve our Service</li>
              <li>Conduct research and development</li>
              <li>Personalize your user experience</li>
              <li>Generate aggregated, anonymized statistics</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">4. Information Sharing & Disclosure</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We do not sell your personal information. We may share your information with:
            </p>

            <h3 className="mb-2 mt-4 text-lg font-semibold">4.1 Verification Partners</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>VerifyNow:</strong> Our trusted FICA verification partner processes your identity documents
                and biometric data for age and identity verification. VerifyNow is bound by strict confidentiality and
                data protection obligations.
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">4.2 Affiliate Bookmakers</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                When you click through to third-party bookmakers, we share minimal information (such as a referral ID)
                to track commissions. Each bookmaker has its own privacy policy governing their data practices.
              </li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">4.3 Service Providers</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Cloud hosting and infrastructure providers</li>
              <li>Payment processors (for commission payments)</li>
              <li>Email and communication service providers</li>
              <li>Analytics and monitoring tools</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              All service providers are contractually required to protect your information and use it only for the
              purposes we specify.
            </p>

            <h3 className="mb-2 mt-4 text-lg font-semibold">4.4 Legal & Regulatory Authorities</h3>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>When required by law or court order</li>
              <li>To comply with FICA reporting obligations</li>
              <li>To protect our rights, property, or safety</li>
              <li>In connection with the investigation of fraud or illegal activity</li>
            </ul>

            <h3 className="mb-2 mt-4 text-lg font-semibold">4.5 Business Transfers</h3>
            <p className="leading-relaxed text-muted-foreground">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the
              acquiring entity, subject to the same privacy protections.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">5. Your Rights Under POPIA</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Under the Protection of Personal Information Act (POPIA), you have the following rights:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                <strong>Right to Access:</strong> Request a copy of the personal information we hold about you
              </li>
              <li>
                <strong>Right to Correction:</strong> Request correction of inaccurate or incomplete information
              </li>
              <li>
                <strong>Right to Deletion:</strong> Request deletion of your information (subject to legal retention
                requirements)
              </li>
              <li>
                <strong>Right to Object:</strong> Object to the processing of your information for certain purposes
              </li>
              <li>
                <strong>Right to Restrict Processing:</strong> Request that we limit how we use your information
              </li>
              <li>
                <strong>Right to Data Portability:</strong> Request your information in a structured, machine-readable
                format
              </li>
              <li>
                <strong>Right to Withdraw Consent:</strong> Withdraw consent for marketing communications or optional
                data processing
              </li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              To exercise any of these rights, please contact our Information Officer at{" "}
              <a href="mailto:privacy@punthub.fun" className="font-semibold text-primary">
                privacy@punthub.fun
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">6. Data Security</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We implement appropriate technical and organizational security measures to protect your personal
              information, including:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Encryption of data in transit (SSL/TLS) and at rest</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Employee training on data protection and confidentiality</li>
              <li>Secure data centers with physical access controls</li>
              <li>Regular backups and disaster recovery procedures</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              While we strive to protect your information, no method of transmission or storage is 100% secure. You are
              responsible for maintaining the confidentiality of your account credentials.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">7. Data Retention</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We retain your personal information for as long as necessary to:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Provide our services to you</li>
              <li>Comply with legal obligations, including FICA requirements (minimum 5 years after closure)</li>
              <li>Resolve disputes and enforce our agreements</li>
              <li>Fulfill legitimate business purposes</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              When your information is no longer required, we securely delete or anonymize it in accordance with our
              data retention policy and legal requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">8. Cookies & Tracking Technologies</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              We use cookies and similar technologies to enhance your experience. For detailed information, please see
              our{" "}
              <a href="/cookies" className="font-semibold text-primary">
                Cookie Preferences
              </a>{" "}
              page.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">9. International Data Transfers</h2>
            <p className="leading-relaxed text-muted-foreground">
              Your information is primarily stored and processed within South Africa. If we transfer data
              internationally (e.g., to cloud service providers), we ensure adequate safeguards are in place through
              standard contractual clauses or other legally approved mechanisms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">10. Children's Privacy</h2>
            <p className="leading-relaxed text-muted-foreground">
              Puntr is not intended for persons under 18 years of age. We do not knowingly collect information from
              minors. If we discover that we have inadvertently collected information from someone under 18, we will
              delete it immediately. If you believe we have information about a minor, please contact us.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">11. Changes to This Privacy Statement</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update this Privacy Statement from time to time to reflect changes in our practices or legal
              requirements. We will notify you of material changes by email or through the platform. Your continued use
              of the Service after changes constitutes acceptance of the updated Privacy Statement.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">12. Contact Us</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              If you have questions about this Privacy Statement or wish to exercise your POPIA rights, please contact:
            </p>
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="font-semibold">Information Officer</p>
              <p className="mt-1 text-sm text-muted-foreground">Puntr (Pty) Ltd</p>
              <p className="mt-1 text-sm">
                Email:{" "}
                <a href="mailto:support@puntr.co.za" className="font-semibold text-primary">
                  support@puntr.co.za
                </a>
              </p>
              <p className="mt-1 text-sm">
                General Support:{" "}
                <a href="mailto:support@puntr.co.za" className="font-semibold text-primary">
                  support@puntr.co.za
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
