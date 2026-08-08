import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, ShieldCheck, Sparkles, X } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Simple plans, maximum value | Puntr" },
      {
        name: "description",
        content:
          "Puntr plans: Free forever, Premium at R99/month and Puntr AI at R249/month with AI predictions, confidence scores and no ads.",
      },
      { property: "og:title", content: "Puntr Pricing — Simple pricing. Maximum value." },
      { property: "og:description", content: "Free, Premium R99/month and Puntr AI R249/month. Cancel anytime." },
    ],
  }),
  component: Pricing,
});

const plans = [
  {
    name: "Free Plan",
    tagline: "Perfect to get started",
    price: "R0",
    cta: "Get started",
    variant: "outline" as const,
    features: [
      "Access to basic predictions",
      "Top Picks (limited)",
      "Community access",
      "PuntPoints earning",
      "Basic leaderboards",
      "Standard odds from top platforms",
      "Ad supported experience",
    ],
    note: "Great for new punters exploring the community.",
  },
  {
    name: "Premium",
    tagline: "More predictions. More wins.",
    price: "R99",
    badge: "Most Popular",
    cta: "Go Premium",
    variant: "default" as const,
    features: [
      "Unlimited predictions",
      "Ad free browsing",
      "Top Picks (full access)",
      "Advanced match stats",
      "Referral programme (30%)",
      "Historical performance",
      "Priority support",
    ],
    note: "Best for serious punters who want more value and insights.",
  },
  {
    name: "Elite AI",
    tagline: "AI insights. Maximum edge.",
    price: "R249",
    badge: "New",
    cta: "Go Puntr AI",
    variant: "ink" as const,
    features: [
      "Unlimited AI predictions",
      "AI match analysis & bet builder",
      "AI confidence scores",
      "AI chat betting assistant",
      "Expected goals & probability engine",
      "Market analysis",
      "Priority AI queue",
    ],
    note: "The ultimate edge with AI powering your predictions.",
  },
];

const compare: [string, string, string, string][] = [
  ["Access to Predictions", "Limited", "Unlimited", "Unlimited"],
  ["Ad Free Browsing", "no", "yes", "yes"],
  ["Top Picks", "Limited", "Full Access", "Full Access"],
  ["AI-Powered Predictions", "no", "no", "yes"],
  ["AI Match Insights", "no", "no", "yes"],
  ["PuntPoints Booster", "1x", "1.2x", "1.5x"],
  ["Advanced Analytics", "no", "Basic", "Advanced"],
  ["Priority Support", "no", "yes", "yes"],
  ["Early Access to New Features", "no", "no", "yes"],
];

function Cell({ v }: { v: string }) {
  if (v === "yes") return <Check className="mx-auto size-4 text-primary" aria-label="Included" />;
  if (v === "no") return <X className="mx-auto size-4 text-destructive" aria-label="Not included" />;
  return <span className="text-sm">{v}</span>;
}

