import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SlidersHorizontal, Star, TrendingUp } from "lucide-react";

import { AffiliateBanner } from "@/components/affiliate";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { GateValue, Locked } from "@/components/locked";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { featuredPredictions, popularPredictions } from "@/lib/mock-data";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "All Predictions | Puntr" },
      {
        name: "description",
        content:
          "Browse today's top community and AI-backed betting predictions across football, rugby, cricket and more.",
      },
      { property: "og:title", content: "All Predictions | Puntr" },
      { property: "og:description", content: "Top value bets with the highest AI confidence and community backing." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All Predictions",
          description:
            "Community and AI-backed betting predictions across football, rugby, cricket and more.",
          url: "https://punthubv2.lovable.app/predictions",
          isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://punthubv2.lovable.app/" },
        }),
      },
    ],
  }),
  component: Predictions,
});

const filters = ["All", "Top Picks", "Today", "Tomorrow", "This Week"];

function Predictions() {
  const { isGuest } = useSession();

  const cards = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {featuredPredictions.map((p, i) => (
        <motion.article
          key={p.home}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          whileHover={{ y: -3 }}
          className="card-surface p-4"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {p.league} • {p.kickoff}
            </span>
            <Star className="size-4 fill-primary text-primary" />
          </div>
          <div className="mt-4 flex items-center justify-around gap-2 text-center">
            <div className="min-w-0">
              <span className="mx-auto block size-10 rounded-full bg-ink" />
              <p className="mt-2 truncate text-sm font-semibold">{p.home}</p>
            </div>
            <span className="text-xs text-muted-foreground">vs</span>
            <div className="min-w-0">
              <span className="mx-auto block size-10 rounded-full bg-[oklch(0.8_0.16_85)]" />
              <p className="mt-2 truncate text-sm font-semibold">{p.away}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">Top Pick</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{p.pick}</p>
              <GateValue className="text-sm font-bold text-primary tnum">{p.odds.toFixed(2)}</GateValue>
            </div>
            <p className="text-xs text-muted-foreground">{p.market}</p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">AI Confidence</span>
              <GateValue className="font-semibold tnum">{p.confidence}%</GateValue>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.confidence}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <span className="size-7 rounded-full bg-muted" />
            <span className="flex-1 truncate text-sm">{p.tipster}</span>
            <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
              {p.badge}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground tnum">Most Backed · {p.backed.toLocaleString()} predictions</p>
          <Button variant="outline" className="mt-3 w-full">
            View Prediction
          </Button>
        </motion.article>
      ))}
    </div>
  );

  return (
    <AppShell>
      <PageHeading
        title="All Predictions"
        subtitle="Discover top predictions from the community and AI insights you can trust."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {filters.map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === 0 ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="flex-1" />
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <SlidersHorizontal className="size-4" /> Filters
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <TrendingUp className="size-4" /> Trending
        </button>
      </div>

      <section className="card-surface mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg">Featured Predictions</h2>
          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
            AI Curated
          </span>
          <span className="flex-1" />
          <button className="text-xs font-medium text-primary">View all</button>
        </div>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Top value bets with the highest AI confidence and community backing.
        </p>
        {isGuest ? cards : <Locked intensity="md">{cards}</Locked>}
      </section>

      <AffiliateBanner />

      <section className="card-surface mt-6 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg">Popular Predictions</h2>
            <p className="text-sm text-muted-foreground">See what the community is backing right now.</p>
          </div>
          <button className="text-xs font-medium text-primary">View all</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">Match</th>
                <th className="px-3 py-2.5 font-medium">Market</th>
                <th className="px-3 py-2.5 font-medium">Tip</th>
                <th className="px-3 py-2.5 font-medium">Odds</th>
                <th className="px-3 py-2.5 font-medium">AI Conf.</th>
                <th className="px-5 py-2.5 font-medium">Backed by</th>
              </tr>
            </thead>
            <tbody>
              {popularPredictions.map((r) => (
                <tr key={r.match} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-5 py-3">
                    <p className="text-[11px] text-muted-foreground">{r.league}</p>
                    <p className="font-medium">{r.match}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r.market}</td>
                  <td className="px-3 py-3">{r.tip}</td>
                  <td className="px-3 py-3">
                    <GateValue className="rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold text-primary tnum">
                      {r.odds.toFixed(2)}
                    </GateValue>
                  </td>
                  <td className="px-3 py-3">
                    <GateValue className="font-semibold text-primary tnum">{r.conf}%</GateValue>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground tnum">{r.backed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
