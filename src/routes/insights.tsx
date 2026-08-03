import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { BellRing, Filter, Gauge, Lock, Search, ShieldOff, Sparkles, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "AI Insights | PuntHub" },
      {
        name: "description",
        content: "Advanced AI analytics, value finders, market trends and performance tracking for PuntHub members.",
      },
      { property: "og:title", content: "AI Insights | PuntHub" },
      { property: "og:description", content: "Advanced insights, AI analytics and value betting tools." },
    ],
  }),
  component: Insights,
});

const perks = [
  [Sparkles, "AI-Powered Insights", "Advanced analytics and machine learning predictions."],
  [Lock, "Premium Predictions", "Exclusive picks from top performing tipsters."],
  [TrendingUp, "Market Trends", "Real-time market movement and smart alerts."],
  [Filter, "Advanced Filters", "Powerful filters to find the best betting opportunities."],
  [Search, "Value Finder", "Discover +EV bets across multiple bookmakers."],
  [BellRing, "Custom Alerts", "Get notified about odds movements that matter."],
  [Gauge, "Performance Tracking", "Track your bets, ROI and long-term performance."],
  [ShieldOff, "Ad-Free Experience", "Enjoy a clean, distraction-free betting experience."],
] as const;

function Insights() {
  const { openEarlyAccess } = useSession();

  return (
    <AppShell>
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center">
        <motion.span
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto grid size-28 place-items-center rounded-full bg-primary-soft text-primary"
        >
          <Lock className="size-10" strokeWidth={1.5} />
        </motion.span>
        <h1 className="mx-auto mt-7 max-w-xl text-[clamp(1.9rem,4.5vw,2.6rem)] leading-tight">
          This feature is only available to <span className="text-primary">our members</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Get full access to advanced insights, AI analytics, value betting tools and more.
        </p>
        <div className="mx-auto mt-7 flex max-w-xs flex-col gap-3">
          <Button size="lg" className="h-12" onClick={() => openEarlyAccess()}>
            Get early access
          </Button>
          <Button size="lg" variant="outline" className="h-12" onClick={() => openEarlyAccess()}>
            Join the beta group
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Join thousands of smart punters already winning with PuntHub.
        </p>
      </motion.section>

      <section className="card-surface p-6">
        <h2 className="text-lg">Members get access to:</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {perks.map(([Icon, title, body]) => (
            <div key={title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
