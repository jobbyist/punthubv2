import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  Brain,
  Compass,
  Crown,
  DatabaseZap,
  FlaskConical,
  Gift,
  HandCoins,
  Heart,
  Lightbulb,
  LineChart,
  ListOrdered,
  Lock,
  SearchCheck,
  Shield,
  Star,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { useEffect } from "react";

import { ExplainerVideo } from "@/components/explainer-video";
import { PartnerLogo } from "@/components/partner-logo";
import { Button } from "@/components/ui/button";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import { analytics } from "@/lib/analytics";
import { money } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { DEFAULT_LAUNCH_DATE } from "@/lib/launch";
import { SPORT_ROADMAP, weekWindow } from "@/lib/roadmap";
import { soccerCoverage } from "@/lib/sports/coverage";

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
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://puntr.co.za/about" },
        { property: "og:site_name", content: "Puntr" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("meta.ogTitle") },
        { name: "twitter:description", content: t("meta.description") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "Puntr",
                url: "https://puntr.co.za/",
                sameAs: [
                  "https://x.com/puntrza",
                  "https://instagram.com/puntrza",
                  "https://tiktok.com/@puntrza",
                  "https://t.me/puntrza",
                ],
              },
              {
                "@type": "AboutPage",
                url: "https://puntr.co.za/about",
                name: t("meta.ogTitle"),
                description: t("meta.description"),
              },
            ],
          }),
        },
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
  [DatabaseZap, "data"],
  [Users, "community"],
  [Brain, "ai"],
  [Award, "recognition"],
] as const;

const JOURNEY = [
  [Compass, "discover"],
  [LineChart, "analyse"],
  [Lock, "predict"],
  [Trophy, "prove"],
] as const;

const PRINCIPLES = [
  [Users, "community"],
  [Shield, "transparency"],
  [Heart, "responsible"],
  [Lightbulb, "innovation"],
  [Award, "recognition"],
  [BarChart3, "evidence"],
] as const;

type Layer = {
  key: string;
  icon: LucideIcon;
  to:
    | "/discover"
    | "/teams"
    | "/tables"
    | "/fixtures"
    | "/predictions"
    | "/duels"
    | "/leaderboards"
    | "/practice"
    | "/puntpoints"
    | "/pricing";
  badge?: "badgeFounding" | "badgePro";
};

/** Every layer links to the live page that delivers it, so the About page never describes something hidden. */
const LAYERS: readonly Layer[] = [
  { key: "discover", icon: Compass, to: "/discover" },
  { key: "teams", icon: Star, to: "/teams" },
  { key: "tables", icon: ListOrdered, to: "/tables" },
  { key: "analysis", icon: LineChart, to: "/fixtures" },
  { key: "record", icon: Lock, to: "/predictions" },
  { key: "duels", icon: Swords, to: "/duels" },
  { key: "board", icon: Trophy, to: "/leaderboards" },
  { key: "practice", icon: FlaskConical, to: "/practice", badge: "badgeFounding" },
  { key: "points", icon: Gift, to: "/puntpoints" },
  { key: "pro", icon: Crown, to: "/pricing", badge: "badgePro" },
];

const PFIE_STEPS = [
  [SearchCheck, "collect"],
  [BadgeCheck, "check"],
  [DatabaseZap, "publish"],
] as const;

/** Football launch leagues come from the coverage registry, so this page stays in step with /sports/soccer. */
const COVERAGE = soccerCoverage();
const LAUNCH_LEAGUES = COVERAGE.filter((c) => c.phase === "launch");
const POST_LAUNCH_COUNT = COVERAGE.filter((c) => c.phase === "post-launch").length;

const MONTHS: Record<string, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  af: ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"],
};

