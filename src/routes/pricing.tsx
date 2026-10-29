import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/pricing" }],
    meta: [
      { title: "Pricing - free for Founding Members | Puntr" },
      {
        name: "description",
        content:
          "Puntr is free for the first 100 Founding Members. Credits for optional extras are coming later. Posting, voting and the leaderboard are always free.",
      },
      { property: "og:title", content: "Puntr pricing - free for Founding Members" },
      {
        property: "og:description",
        content: "Claim one of 100 Founding spots. Posting, voting and the leaderboard are always free.",
      },
    ],
  }),
  component: Pricing,
});

const founding = [
  "A permanent Founding badge, numbered #1 to #100",
  "Full access to posting, your record and the weekly leaderboard",
  "30 free credits a month for 3 months once credits launch",
];

const packs = [
  ["Starter", "R25", "25 credits"],
  ["Match Day", "R60", "65 credits"],
  ["Season", "R120", "140 credits"],
] as const;

const uses = [
  ["AI match preview", "5 credits"],
  ["AI slip check", "3 credits"],
  ["Deep tipster stats", "2 credits"],
] as const;

const faqs = [
  ["Is Puntr free?", "Yes. Founding Members use Puntr free. Posting, voting and the leaderboard are always free."],
  [
    "When do credits launch?",
    "Not at launch. We will announce credits and their terms before anything goes on sale. The prices here are indicative.",
  ],
  [
    "Can paying improve my ranking?",
    "No. Paying will never earn extra points or prize eligibility. Credits only unlock optional extras.",
  ],
  ["Is Puntr a bookmaker?", "No. Puntr does not take bets, set odds or hold betting funds."],
];

function Pricing() {
  return (
    <AppShell>
      <PageHeading
        title="Pricing"
        subtitle="Free for the first 100 Founding Members. Paid extras come later and are optional."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-surface flex flex-col p-6" aria-labelledby="founding-title">
          <span className="w-fit bg-primary-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            Open now
          </span>
          <h2 id="founding-title" className="mt-3 text-2xl">
            Founding Members - free
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">100 spots. No card needed.</p>
          <ul className="mt-5 space-y-3">
            {founding.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {f}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full sm:w-auto" asChild>
            <a href="/join">Claim a Founding spot</a>
          </Button>
        </section>

        <section className="card-surface flex flex-col p-6" aria-labelledby="credits-title">
          <span className="w-fit bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Coming soon
          </span>
          <h2 id="credits-title" className="mt-3 text-2xl">
            Credits - coming soon
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Indicative prices. They may change before launch.</p>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Packs</p>
          <ul className="mt-2 divide-y divide-border border border-border">
            {packs.map(([name, price, cr]) => (
              <li key={name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{name}</span>
                <span className="tnum">
                  {price} = {cr}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What they buy</p>
          <ul className="mt-2 divide-y divide-border border border-border">
            {uses.map(([name, cost]) => (
              <li key={name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{name}</span>
                <span className="tnum">{cost}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm font-semibold">Posting, voting and the leaderboard are always free.</p>
        </section>
      </div>

      <p className="mt-6 border border-border bg-primary-soft/50 p-4 text-sm font-semibold">
        Paying will never earn extra points or prize eligibility.
      </p>

      <section className="mt-10" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-xl">
          Pricing questions
        </h2>
        <dl className="mt-4 divide-y divide-border border border-border">
          {faqs.map(([q, a]) => (
            <div key={q} className="p-4">
              <dt className="text-sm font-semibold">{q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </AppShell>
  );
}
