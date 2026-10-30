import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Award,
  BarChart3,
  Brain,
  Gift,
  Heart,
  Lightbulb,
  LineChart,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/about")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "about");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/about" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: About,
});

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

const WHY = [
  [BarChart3, "data"],
  [Users, "community"],
  [Brain, "ai"],
  [Gift, "recognition"],
] as const;

const PRINCIPLES = [
  [Users, "community"],
  [Shield, "transparency"],
  [Heart, "responsible"],
  [Lightbulb, "innovation"],
  [Award, "recognition"],
  [BarChart3, "evidence"],
] as const;

const LAYERS = ["data", "record", "community", "board", "points", "ai", "pro"] as const;

/** What is covered at launch. Names are proper nouns and are not translated. Other sports follow after launch (see /roadmap and src/lib/roadmap.ts). */
const COMPETITIONS = [
  ["Betway Premiership", "soccer"],
  ["Premier League", "soccer"],
  ["UEFA Champions League", "soccer"],
  ["Rugby", "soon"],
  ["Horse racing", "soon"],
] as const;

const TECH = [
  ["React", "react"],
  ["TypeScript", "ts"],
  ["Tailwind CSS", "tailwind"],
  ["TanStack", "tanstack"],
  ["Supabase", "supabase"],
  ["Vercel", "vercel"],
] as const;

const KNOWLEDGE = [
  [Target, "predict"],
  [TrendingUp, "compete"],
  [LineChart, "learn"],
  [Gift, "recognised"],
] as const;

const POINTS = [
  [Target, "accuracy"],
  [Users, "engagement"],
  [Gift, "referrals"],
] as const;

/** Fictional names and numbers, labelled as an example on the page. */
const EXAMPLE_BOARD = [
  { rank: 1, username: "ExampleTipster1", accuracy: 0.78, predictions: 342 },
  { rank: 2, username: "ExampleTipster2", accuracy: 0.76, predictions: 289 },
  { rank: 3, username: "ExampleTipster3", accuracy: 0.74, predictions: 401 },
] as const;