/** "Jan–Feb 2027" from two YYYY-MM-DD dates (string maths only, so server and browser agree). */
function monthWindow(from: string, to: string, lang: string): string {
  const names = MONTHS[lang.startsWith("af") ? "af" : "en"]!;
  const [fy, fm] = from.split("-").map(Number) as [number, number];
  const [ty, tm] = to.split("-").map(Number) as [number, number];
  const a = names[fm - 1]!;
  const b = names[tm - 1]!;
  if (fy !== ty) return `${a} ${fy} – ${b} ${ty}`;
  return fm === tm ? `${a} ${ty}` : `${a}–${b} ${ty}`;
}

/** Later sports, grouped by shared launch window (basketball and rugby share one). */
const ROADMAP_WINDOWS = (() => {
  const map = new Map<string, { from: string; to: string; sports: string[] }>();
  for (const { sport, weeks } of SPORT_ROADMAP) {
    if (sport === "soccer") continue;
    const { from, to } = weekWindow(DEFAULT_LAUNCH_DATE, weeks);
    const entry = map.get(from) ?? { from, to, sports: [] };
    entry.sports.push(sport);
    map.set(from, entry);
  }
  return [...map.values()];
})();

/** Ten logo slots for the partnership network. Replace with approved partner logos as agreements are confirmed. */
const PARTNER_SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);

const KNOWLEDGE = [
  [Target, "predict"],
  [TrendingUp, "compete"],
  [LineChart, "learn"],
  [Award, "recognised"],
] as const;

const POINTS = [
  [Target, "accuracy"],
  [Users, "engagement"],
  [Trophy, "tipsters"],
] as const;

/** Fictional names and numbers, labelled as an example on the page. */
const EXAMPLE_BOARD = [
  { rank: 1, username: "ExampleTipster1", accuracy: 0.78, predictions: 342 },
  { rank: 2, username: "ExampleTipster2", accuracy: 0.76, predictions: 289 },
  { rank: 3, username: "ExampleTipster3", accuracy: 0.74, predictions: 401 },
] as const;

function AboutExplainer() {
  return (
    <div className="mx-auto mt-8 max-w-3xl overflow-hidden bg-black">
      <ExplainerVideo />
    </div>
  );
}

function SectionTitle({ a, b, c, body }: { a: string; b: string; c?: string; body?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold leading-tight">
        {a} <span className="text-primary">{b}</span>
        {c ? ` ${c}` : "."}
      </h2>
      {body && <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{body}</p>}
    </div>
  );
}

