import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, CalendarDays, CreditCard, Mail, ShieldCheck, XCircle } from "lucide-react";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — 30-Day Money Back Guarantee | Puntr" },
      {
        name: "description",
        content:
          "Puntr's refund policy: a full 30-day money back guarantee on your first subscription payment, how to request a refund, timelines and exclusions.",
      },
      { property: "og:title", content: "Refund Policy — 30-Day Money Back Guarantee | Puntr" },
      {
        property: "og:description",
        content: "Full refund within 30 days of your first payment, no questions asked. Here's exactly how it works.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Refunds,
});

const steps = [
  {
    icon: Mail,
    title: "1. Send us a request",
    body: "Email support@puntr.co.za from the address on your account, or use the Support page. Include your full name and the plan you're on.",
  },
  {
    icon: BadgeCheck,
    title: "2. We confirm within 1 working day",
    body: "No interrogation, no retention script. We confirm receipt and cancel any upcoming billing immediately.",
  },
  {
    icon: CreditCard,
    title: "3. Money back in 5–10 working days",
    body: "Refunds are returned to the original payment method. Bank clearing times are outside our control.",
  },
];

const exclusions = [
  "Requests made more than 30 days after your first payment on a plan.",
  "Renewal payments on a plan you have already used for a full billing cycle (cancel before renewal to avoid the charge).",
  "PuntPoints, rewards, promotional credits and bonus items, which hold no cash value.",
  "Accounts closed or suspended for breach of our Terms, including fraud, abuse or multiple-account use.",
  "Third-party bookmaker deposits, wagers or losses — Puntr never holds your betting funds.",
];

function Refunds() {
  return (
    <AppShell>
      <PageHeading
        title="Refund Policy"
        subtitle="Our 30-day money back guarantee, in plain language."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-16 sm:px-6">
        <section className="rounded-2xl border border-primary/30 bg-primary-soft/50 p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <ShieldCheck className="mt-0.5 size-8 shrink-0 text-primary" strokeWidth={1.6} />
            <div>
              <h2 className="text-xl font-semibold">30-Day Money Back Guarantee</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                If a paid Puntr plan isn't for you, tell us within 30 days of your first payment and we'll refund it in
                full — no questions asked. This applies to every paid subscription tier advertised on our{" "}
                <Link to="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
                  pricing page
                </Link>
                .
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-3.5 text-primary" /> Early access is free — no payment is taken while you
                reserve your spot.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How to claim a refund</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-card p-5">
                <s.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground">What's covered</h2>
            <p className="mt-2">
              The guarantee covers the first payment you make on any Puntr subscription plan, whether billed monthly or
              annually. You keep access to your plan until the end of the day the refund is approved, after which your
              account reverts to the free tier. You may use the guarantee once per account.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Cancelling without a refund</h2>
            <p className="mt-2">
              You can cancel a subscription at any time from your account settings. Cancelling stops all future billing
              and you retain access until the end of the period you've already paid for. Cancelling on its own does not
              trigger a refund — request one explicitly if you're inside the 30-day window.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Annual plans</h2>
            <p className="mt-2">
              Annual plans carry the same 30-day guarantee from the date of first payment. After day 30, annual plans are
              non-refundable for the remainder of the term, but you can cancel to prevent renewal.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Exclusions</h2>
            <ul className="mt-2 space-y-2">
              {exclusions.map((e) => (
                <li key={e} className="flex gap-2.5">
                  <XCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Important: Puntr is not a bookmaker</h2>
            <p className="mt-2">
              Puntr sells access to predictions, insights and community tools. We do not accept wagers or hold betting
              balances. Money lost betting with a third-party bookmaker cannot be refunded by Puntr under any
              circumstances. Bet responsibly — 18+ only.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Your consumer rights</h2>
            <p className="mt-2">
              Nothing in this policy limits your rights under the South African Consumer Protection Act 68 of 2008 or the
              Electronic Communications and Transactions Act 25 of 2002. Where those rights are broader than this
              policy, they apply.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground">Disputes</h2>
            <p className="mt-2">
              If you're unhappy with a refund decision, reply to our email and ask for it to be escalated. We respond to
              escalations within 5 working days. See our{" "}
              <Link to="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
                Terms
              </Link>{" "}
              for the full agreement.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
          <h2 className="text-lg font-semibold">Need a refund or have a question?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Our team replies to every refund request within one working day.
          </p>
          <Button asChild className="mt-4">
            <Link to="/support">Contact support</Link>
          </Button>
        </section>

        <p className="text-center text-xs text-muted-foreground">Last updated: August 2026</p>
      </div>
    </AppShell>
  );
}