function About() {
  const { t } = useTranslation("about");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden bg-background">
      {/* Hero */}
      <section className="relative min-h-[85vh] overflow-hidden bg-[#111111] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#16A34A] opacity-10 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[1.05] tracking-tight">
              {t("hero.title1")}
              <br />
              {t("hero.title3")} <span className="text-[#16A34A]">{t("hero.title2")}</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-300">
              <Trans
                t={t}
                i18nKey="hero.body"
                components={{ 1: <strong className="font-semibold text-[#16A34A]" /> }}
              />
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-13 bg-[#16A34A] px-8 text-base hover:bg-[#16A34A]/90"
                onClick={() => navigate({ to: "/join" })}
              >
                {t("hero.cta")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                asChild
              >
                <a href="#ecosystem">{t("hero.meet")}</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Why we exist */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="text-[clamp(2rem,4vw,3rem)] font-bold leading-tight">
                {t("why.title1")} <span className="text-primary">{t("why.title2")}</span>{" "}
                {t("why.title3")}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t("why.p1")}</p>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("why.p2")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {WHY.map(([Icon, key]) => (
                <motion.div
                  key={key}
                  whileHover={{ y: -4 }}
                  className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <Icon className="size-8 text-primary" strokeWidth={1.5} />
                  <h3 className="mt-3 font-semibold">{t(`why.${key}.title`)}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t(`why.${key}.body`)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Mission and vision */}
        <motion.section {...fade} className="py-16">
          <div className="grid gap-8 rounded-2xl bg-[#111111] p-8 text-white lg:grid-cols-2 lg:p-12">
            <div className="relative">
              <div className="absolute -left-4 -top-4 text-[120px] font-extrabold leading-none text-[#16A34A] opacity-10">
                P
              </div>
              <div className="relative">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#16A34A]">
                  {t("mission.title")}
                </h3>
                <p className="mt-4 text-xl font-semibold leading-relaxed lg:text-2xl">
                  <Trans
                    t={t}
                    i18nKey="mission.body"
                    components={{ 1: <span className="text-[#16A34A]" /> }}
                  />
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#16A34A]">
                {t("mission.visionTitle")}
              </h3>
              <p className="mt-4 text-xl font-semibold leading-relaxed lg:text-2xl">
                {t("mission.vision")}
              </p>
            </div>
          </div>
        </motion.section>

        {/* Principles */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("principles.title1")}{" "}
              <span className="text-primary">{t("principles.title2")}</span>.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map(([Icon, key]) => (
              <motion.div
                key={key}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t(`principles.${key}.title`)}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t(`principles.${key}.body`)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Ecosystem */}
        <motion.section {...fade} id="ecosystem" className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("ecosystem.title1")} <span className="text-primary">{t("ecosystem.title2")}</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("ecosystem.body")}</p>
          </div>
          <div className="mx-auto mt-12 max-w-4xl">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="space-y-4">
                {LAYERS.map((key, index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="group relative flex items-center gap-4 rounded-xl border border-border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Zap className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold group-hover:text-primary">
                        {t(`ecosystem.${key}.title`)}
                      </h4>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t(`ecosystem.${key}.body`)}
                      </p>
                    </div>
                    {index < LAYERS.length - 1 && (
                      <div className="absolute -bottom-2 left-9 h-4 w-0.5 bg-border" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Sports */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("sports.title1")} <span className="text-primary">{t("sports.title2")}</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("sports.body")}</p>
          </div>
          <div className="mt-12">
            <div className="rounded-xl border border-border bg-card p-8">
              <h3 className="text-center text-sm font-bold uppercase tracking-wider text-muted-foreground">
                {t("sports.heading")}
              </h3>
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {COMPETITIONS.map(([name, sport]) => (
                  <div
                    key={name}
                    className="flex flex-col items-center justify-center rounded-lg border border-border bg-background p-4 text-center transition-all hover:border-primary hover:shadow-md"
                  >
                    <Trophy className="size-8 text-primary opacity-60" />
                    <p className="mt-2 text-xs font-medium">{name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {sport === "soon" ? tc("comingSoon") : tc(`sport.${sport}`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Technology */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("tech.title1")} <span className="text-primary">{t("tech.title2")}</span>{" "}
              {t("tech.title3")}.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">{t("tech.body")}</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TECH.map(([name, key], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{name}</h3>
                    <p className="text-xs font-medium text-primary">{t(`tech.${key}.cat`)}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`tech.${key}.body`)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it fits together */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("fits.title1")} <span className="text-primary">{t("fits.title2")}</span>
            </h2>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="rounded-2xl border border-border bg-card p-8">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                {(
                  [
                    ["core", ["c1", "c2", "c3", "c4"]],
                    ["infra", ["i1", "i2", "i3", "i4"]],
                  ] as const
                ).flatMap(([group, items], gi) => [
                  gi === 1 ? (
                    <div key="divider" className="hidden lg:flex lg:items-center lg:justify-center">
                      <div className="h-full w-0.5 bg-border" />
                    </div>
                  ) : null,
                  <div key={group} className="rounded-lg border border-border bg-background p-4">
                    <h4 className="font-semibold">{t(`fits.${group}`)}</h4>
                    <div className="mt-3 space-y-2 text-sm">
                      {items.map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="size-2 rounded-full bg-primary" />
                          <span className="text-muted-foreground">{t(`fits.${i}`)}</span>
                        </div>
                      ))}
                    </div>
                  </div>,
                ])}
              </div>
            </div>
          </div>
        </motion.section>

        {/* Knowledge */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
                {t("knowledge.title1")}{" "}
                <span className="text-primary">{t("knowledge.title2")}</span>.
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {t("knowledge.body")}
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {KNOWLEDGE.map(([Icon, key]) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="size-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{t(`knowledge.${key}.title`)}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {t(`knowledge.${key}.body`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold">{t("knowledge.board")}</h3>
                <span className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {tc("badge.example")}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {EXAMPLE_BOARD.map((user) => (
                  <div
                    key={user.rank}
                    className="flex items-center gap-3 rounded-lg bg-muted/30 p-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-xs font-bold tnum">
                      {user.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{user.username}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("knowledge.accuracy", { value: `${Math.round(user.accuracy * 100)}%` })}{" "}
                        · {t("knowledge.predictions", { count: user.predictions })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{t("knowledge.sample")}</p>
            </div>
          </div>
        </motion.section>

        {/* PuntPoints */}
        <motion.section {...fade} className="py-16">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 lg:p-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
                {t("points.title1")} <span className="text-primary">{t("points.title2")}</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("points.body")}</p>
              <div className="mt-10 grid gap-6 sm:grid-cols-3">
                {POINTS.map(([Icon, key]) => (
                  <div key={key} className="rounded-xl border border-border bg-card p-6">
                    <div className="mx-auto grid size-12 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="size-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-4 font-semibold">{t(`points.${key}.title`)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`points.${key}.body`)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Final CTA */}
      <section className="bg-[#111111] text-white">
        <div className="mx-auto max-w-[1400px] px-4 py-20 text-center sm:px-6 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-extrabold leading-tight">
              {t("cta.title1")} <span className="text-[#16A34A]">{t("cta.title2")}</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-300">{t("cta.body")}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                size="lg"
                className="h-13 bg-[#16A34A] px-8 text-base hover:bg-[#16A34A]/90"
                onClick={() => navigate({ to: "/join" })}
              >
                {t("cta.join")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                asChild
              >
                <Link to="/predictions">{t("cta.explore")}</Link>
              </Button>
            </div>
            <p className="mt-8 text-sm font-semibold text-[#16A34A]">{tc("brand.tagline")}</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
