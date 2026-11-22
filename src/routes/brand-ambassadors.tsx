import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Gift, Handshake, Megaphone, Users } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";

export const Route = createFileRoute("/brand-ambassadors")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/brand-ambassadors" }],
    meta: [
      { title: "Brand Ambassadors | Puntr" },
      { name: "description", content: "Represent Puntr as a creator, influencer, tipster or community voice. Discover the ambassador assessment process and programme benefits." },
    ],
  }),
  component: BrandAmbassadorsPage,
});

const requirements = [
  "Be at least 18 years old and based in a market where the programme is approved.",
  "Have an authentic audience or credible contribution to sports, content or community culture.",
  "Communicate responsibly. No guaranteed-win claims, misleading performance claims or pressure to gamble.",
  "Be willing to disclose sponsored content and follow Puntr brand and responsible-play guidelines.",
];

function BrandAmbassadorsPage() {
  return (
    <AppShell>
      <PageHeading art="gift" title="Represent the game. Build with Puntr." subtitle="The Puntr Brand Ambassador Programme is for creators, influencers, tipsters and community builders who want to help shape a more accountable sports culture." />
      <div className="mx-auto max-w-5xl space-y-7">
        <section className="relative overflow-hidden border border-primary/30 bg-card p-6 sm:p-9">
          <div className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-primary/10 blur-3xl" />
          <p className="relative text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Puntr community partners</p>
          <h2 className="relative mt-3 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">Your voice. Your community. A bigger game.</h2>
          <p className="relative mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            We are building a network of people who can introduce Puntr to the right audiences, create useful sports content and help grow a community built around transparent, timestamped predictions.
          </p>
          <div className="relative mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg"><a href="mailto:support@puntr.co.za?subject=PUNTR%20Brand%20Ambassador%20Application">Apply to become an ambassador <ArrowRight className="ml-2 size-4" /></a></Button>
            <Button asChild size="lg" variant="outline"><Link to="/how-it-works">See how Puntr works</Link></Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, title: "Influencers", body: "Creators with an engaged audience and a genuine connection to sport." },
            { icon: Megaphone, title: "Content creators", body: "Video makers, publishers, streamers and social-first storytellers." },
            { icon: BadgeCheck, title: "Tipsters", body: "Sports analysts who value transparent records over unverified claims." },
            { icon: Handshake, title: "Community voices", body: "Organisers, fans and connectors who bring people together." },
          ].map(({ icon: Icon, title, body }) => (
            <article key={title} className="card-surface p-5">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">What selected ambassadors can receive</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The programme is designed around a mix of predictable collaboration and measurable outcomes. Benefits are agreed individually and are subject to selection, campaign scope and a written agreement.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Fixed monthly retainer", "A fixed monthly fee for ambassadors who complete the qualification process and agree to an ongoing scope of work."],
              ["Performance-based rewards", "Additional bonuses and commissions linked to agreed campaign outcomes and eligible referrals."],
              ["Vouchers and merchandise", "Free vouchers, Puntr merchandise and community drops where available."],
              ["Partner-sponsored campaigns", "Sponsored giveaways and activations supported by Puntr affiliates and commercial partners."],
            ].map(([title, body]) => (
              <div key={title} className="border border-border p-4">
                <Gift className="size-5 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">A 30–45 day qualification period</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Applications are reviewed first. Shortlisted candidates then enter a 30–45 day assessment period so we can evaluate consistency, content quality, audience fit, engagement, professionalism and responsible brand conduct.</p>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ["01", "Apply", "Share your platforms, audience profile, content examples and why you want to work with Puntr."],
              ["02", "Demonstrate", "Create or participate in agreed trial activity during the assessment period."],
              ["03", "Get selected", "Successful candidates may receive an ambassador offer with a defined retainer, deliverables and performance terms."],
            ].map(([number, title, body]) => (
              <li key={number} className="border border-border p-4">
                <span className="font-display text-2xl font-black text-primary">{number}</span>
                <h3 className="mt-2 font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card-surface p-5 sm:p-7">
          <h2 className="text-xl font-bold">Who we are looking for</h2>
          <ul className="mt-4 space-y-3">
            {requirements.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />{item}</li>)}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Applying does not guarantee selection, a retainer, commission or rewards. Retainers, deliverables, payment terms, commission eligibility and campaign benefits are confirmed in writing for each selected ambassador. Any referral commission is governed by the separate approved referral or affiliate agreement.</p>
        </section>

        <section className="border border-border bg-primary-soft/40 p-6 text-center sm:p-8">
          <h2 className="text-2xl font-black">Ready to build with Puntr?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Send us your social links, audience overview, location and two or three examples of your best work. We will review your application and respond if there is a fit.</p>
          <Button asChild size="lg" className="mt-5"><a href="mailto:support@puntr.co.za?subject=PUNTR%20Brand%20Ambassador%20Application">Send your application <ArrowRight className="ml-2 size-4" /></a></Button>
        </section>
        <RgNotice variant="compact" />
      </div>
    </AppShell>
  );
}
