import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Flame, Target, Trophy, Zap } from "lucide-react";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Locked } from "@/components/locked";
import { useSession } from "@/components/session";
import { topTipsters } from "@/lib/mock-data";

export const Route = createFileRoute("/leaderboards")({
  head: () => ({
    meta: [
      { title: "Leaderboard | Puntr" },
      {
        name: "description",
        content: "See the top predictors earning the most PuntPoints this month on Puntr.",
      },
      { property: "og:title", content: "Leaderboard | Puntr" },
      { property: "og:description", content: "Top predictors earning the most PuntPoints this month." },
    ],
  }),
  component: Leaderboards,
});

const stats = [
  { icon: Trophy, label: "Your Rank", value: "#24", sub: "Top 6%" },
  { icon: Zap, label: "Your PuntPoints", value: "2 450 PP", sub: "↑ 280 this month" },
  { icon: Target, label: "Hit Rate", value: "62%", sub: "29/47 correct" },
  { icon: Flame, label: "Current Streak", value: "12", sub: "Best: 18" },
];

function Leaderboards() {
  const { isGuest } = useSession();

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Rank</th>
            <th className="px-4 py-3 font-medium">Predictor</th>
            <th className="px-4 py-3 font-medium">PuntPoints</th>
            <th className="px-4 py-3 font-medium">Hit Rate</th>
            <th className="px-4 py-3 font-medium">Correct</th>
            <th className="px-4 py-3 font-medium">Current Streak</th>
          </tr>
        </thead>
        <tbody>
          {topTipsters.map((t, i) => (
            <motion.tr
              key={t.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-b border-border last:border-0 hover:bg-muted/50"
            >
              <td className="px-4 py-3">
                <span
                  className={`grid size-7 place-items-center rounded-full text-xs font-bold tnum ${
                    t.rank === 1
                      ? "bg-[oklch(0.85_0.16_90)] text-ink"
                      : t.rank === 3
                        ? "bg-[oklch(0.85_0.08_50)] text-ink"
                        : "bg-muted"
                  }`}
                >
                  {t.rank}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="size-8 rounded-full bg-muted" />
                  <span className="font-semibold">{t.name}</span>
                  {t.rank === 1 && (
                    <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Top Predictor
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 font-semibold text-primary tnum">{t.points.toLocaleString()} PP</td>
              <td className="px-4 py-3 tnum">{t.hitRate}%</td>
              <td className="px-4 py-3 tnum">{t.correct}</td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 tnum">
                  <Flame className="size-4 text-primary" /> {t.streak}
                </span>
              </td>
            </motion.tr>
          ))}
          <tr className="bg-primary-soft/60">
            <td className="px-4 py-3">
              <span className="grid size-7 place-items-center rounded-full bg-background text-xs font-bold tnum">24</span>
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-full bg-background" />
                <span className="font-semibold">You</span>
              </div>
            </td>
            <td className="px-4 py-3 font-semibold text-primary tnum">2 450 PP</td>
            <td className="px-4 py-3 tnum">62%</td>
            <td className="px-4 py-3 tnum">29/47</td>
            <td className="px-4 py-3">
              <span className="flex items-center gap-1 tnum">
                <Flame className="size-4 text-primary" /> 12
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-muted-foreground">Showing 1 to 10 of 250 predictors</p>
    </div>
  );

  return (
    <AppShell>
      <PageHeading title="Leaderboard" subtitle="Top predictors earning the most PuntPoints this month." />

      <div className="mb-6 flex flex-wrap gap-2">
        {["Overall", "This Month", "This Week", "All Time"].map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              i === 0 ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card-surface mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-extrabold tnum">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-[11px] text-primary">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="card-surface overflow-hidden">
        {isGuest ? table : <Locked label="Create a free account to see the full leaderboard." intensity="sm">{table}</Locked>}
      </section>

      <section className="card-surface mt-6 p-6 text-center">
        <h2 className="text-2xl">How PuntPoints Work</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Earn PuntPoints for accurate predictions and active participation.
        </p>
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Make Predictions", "Submit your picks on upcoming matches across all sports."],
            ["Earn Points", "Get points for correct predictions based on odds and difficulty."],
            ["Climb the Ranks", "Climb the leaderboard and unlock exclusive rewards."],
            ["Win Rewards", "Redeem your points for cash, bonuses and premium perks."],
          ].map(([title, body]) => (
            <div key={title}>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Trophy className="size-5" />
              </span>
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