function About() {
  const { t, i18n } = useTranslation("about");
  const { t: tc } = useTranslation("common");
  const { t: tr } = useTranslation("roadmap");
  const navigate = useNavigate();
  const aboutLogos = useBrandLogos("about").filter((l) => l.active && l.imageUrl);

  useEffect(() => {
    analytics.aboutPageViewed();
  }, []);

  return (
    <div className="overflow-hidden bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#111111] text-white">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#16A34A] opacity-10 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 pb-14 pt-16 sm:px-6 lg:pb-20 lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-4xl text-center"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4ADE80]">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-4 text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[1.05] tracking-tight">
              {t("hero.title1")}
              <br />
              {t("hero.title3")} <span className="text-[#16A34A]">{t("hero.title2")}</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
              <Trans
                t={t}
                i18nKey="hero.body"
                components={{ 1: <strong className="font-semibold text-[#4ADE80]" /> }}
              />
            </p>
            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="h-12 bg-[#16A34A] px-8 text-base hover:bg-[#16A34A]/90"
                onClick={() => navigate({ to: "/join" })}
              >
                {t("hero.cta")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-white/20 bg-transparent px-8 text-base text-white hover:bg-white/10"
                asChild
              >
                <a href="#how-it-works">{t("hero.meet")}</a>
              </Button>
            </div>
          </motion.div>

          <ul className="mx-auto mt-12 grid max-w-4xl gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {(
              [
                [Trophy, t("hero.stats.leagues", { count: LAUNCH_LEAGUES.length })],
                [Lock, t("hero.stats.locked")],
                [BadgeCheck, t("hero.stats.launch")],
              ] as const
            ).map(([Icon, label]) => (
              <li
                key={label}
                className="flex items-center gap-3 bg-[#111111] px-5 py-4 text-left text-sm font-semibold"
              >
                <Icon className="size-5 shrink-0 text-[#4ADE80]" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
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

        {/* How it works */}
        <motion.section {...fade} id="how-it-works" className="scroll-mt-24 py-16">
          <SectionTitle a={t("journey.title1")} b={t("journey.title2")} body={t("journey.body")} />
          <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map(([Icon, key], i) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <span className="font-display text-4xl font-extrabold text-muted-foreground/20 tnum">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{t(`journey.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`journey.${key}.body`)}
                </p>
              </motion.li>
            ))}
          </ol>
        </motion.section>

        {/* Mission and vision */}
        <motion.section {...fade} className="py-16">
          <div className="grid gap-8 rounded-2xl bg-[#111111] p-8 text-white lg:grid-cols-2 lg:p-12">
            <div className="relative">
              <div
                className="absolute -left-4 -top-4 text-[120px] font-extrabold leading-none text-[#16A34A] opacity-10"
                aria-hidden="true"
              >
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

        {/* Ecosystem */}
        <motion.section {...fade} id="ecosystem" className="py-16 lg:py-24">
          <SectionTitle
            a={t("ecosystem.title1")}
            b={t("ecosystem.title2")}
            body={t("ecosystem.body")}
          />
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {LAYERS.map(({ key, icon: Icon, to, badge }, index) => (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index % 5) * 0.06 }}
              >
                <Link
                  to={to}
                  className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:hover:translate-y-0 sm:flex-col sm:gap-0 sm:p-5"
                >
                  <div className="flex shrink-0 items-start justify-between gap-2 sm:w-full">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </span>
                    {badge && (
                      <span className="hidden rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                        {t(`ecosystem.${badge}`)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 sm:mt-4 sm:flex sm:w-full sm:flex-col">
                    <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold group-hover:text-primary">
                      {t(`ecosystem.${key}.title`)}
                      {badge && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:hidden">
                          {t(`ecosystem.${badge}`)}
                        </span>
                      )}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:flex-1">
                      {t(`ecosystem.${key}.body`)}
                    </p>
                    <span className="mt-4 hidden items-center gap-1 text-xs font-bold text-primary sm:inline-flex">
                      {t("ecosystem.open")}
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <ArrowRight
                    className="mt-3 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:hidden"
                    aria-hidden="true"
                  />
                </Link>
              </motion.li>
            ))}
          </ul>
        </motion.section>
      </div>

      {/* PFIE */}
      <motion.section {...fade} className="bg-[#111111] text-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#4ADE80]">
              {t("pfie.eyebrow")}
            </p>
            <h2 className="mt-3 text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-tight">
              {t("pfie.title")}
            </h2>
            <p className="mt-4 leading-relaxed text-gray-300">{t("pfie.body")}</p>
            <Button
              asChild
              variant="outline"
              className="mt-6 border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              <Link to="/sports/$sport" params={{ sport: "soccer" }}>
                {t("pfie.cta")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <ol className="grid gap-3 sm:grid-cols-3">
            {PFIE_STEPS.map(([Icon, key], i) => (
              <li key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-[#16A34A]/15 text-[#4ADE80]">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold text-white/40 tnum">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{t(`pfie.${key}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-300">
                  {t(`pfie.${key}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </motion.section>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Sports */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <SectionTitle a={t("sports.title1")} b={t("sports.title2")} body={t("sports.body")} />
          <div className="mt-12 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">{t("sports.footballTitle")}</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
                  {t("sports.fromLaunch")}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("sports.footballBody", { count: LAUNCH_LEAGUES.length })}
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {LAUNCH_LEAGUES.map((c) => (
                  <li
                    key={c.key}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold"
                  >
                    {c.name}
                  </li>
                ))}
                {POST_LAUNCH_COUNT > 0 && (
                  <li className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {t("sports.postLaunch", { count: POST_LAUNCH_COUNT })}
                  </li>
                )}
              </ul>
              <Button asChild className="mt-6">
                <Link to="/sports/$sport" params={{ sport: "soccer" }}>
                  {t("sports.explore")}
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h3 className="text-lg font-bold">{t("sports.roadmapTitle")}</h3>
              <ol className="mt-4 space-y-3">
                {ROADMAP_WINDOWS.map((w) => (
                  <li
                    key={w.from}
                    className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-semibold">
                      {w.sports.map((s) => tr(`sport.${s}.name`)).join(" · ")}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tnum">
                      {t("sports.planned", { when: monthWindow(w.from, w.to, i18n.language) })}
                    </span>
                  </li>
                ))}
              </ol>
              <Link
                to="/roadmap"
                className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                {t("sports.roadmap")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </motion.section>

        {/* Explainer video */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">{t("video.title")}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("video.body")}</p>
          </div>
          <AboutExplainer />
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

        {/* PuntPoints and referrals */}
        <motion.section {...fade} className="py-16">
          <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
                {t("points.title1")} <span className="text-primary">{t("points.title2")}</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">{t("points.body")}</p>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
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
            <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-5 rounded-xl border border-primary/30 bg-card p-6 sm:flex-row sm:items-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <HandCoins className="size-6" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  {t("refer.eyebrow")}
                </p>
                <h3 className="mt-1 text-lg font-bold">{t("refer.title")}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t("refer.body")}
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link to="/referrals">{t("refer.cta")}</Link>
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Principles */}
        <motion.section {...fade} className="py-16 lg:py-24">
          <SectionTitle a={t("principles.title1")} b={t("principles.title2")} />
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

        {/* Foundation and partners */}
        <motion.section {...fade} className="py-16">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold">
              {t("tech.title1")} <span className="text-primary">{t("tech.title2")}</span>{" "}
              {t("tech.title3")}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-muted-foreground">{t("tech.body")}</p>
          </div>
          <ul
            className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            aria-label={t("tech.logosLabel")}
          >
            {aboutLogos.length > 0
              ? aboutLogos.map((l) => (
                  <li key={l.id} className="card-surface group grid h-20 place-items-center p-3">
                    <PartnerLogo src={l.imageUrl ?? ""} alt={l.name} loading="lazy" />
                  </li>
                ))
              : PARTNER_SLOTS.map((n) => (
                  <li
                    key={n}
                    className="grid h-20 place-items-center rounded-xl border border-dashed border-border bg-card text-xs font-medium text-muted-foreground"
                  >
                    {t("tech.logoPlaceholder", { n })}
                  </li>
                ))}
          </ul>
        </motion.section>

        {/* How it fits together */}
        <motion.section {...fade} className="py-16">
          <SectionTitle a={t("fits.title1")} b={t("fits.title2")} />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
            {(
              [
                ["core", ["c1", "c2", "c3", "c4"]],
                ["infra", ["i1", "i2", "i3", "i4"]],
              ] as const
            ).map(([group, items]) => (
              <div key={group} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-semibold">{t(`fits.${group}`)}</h3>
                <ul className="mt-4 space-y-2.5 text-sm">
                  {items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="text-muted-foreground">{t(`fits.${i}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Launch and Founding Member offer */}
      <section className="puntr-reveal border-t border-border bg-background">
        <div className="mx-auto max-w-[900px] px-4 py-16 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {t("launch.eyebrow")}
          </p>
          <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.6rem)] font-bold">{t("launch.title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {t("launch.body", {
              pass: money(299),
              annual: money(1188),
              monthly: money(99),
              saving: money(889),
            })}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                analytics.aboutFoundingCtaClicked();
                void navigate({ to: "/join" });
              }}
            >
              {t("launch.free")}
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/pricing">{t("launch.pricing")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/newsroom" onClick={() => analytics.aboutNewsroomClicked()}>
                {t("launch.newsroom")}
              </Link>
            </Button>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t("launch.note")}
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="puntr-reveal bg-[#111111] text-white">
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
