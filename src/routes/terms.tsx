import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/terms" }],
    meta: [
      { title: "Terms & Conditions | Puntr" },
      {
        name: "description",
        content:
          "Read Puntr's Terms & Conditions including payment provider terms, user responsibilities and betting guidelines.",
      },
      { property: "og:title", content: "Terms & Conditions | Puntr" },
      { property: "og:description", content: "Puntr Terms & Conditions and user agreement." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <AppShell>
      <PageHeading
        title="Terms & Conditions"
        subtitle="Please read these terms carefully before using Puntr."
      />

      <div className="card-surface p-6 sm:p-8">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated:</strong> 29 October 2026 (version 2026-10-29-r3). Draft pending
            attorney review.
          </p>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">1. Introduction</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Welcome to Puntr (Pty) Ltd ("Puntr", "we", "us", or "our"). These Terms & Conditions
              ("Terms") govern your access to and use of the Puntr platform, website, mobile
              applications, and related services (collectively, the "Service").
            </p>
            <p className="leading-relaxed text-muted-foreground">
              By accessing or using our Service, you agree to be bound by these Terms. If you do not
              agree with any part of these Terms, you must not use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">2. Eligibility & Age Restrictions</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              You must be at least 18 years of age to use Puntr. By using our Service, you represent
              and warrant that you are of legal age to form a binding contract with Puntr and meet
              all eligibility requirements.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <strong>No Persons Under 18:</strong> Puntr strictly prohibits gambling by persons
              under the age of 18. We promote responsible gambling and comply with all South African
              gambling regulations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">3. Account Registration</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              To access certain features of the Service, you must create an account. When you create
              an account, you agree to:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>
                Choose a username (it is public) and keep your sign-in method, such as your password
                or email, secure. We recommend confirming your email and turning on two-factor
                sign-in
              </li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access or security breach</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              You may not use another person's account without permission or create multiple
              accounts.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">4. Platform Services</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Puntr is a community platform where members post predictions on soccer and rugby
              matches. It provides:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>
                Predictions that lock at kick-off and are kept on a public record. Posting needs a
                confirmed email address
              </li>
              <li>Automatic grading of settled predictions and a weekly leaderboard</li>
              <li>A page to check that a prediction has not been changed (/verify)</li>
              <li>Founding Membership for the first 100 members, free</li>
              <li>Educational content and betting resources</li>
              <li>Links to licensed partners, marked &quot;Ad&quot;</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              <strong>Important:</strong> Puntr is not a bookmaker. We do not accept bets directly.
              All betting transactions occur through third-party licensed betting operators. When
              you place a bet through a linked platform, you are subject to that platform's terms
              and conditions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">5. Payments & Third-Party Services</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              <strong>No payments at launch:</strong> Puntr does not take payments, hold funds or
              process transactions. Puntr does not accept bets, set odds or handle winnings.
            </p>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              <strong>Third-Party Terms:</strong> If you follow a link to a licensed operator or
              retailer, you are subject to that company&apos;s terms, privacy policy and payment
              terms. Puntr is not responsible for their practices, policies or services.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              <strong>Affiliate Relationships:</strong> Puntr may earn a commission when you use a
              link marked &quot;Ad&quot;. Links are marked, and this does not change what you see in
              the records. Only licensed partners appear.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">6. PuntPoints</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              PuntPoints are not awarded yet. If we introduce them they will recognise activity and
              settled predictions, will have no monetary value and cannot be exchanged for cash. We
              will publish how they work before they start.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">7. Invites</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Members can share a personal invite link. We record which member invited a new member
              and whether the new member has posted a first pick. Puntr pays no commission or cash
              for invites. Any reward linked to invites, such as free credits once paid options
              exist, will be announced before it applies. Invites created through fraud, spam or
              fake accounts may be cancelled and the accounts suspended.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">8. No prizes at launch</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              The weekly leaderboard is for recognition only. No prizes, cash or vouchers are
              offered until separate contest rules are published. Those rules will say who can
              enter, how winners are chosen and what is awarded.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">
              9. Predictions, grading and the public record
            </h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              To post a prediction your email address must be confirmed. A prediction is locked at
              kick-off and cannot be edited or deleted. It is published with your username and
              chained to the one before it so a change can be detected; anyone can check this on the
              verify page. Results are filled in automatically from sports data. Abandoned and
              cancelled matches, and postponed matches that are not replayed within 72 hours, are
              void. If a result is wrong we correct it by adding a new entry with a reason; earlier
              entries stay on the record.
            </p>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Units show how a prediction did against a stake of one unit. They are not money, and
              nothing on Puntr says or suggests that any prediction will make a profit. We may hide
              a prediction from public view (for example for abuse or personal information); it
              stays in the record used to check the chain.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">10. Paid options (not on sale)</h2>
            <p className="leading-relaxed text-muted-foreground">
              Pay-As-You-Go credits and Puntr Pro, a monthly subscription for advanced bettors and
              tipsters (indicatively R99 per month), are not on sale. Before anything is sold we
              will publish its price, billing, cancellation and refund terms and show them before
              you pay. Paying will never earn extra points, a higher ranking or prize eligibility.
              [attorney review: subscription terms]
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">11. User Conduct & Prohibited Activities</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">You agree not to:</p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Use the Service for any illegal purpose or in violation of South African law</li>
              <li>Share content that is offensive, defamatory, or infringes on others' rights</li>
              <li>Manipulate predictions, odds, or PuntPoints through automated means or bots</li>
              <li>Create multiple accounts to abuse rewards or referral programs</li>
              <li>Impersonate others or provide false information</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service's operation</li>
              <li>Scrape, mine, or harvest data from the platform</li>
              <li>Share or encourage gambling by persons under 18</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">12. Responsible Gambling</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              Puntr is committed to promoting responsible gambling. We encourage all users to:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Bet only what you can afford to lose</li>
              <li>Never chase losses</li>
              <li>Take regular breaks from betting</li>
              <li>Seek help if gambling becomes a problem</li>
            </ul>
            <p className="leading-relaxed text-muted-foreground">
              <strong>Help Resources:</strong> National Responsible Gambling Programme:{" "}
              <span className="font-semibold">0800 006 008</span> (toll-free)
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">13. Intellectual Property</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              All content, features, and functionality of the Service, including but not limited to
              text, graphics, logos, icons, images, audio clips, and software, are the exclusive
              property of Puntr (Pty) Ltd and are protected by South African and international
              copyright, trademark, and other intellectual property laws.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              You may not reproduce, distribute, modify, create derivative works, or exploit any
              part of the Service without our express written permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">14. User-Generated Content</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              By posting predictions, comments, or other content on Puntr, you grant us a
              non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display
              such content in connection with the Service.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Predictions are a public, permanent record. The licence continues for the anonymised
              record after you delete your account, as described in our Privacy Policy.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              You represent that you own or have the necessary rights to all content you submit and
              that such content does not violate any third-party rights or applicable laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">15. Disclaimer of Warranties</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="leading-relaxed text-muted-foreground">
              Puntr does not guarantee that the Service will be uninterrupted, error-free, or
              secure. We do not warrant the accuracy, completeness, or reliability of predictions,
              odds, or other information provided.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">16. Limitation of Liability</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY SOUTH AFRICAN LAW, PUNTR (PTY) LTD SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR OTHER INTANGIBLE LOSSES ARISING
              FROM:
            </p>
            <ul className="mb-3 ml-5 list-disc space-y-1 text-muted-foreground">
              <li>Your use or inability to use the Service</li>
              <li>Betting losses incurred through third-party platforms</li>
              <li>Unauthorized access to or alteration of your account or data</li>
              <li>Errors or inaccuracies in odds, predictions, or other content</li>
              <li>Actions of third-party bookmakers or payment providers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">17. Indemnification</h2>
            <p className="leading-relaxed text-muted-foreground">
              You agree to indemnify, defend, and hold harmless Puntr (Pty) Ltd, its officers,
              directors, employees, and affiliates from any claims, damages, losses, liabilities,
              and expenses (including legal fees) arising from your use of the Service or violation
              of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">18. Termination</h2>
            <p className="leading-relaxed text-muted-foreground">
              We reserve the right to suspend or terminate your account and access to the Service at
              our sole discretion, without notice, for conduct that we believe violates these Terms,
              is harmful to other users, or is otherwise objectionable. You may delete your account
              at any time from your account page, or by contacting support.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">19. Governing Law & Dispute Resolution</h2>
            <p className="mb-3 leading-relaxed text-muted-foreground">
              These Terms are governed by and construed in accordance with the laws of the Republic
              of South Africa. Any disputes arising from these Terms or your use of the Service
              shall be subject to the exclusive jurisdiction of the courts of South Africa.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xl font-semibold">20. Changes to Terms</h2>
            <p className="leading-relaxed text-muted-foreground">
              We may update these Terms from time to time. We will notify you of material changes by
              posting the updated Terms on our website and updating the "Last Updated" date. Your
              continued use of the Service after changes constitutes acceptance of the updated
              Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold">21. Contact Information</h2>
            <p className="leading-relaxed text-muted-foreground">
              If you have questions about these Terms, please contact us at:{" "}
              <a href="mailto:support@puntr.co.za" className="font-semibold text-primary">
                support@puntr.co.za
              </a>
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
