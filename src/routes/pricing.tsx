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
    name: "Puntr AI",
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
        Choose the plan that fits your game and start winning more.
      </p>
      <div className="mt-4 flex flex-wrap gap-5 text-sm">
        <span className="flex items-center gap-2">
          <Check className="size-4 text-primary" /> Cancel anytime
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Secure payments
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-border p-4">
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
            <p className="mt-1 text-xs text-muted-foreground">Billed monthly. Cancel anytime.</p>
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
              <th className="py-2.5 font-medium">Puntr AI<br />R249/month</th>
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

      <section className="card-surface mt-6 flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg">Ready to step up your game?</h2>
          <p className="text-sm text-muted-foreground">
            Join thousands of smart punters making better decisions every day.
          </p>
        </div>
        <Button onClick={() => openEarlyAccess()}>Start free</Button>
        <Button variant="outline" onClick={() => openEarlyAccess()}>
          Go Premium
        </Button>
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="text-xl">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="mt-2">
          {([
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
