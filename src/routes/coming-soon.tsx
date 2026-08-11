import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Activity, ArrowRight, BarChart3, Brain, Sparkles, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";

export const Route = createFileRoute("/coming-soon")({
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search.feature === "string" ? search.feature : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Coming Soon — The Future of Sports Intelligence | Puntr" },
      {
        name: "description",
        content:
          "Puntr brings sports data, predictions, insights and betting intelligence together in one experience built for the modern South African sports fan.",
      },
      { property: "og:title", content: "Coming Soon — The Future of Sports Intelligence | Puntr" },
      {
        property: "og:description",
        content: "Sports data, predictions and betting intelligence in one place. Join Puntr early access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComingSoon,
});

function FloatingCard({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 6, delay, repeat: Infinity, ease: "easeInOut" },
      }}
      className={`absolute rounded-2xl border border-border/70 bg-card/80 p-3 shadow-soft backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}

function ComingSoon() {
  const { openEarlyAccessPopup } = useSession();
  const feature = useSearch({ from: "/coming-soon" })["feature"];

  return (
    <AppShell>
      <section className="relative overflow-hidden">
        {/* Ambient gradient glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-24 top-0 size-[420px] rounded-full bg-primary/25 blur-[110px]"
          />
          <motion.div
            animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-20 bottom-0 size-[380px] rounded-full bg-accent/30 blur-[120px]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--color-border)_60%,transparent)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        </div>

        <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            >
              <Sparkles className="size-3.5" /> Coming soon
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              The future of sports intelligence is{" "}
              <span className="text-primary">almost here.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Puntr brings sports data, predictions, insights and betting intelligence together in one experience built
              for the modern South African sports fan.
            </motion.p>

            {feature && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                <span className="text-foreground">{feature}</span> is in the build queue
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button
                size="lg"
                className="h-12 px-6 text-[15px]"
                onClick={() =>
                  openEarlyAccessPopup(
                    feature
                      ? `${feature} lands first for early access members. Reserve your spot.`
                      : "Limited early-access spots — reserve yours now.",
                  )
                }
              >
                Join Early Access <ArrowRight className="size-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px]">
                <Link to="/predictions">Explore Puntr</Link>
              </Button>
            </motion.div>

            <p className="mt-4 text-xs text-muted-foreground">
              Free to reserve — no card required. 18+ only. Bet responsibly.
            </p>
          </div>

          {/* Abstract animated data visual */}
          <div className="relative mx-auto h-[380px] w-full max-w-md sm:h-[440px]">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              className="absolute inset-8 rounded-full border border-dashed border-primary/25"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
              className="absolute inset-16 rounded-full border border-border"
            />
            <motion.div
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-1/2 top-1/2 grid size-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-3xl border border-primary/30 bg-card/90 shadow-soft backdrop-blur"
            >
              <Brain className="size-10 text-primary" strokeWidth={1.5} />
            </motion.div>

            <FloatingCard className="left-0 top-4 w-[190px]" delay={0.2}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-3.5 text-primary" /> Model confidence
              </div>
              <p className="mt-1 text-2xl font-bold tnum text-primary">87.4%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: "12%" }}
                  animate={{ width: ["12%", "87%", "62%", "87%"] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </FloatingCard>

            <FloatingCard className="bottom-8 left-2 w-[170px]" delay={0.5}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <BarChart3 className="size-3.5 text-primary" /> Form index
              </div>
              <div className="mt-2 flex h-12 items-end gap-1">
                {[40, 65, 30, 82, 55, 92, 48].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ height: [`${h * 0.5}%`, `${h}%`, `${h * 0.7}%`] }}
                    transition={{ duration: 3.5, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
                    className="flex-1 rounded-sm bg-primary/60"
                  />
                ))}
              </div>
            </FloatingCard>

            <FloatingCard className="right-0 top-24 w-[200px]" delay={0.8}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next prediction</p>
              <p className="mt-1 text-sm font-semibold">Sundowns vs Pirates</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">Home win</span>
                <span className="font-bold tnum">1.85</span>
              </div>
            </FloatingCard>

            <FloatingCard className="bottom-2 right-4 w-[160px]" delay={1.1}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Value edge</p>
              <p className="mt-1 text-xl font-bold tnum text-primary">+12.6%</p>
            </FloatingCard>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
