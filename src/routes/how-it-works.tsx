import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/how-it-works" }],
    meta: [
      { title: "How Puntr works | Predict smarter. Prove it." },
      {
        name: "description",
        content:
          "Sign up with an email code, post a pick before kick-off, and let it lock and settle automatically. Climb the weekly leaderboard. 18+.",
      },
      { property: "og:title", content: "How Puntr works" },
      { property: "og:description", content: "Four steps from sign-up to a public, locked record." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  {
    title: "Sign up with an email code. 18+",
    body: "Enter your email and we send you a one-time code. You confirm that you are 18 or older. No password.",
    bullets: ["Free for Founding Members", "No card needed"],
  },
  {
    title: "Post a pick before kick-off",
    body: "Choose a fixture, a market and a selection, then enter the odds you got.",
    bullets: ["Soccer and rugby at launch", "Picks close at kick-off"],
  },
  {
    title: "It locks and settles automatically",
    body: "Your pick is timestamped and locked. After the match it is graded from the official result.",
    bullets: ["No edits, no deletes", "Corrections are logged, never overwritten"],
  },
  {
    title: "Climb the weekly leaderboard",
    body: "Your units, ROI and sample size are public. The leaderboard resets every Monday.",
    bullets: ["Ranked on units, then ROI", "Needs 10 settled picks to qualify"],
  },
];

const markets = [
  ["Match result (1X2)", "Soccer and rugby"],
  ["Over/Under 2.5", "Soccer only"],
  ["Handicap", "Rugby only"],
  ["Both teams to score", "Soccer only"],
  ["Double chance", "Soccer"],
] as const;

const rules = [
  "Every pick is worth 1 unit at the odds you entered.",
  "Won: you gain (odds - 1) units. Example: 2.10 gives +1.10 units.",
  "Lost: you lose 1 unit.",
  "Void: 0 units. This covers a match that is postponed, abandoned or cancelled.",
  "Picks are graded from the official full-time result.",
  "If a result is corrected, the correction is logged as a new entry. The earlier entry is never overwritten.",
];

function HowItWorks() {
  const { openEarlyAccess } = useSession();

  return (
    <AppShell>
      <h1 className="text-[clamp(2rem,4vw,2.4rem)]">How Puntr works</h1>
      <p className="mt-1 text-sm text-muted-foreground">Predict smarter. Prove it.</p>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Every pick is locked at kick-off, graded automatically and kept forever. Puntr does not take bets or handle
        money.
      </p>

      <ol className="relative mt-8 space-y-4 border-l border-border pl-6 sm:pl-8">
        {steps.map((s, i) => (
          <motion.li
            key={s.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <span className="absolute -left-[34px] grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground tnum sm:-left-[42px]">
              {i + 1}
            </span>
            <div className="card-surface p-5">
              <h2 className="text-xl">{s.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <ul className="mt-3 space-y-1.5">
                {s.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </ol>

      <section id="grading" className="card-surface mt-8 scroll-mt-24 p-6" aria-labelledby="grading-title">
        <h2 id="grading-title" className="text-2xl">
          How we grade picks
        </h2>

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Markets</h3>
        <ul className="mt-2 divide-y divide-border border border-border">
          {markets.map(([name, scope]) => (
            <li key={name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-medium">{name}</span>
              <span className="text-muted-foreground">{scope}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rules</h3>
        <ul className="mt-2 space-y-2">
          {rules.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {r}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface mt-6 flex flex-wrap items-center gap-4 bg-primary-soft/50 p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">Build a record people can trust.</h3>
          <p className="mt-1 text-sm text-muted-foreground">18+. Gamble responsibly: 0800 006 008.</p>
        </div>
        <Button onClick={() => openEarlyAccess()}>Get started for free</Button>
      </section>
    </AppShell>
  );
}
