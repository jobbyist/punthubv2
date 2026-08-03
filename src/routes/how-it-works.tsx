import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How PuntHub Works | Predict. Earn. Win together." },
      {
        name: "description",
        content:
          "Sign up free, make predictions, earn PuntPoints, climb the leaderboards and earn 30% recurring referral revenue with PuntHub.",
      },
      { property: "og:title", content: "How PuntHub Works" },
      { property: "og:description", content: "Six steps from free sign-up to real rewards and recurring revenue." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  {
    title: "Sign Up For Free",
    body: "Create your free PuntHub account in seconds. Join a community of thousands of smart bettors.",
    bullets: ["100% free to join", "No credit card required"],
    aside: "Create your account",
  },
  {
    title: "Make Predictions",
    body: "Browse upcoming matches from all major sports. Share your picks and add your prediction.",
    bullets: ["Real-time odds from top platforms", "AI insights to help you decide"],
    aside: "Orlando Pirates vs Kaizer Chiefs · 1.62",
  },
  {
    title: "Earn PuntPoints",
    body: "Get rewarded for accurate predictions and active participation in the community.",
    bullets: ["Points for correct picks", "Bonus points for streaks & engagement"],
    aside: "+120 PP · Correct Prediction",
  },
  {
    title: "Climb The Leaderboards",
    body: "The more accurate you are, the higher you climb. Compete with others and prove you're #1.",
    bullets: ["Monthly & all-time leaderboards", "Great prizes up for grabs"],
    aside: "TipMaster87 · 12 450 PP",
  },
  {
    title: "Refer & Earn 30% Revenue",
    body: "Refer users to premium and earn 30% of their monthly subscription for as long as they remain active.",
    bullets: ["No limits on earnings", "Real monthly payouts"],
    aside: "Your Referral Earnings · R1 245.00",
  },
  {
    title: "Withdraw & Enjoy Rewards",
    body: "Cash out your earnings or spend your PuntPoints on exclusive rewards and prizes.",
    bullets: ["Cash withdrawals", "Exclusive rewards & perks"],
    aside: "Available Balance · 2 450 PP",
  },
];

function HowItWorks() {
  const { openEarlyAccess } = useSession();

  return (
    <AppShell>
      <h1 className="text-[clamp(2rem,4vw,2.4rem)]">How PuntHub Works</h1>
      <p className="mt-1 text-sm text-muted-foreground">Predict. Earn. Win together.</p>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        PuntHub brings all the top betting platforms in South Africa into one place. Make predictions, earn PuntPoints
        and 30% recurring revenue from your referrals.
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
            <div className="card-surface grid gap-5 p-5 md:grid-cols-[1.2fr_1fr] md:items-center">
              <div>
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
              <div className="grid min-h-[110px] place-items-center rounded-xl bg-primary-soft/60 p-5 text-center text-sm font-semibold text-primary">
                {s.aside}
              </div>
            </div>
          </motion.li>
        ))}
      </ol>

      <section className="card-surface mt-6 flex flex-wrap items-center gap-4 bg-primary-soft/50 p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">Bet Smarter. Earn More.</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            PuntHub is more than predictions. It's a community where knowledge wins and everyone benefits.
          </p>
        </div>
        <Button onClick={() => openEarlyAccess()}>Start predicting now</Button>
      </section>
    </AppShell>
  );
}