function Pricing() {
  const { openEarlyAccess } = useSession();

  return (
    <AppShell>
      <span className="inline-block rounded-md bg-primary-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
        Plans for every punter
      </span>
      <h1 className="mt-4 text-[clamp(2rem,4.5vw,2.7rem)] leading-tight">
        Simple pricing. <span className="text-primary">Maximum value.</span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Choose the plan you want reserved for the beta. Pricing below is what you'll pay at launch — nothing is charged
        today.
      </p>
      <div className="mt-4 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-2">
          <Check className="size-4 text-primary" /> Cancel anytime
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> No card required today
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/50 p-4">
        <ShieldCheck className="size-6 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">You're reserving a spot, not buying yet</p>
          <p className="text-xs text-muted-foreground">
            Early access is free. Pick a plan, submit your details, and our team reviews your request within 1–2 working
            days before sending your invite by email and SMS. Billing only starts if you choose to continue at launch.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-4">
        <ShieldCheck className="size-6 shrink-0 text-ink" />
        <div>
          <p className="text-sm font-semibold">30-Day Money Back Guarantee</p>
          <p className="text-xs text-muted-foreground">Not happy? Get a full refund within 30 days, no questions asked.</p>
        </div>
      </div>


      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {plans.map((p, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`card-surface flex flex-col p-6 ${p.badge === "Most Popular" ? "ring-2 ring-primary" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl">{p.name}</h2>
              {p.badge && (
                <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {p.badge}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-5 font-display text-4xl font-extrabold tnum">
              {p.price}
              <span className="text-base font-medium text-muted-foreground">/month</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">At launch. Free to reserve — no payment today.</p>
            <Button
              className={`mt-5 h-11 ${p.variant === "ink" ? "bg-ink text-ink-foreground hover:bg-ink/90" : ""}`}
              variant={p.variant === "outline" ? "outline" : "default"}
              onClick={() => openEarlyAccess(`Reserve your ${p.name} spot in the Puntr beta.`, p.name)}
            >
              {p.cta}
            </Button>
            <ul className="mt-5 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" /> {p.note}
            </p>
          </motion.div>
        ))}
      </div>

      <section className="card-surface mt-6 overflow-x-auto p-5">
        <h2 className="text-xl">Compare Plans</h2>
        <table className="mt-4 w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="py-2.5 text-left font-medium">Features</th>
              <th className="py-2.5 font-medium">Free<br />R0/month</th>
              <th className="py-2.5 font-medium">Premium<br />R99/month</th>
              <th className="py-2.5 font-medium">Elite AI<br />R249/month</th>
            </tr>
          </thead>
          <tbody>
            {compare.map((row) => (
              <tr key={row[0]} className="border-b border-border last:border-0">
                <td className="py-3 text-left">{row[0]}</td>
                <td className="py-3 text-center">
                  <Cell v={row[1]} />
                </td>
                <td className="py-3 text-center">
                  <Cell v={row[2]} />
                </td>
                <td className="py-3 text-center">
                  <Cell v={row[3]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card-surface mt-6 p-6">
        <div className="flex items-start gap-4">
          <Sparkles className="mt-1 size-8 shrink-0 text-primary" />
          <div>
            <h2 className="text-xl">🎉 Early Access Special Offer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Subscribe to any plan now and pay upfront to get a <span className="font-semibold text-foreground">50% lifetime discount</span> on your subscription fee.
            </p>
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-soft/50 p-3">
              <ShieldCheck className="size-5 shrink-0 text-primary" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Limited to the first 100 users</span> that claim this offer. Lock in your discount forever.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => openEarlyAccess("Claim your 50% lifetime discount on the Premium plan.", "Premium")}>
                Claim Premium at R49.50/month
              </Button>
              <Button 
                className="bg-ink text-ink-foreground hover:bg-ink/90"
                onClick={() => openEarlyAccess("Claim your 50% lifetime discount on the Elite AI plan.", "Elite AI")}
              >
                Claim Elite AI at R124.50/month
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="mt-2">
          {([
            ["What makes Elite AI different from Premium?", "Elite AI includes advanced AI-powered predictions, match analysis, confidence scores, an AI chat betting assistant, and priority access to AI features. It's designed for punters who want the ultimate competitive edge."],
            ["How do I earn PuntPoints?", "You earn PuntPoints by making accurate predictions, engaging with the community, referring friends, and participating in platform activities. Premium and Elite AI members earn points at higher multiplier rates."],
            ["Can I upgrade or downgrade my plan?", "Yes, you can change your plan anytime from your account settings. When upgrading, you'll be charged the prorated difference. When downgrading, the change takes effect at the end of your current billing period."],
            ["Are there any hidden fees?", "No hidden fees. What you see is what you pay. All prices are in South African Rand (ZAR) and include any applicable taxes."],
            ["How does the referral program work?", "Premium and Elite AI members can share their unique referral link. You'll earn 30% recurring commission on every Premium or Elite AI subscription from your referrals, paid monthly for as long as they remain active subscribers."],
            ["What platforms do you support?", "We aggregate odds and offers from all major South African bookmakers including Betway, Hollywoodbets, Supabets, Sportingbet, 1xBet, World Sports Betting, and many more."],
            ["Is the early access special offer really lifetime?", "Yes! Once you claim the 50% lifetime discount as one of the first 100 users, your discounted rate is locked in forever as long as you maintain an active subscription."],
            ["What happens if I don't win with your predictions?", "Puntr provides insights and community predictions to help inform your betting decisions, but we cannot guarantee wins. All predictions should be used as guidance, and you should always bet responsibly within your means."],
            ["Can I cancel my subscription anytime?", "Yes — cancel in one click from Settings. You keep access until the end of your billing period."],
            ["Is my payment information secure?", "Payments are processed by PCI-DSS compliant providers. Puntr never stores your card details."],
            ["Do you offer refunds?", "Yes, a full refund within 30 days of your first payment, no questions asked."],
            ["What payment methods do you accept?", "Visa, Mastercard, InstantEFT and Zapper."],
          ] as [string, string][]).map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-left text-sm">{q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </AppShell>
  );
}
