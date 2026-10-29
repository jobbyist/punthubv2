import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Activity, ArrowRight, BarChart3, Brain, Sparkles, TrendingUp } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Em } from "@/components/em";
import { headT } from "@/lib/i18n/head";
import { odds, pct } from "@/lib/format";

export const Route = createFileRoute("/coming-soon")({
  validateSearch: (search: Record<string, unknown>) => ({
    feature: typeof search["feature"] === "string" ? (search["feature"] as string) : undefined,
  }),
  head: ({ match }) => {
    const t = headT(match.context.locale, "comingsoon");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/coming-soon" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
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

const FEATURE_KEYS = [
  "aiPicks",
  "podcast",
  "bookmakers",
  "tools",
  "liveScores",
  "puntPoints",
  "referrals",
  "feedback",
];

function ComingSoon() {
  const navigate = useNavigate();
  const { t } = useTranslation("comingsoon");
  const featureId = useSearch({ from: "/coming-soon" })["feature"];
  // Only known ids are shown, so the query string can't inject text into the page.
  const feature =
    featureId && FEATURE_KEYS.includes(featureId) ? t(`features.${featureId}`) : undefined;

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
              <Sparkles className="size-3.5" /> {t("badge")}
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              {t("title1")} <span className="text-primary">{t("title2")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              <Trans t={t} i18nKey="body" components={{ 1: <Em /> }} />
            </motion.p>

            {feature && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <Activity className="size-3.5 text-primary" />
                <Trans
                  t={t}
                  i18nKey="queue"
                  values={{ feature }}
                  components={{ 1: <span className="text-foreground" /> }}
                />
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
                onClick={() => navigate({ to: "/join" })}
              >
                {t("cta")} <ArrowRight className="size-4" />
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px]">
                <Link to="/predictions">{t("explore")}</Link>
              </Button>
            </motion.div>

            <p className="mt-4 text-xs text-muted-foreground">{t("fine")}</p>
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
                <TrendingUp className="size-3.5 text-primary" /> {t("card.confidence")}
              </div>
              <p className="mt-1 text-2xl font-bold tnum text-primary">{pct(0.874, 1)}</p>
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
                <BarChart3 className="size-3.5 text-primary" /> {t("card.form")}
              </div>
              <div className="mt-2 flex h-12 items-end gap-1">
                {[40, 65, 30, 82, 55, 92, 48].map((h, i) => (
                  <motion.span
                    key={i}
                    animate={{ height: [`${h * 0.5}%`, `${h}%`, `${h * 0.7}%`] }}
                    transition={{
                      duration: 3.5,
                      delay: i * 0.15,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    className="flex-1 rounded-sm bg-primary/60"
                  />
                ))}
              </div>
            </FloatingCard>

            <FloatingCard className="right-0 top-24 w-[200px]" delay={0.8}>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("card.next")}
              </p>
              <p className="mt-1 text-sm font-semibold">Sundowns vs Pirates</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 font-semibold text-primary">
                  {t("card.homeWin")}
                </span>
                <span className="font-bold tnum">{odds(1.85)}</span>
              </div>
            </FloatingCard>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
