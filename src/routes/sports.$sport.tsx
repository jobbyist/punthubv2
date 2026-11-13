import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  CalendarClock,
  Dumbbell,
  Flag,
  Goal,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { BadgeMarquee } from "@/components/motion/badge-marquee";
import { CountUp } from "@/components/motion/count-up";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { Reveal } from "@/components/motion/reveal";

import { AppShell } from "@/components/layout/app-shell";
import { LiveBadge } from "@/components/live-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { buildRoadmap, SPORT_ROADMAP, type RoadmapSport } from "@/lib/roadmap";
import { getRoadmapStatus } from "@/lib/roadmap.functions";

const SPORTS = SPORT_ROADMAP.map((s) => s.sport);

const SPORT_ICON: Record<string, LucideIcon> = {
  soccer: Goal,
  basketball: Activity,
  rugby: Flag,
  racing: Trophy,
  combat: Swords,
  cricket: Activity,
  tennis: Activity,
  athletics: Dumbbell,
};
const isSport = (v: string): v is RoadmapSport => (SPORTS as readonly string[]).includes(v);

export const Route = createFileRoute("/sports/$sport")({
  loader: async ({ params }) => {
    if (!isSport(params.sport)) throw notFound();
    return { status: await getRoadmapStatus(), sport: params.sport };
  },
  head: ({ match, params }) => {
    if (!isSport(params.sport)) return {};
    const t = headT(match.context.locale, "sports");
    const url = `https://puntr.co.za/sports/${params.sport}`;
    const title = t(`items.${params.sport}.metaTitle`);
    const description = t(`items.${params.sport}.metaDescription`);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                name: title,
                description,
                url,
                inLanguage: "en-ZA",
                about: { "@type": "Thing", name: t(`items.${params.sport}.name`) },
                isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: t("breadcrumb"),
                    item: "https://puntr.co.za/roadmap",
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: t(`items.${params.sport}.name`),
                    item: url,
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: SportPage,
});

function SportPage() {
  const { t } = useTranslation("sports");
  const { status, sport } = Route.useLoaderData();
  const items = buildRoadmap(status);
  const item = items.find((i) => i.sport === sport);
  const k = (key: string) => `items.${sport}.${key}`;
  const name = t(k("name"));
  const live = item?.stage === "live";
  const weeks =
    item && item.weeks[0] !== item.weeks[1]
      ? `${item.weeks[0]} to ${item.weeks[1]}`
      : String(item?.weeks[0] ?? 1);
  const list = (key: string) => t(k(key), { returnObjects: true }) as unknown as string[];

  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Puntr
        </Link>{" "}
        /{" "}
        <Link to="/roadmap" className="hover:underline">
          {t("breadcrumb")}
        </Link>{" "}
        / <span aria-current="page">{name}</span>
      </nav>

      <SportHero
        sport={sport}
        name={name}
        intro={t(k("intro"))}
        status={
          live ? (
            <>
              <LiveBadge /> {t("status.live")}
            </>
          ) : item?.stage === "launching" ? (
            t("status.launching", { date: formatDate(`${status.launch}T12:00:00+02:00`) })
          ) : item ? (
            t("status.window", {
              from: formatDate(`${item.from}T12:00:00+02:00`),
              to: formatDate(`${item.to}T12:00:00+02:00`),
            })
          ) : null
        }
        live={live}
        stats={[
          { icon: Trophy, value: list("competitions").length, label: t("stats.competitions") },
          { icon: BarChart3, value: list("markets").length, label: t("stats.markets") },
          {
            icon: CalendarClock,
            value: Number(item?.weeks[0] ?? 1),
            label: t("stats.week"),
          },
        ]}
      />

      {sport === "soccer" && <BadgeMarquee label={t("marquee")} />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <article className="space-y-8">
          <Reveal as="section">
            <h2 className="text-xl">{t("sections.sa")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(k("sa"))}</p>
          </Reveal>
          <Reveal as="section" delay={0.05}>
            <h2 className="text-xl">{t("sections.engine")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(k("engine"))}</p>
          </Reveal>
          <Reveal as="section" delay={0.1}>
            <h2 className="text-xl">{t("sections.when")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {live || sport === "soccer"
                ? t("whenBodyLive", { name })
                : t("whenBody", {
                    name,
                    weeks,
                    launch: formatDate(`${status.launch}T12:00:00+02:00`),
                  })}
            </p>
          </Reveal>
          <div className="flex flex-wrap gap-3">
            {sport === "soccer" ? (
              <Button asChild>
                <Link to="/predictions">{t("cta.predictions")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/join">{t("cta.join")}</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/roadmap">{t("cta.roadmap")}</Link>
            </Button>
          </div>
        </article>

        <Reveal as="div" delay={0.1} className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="text-base">{t("sections.competitions")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {list("competitions").map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="card-surface p-5">
            <h2 className="text-base">{t("sections.markets")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {list("markets").map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="card-surface p-5">
            <h2 className="text-base">{t("others")}</h2>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {SPORTS.filter((s) => s !== sport).map((s) => (
                <li key={s}>
                  <Link
                    to="/sports/$sport"
                    params={{ sport: s }}
                    className="text-primary hover:underline"
                  >
                    {t(`items.${s}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </AppShell>
  );
}

function SportHero({
  sport,
  name,
  intro,
  status,
  live,
  stats,
}: {
  sport: string;
  name: string;
  intro: string;
  status: ReactNode;
  live: boolean;
  stats: { icon: LucideIcon; value: number; label: string }[];
}) {
  const reduce = useReducedMotion();
  const Icon = SPORT_ICON[sport] ?? Trophy;
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] as const },
        };
  return (
    <header className="relative isolate -mx-4 overflow-hidden border-b border-border px-4 pb-10 pt-6 sm:-mx-6 sm:px-6">
      <HeroBackdrop variant={sport === "soccer" ? "pitch" : "grid"} />
      <motion.div {...rise(0)} className="flex items-center gap-3">
        <span
          className={`grid size-14 place-items-center bg-primary text-primary-foreground shadow-glow ${live ? "puntr-pulse" : ""}`}
        >
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <p className="inline-flex flex-wrap items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          {status}
        </p>
      </motion.div>
      <motion.h1 {...rise(0.08)} className="mt-5 text-[clamp(2.4rem,6vw,3.8rem)] leading-[1.02]">
        {name}
      </motion.h1>
      <motion.p
        {...rise(0.16)}
        className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg"
      >
        {intro}
      </motion.p>
      <motion.ul {...rise(0.24)} className="mt-7 grid max-w-xl grid-cols-3 gap-3">
        {stats.map((st) => (
          <li key={st.label} className="card-surface p-3 sm:p-4">
            <st.icon className="size-4 text-primary" aria-hidden="true" />
            <CountUp
              to={st.value}
              className="mt-1 block font-display text-2xl font-extrabold tnum"
            />
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {st.label}
            </span>
          </li>
        ))}
      </motion.ul>
    </header>
  );
}
