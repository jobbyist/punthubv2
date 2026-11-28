import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  FileSearch,
  Gamepad2,
  Goal,
  ScanText,
  ShieldCheck,
  Swords,
  Table2,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { CompetitionLive, SoccerCoverageLive } from "@/lib/sports/coverage-data";
import { COVERAGE_PHASES, soccerMarkets, type CoveragePhase } from "@/lib/sports/coverage";
import { cn } from "@/lib/utils";

const EASE = [0.2, 0.8, 0.2, 1] as const;

/** Live stat tiles for the soccer hero, counted from the database on each request. */
export function SoccerStats({ live }: { live: SoccerCoverageLive }) {
  const { t } = useTranslation("sports");
  const launch = live.competitions.filter((c) => c.phase === "launch").length;
  const tiles: { icon: LucideIcon; value: number; label: string }[] = [
    { icon: Trophy, value: launch, label: t("soccer.stats.launch") },
    { icon: CalendarClock, value: live.totals.upcoming, label: t("soccer.stats.upcoming") },
    { icon: ShieldCheck, value: live.totals.results, label: t("soccer.stats.results") },
    { icon: Users, value: live.totals.teams, label: t("soccer.stats.teams") },
  ];
  return (
    <ul className="mt-7 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((st) => (
        <li key={st.label} className="card-surface p-3 sm:p-4">
          <st.icon className="size-4 text-primary" aria-hidden="true" />
          <CountUp to={st.value} className="mt-1 block font-display text-2xl font-extrabold tnum" />
          <span className="block text-[11px] leading-tight text-muted-foreground">{st.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Competitions by phase, with live fixture and table counts. */
export function CoverageBoard({ live }: { live: SoccerCoverageLive }) {
  const { t } = useTranslation("sports");
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<CoveragePhase>("launch");
  const shown = live.competitions.filter((c) => c.phase === phase);
  const count = (p: CoveragePhase) => live.competitions.filter((c) => c.phase === p).length;

  return (
    <section aria-labelledby="coverage-title" className="space-y-4">
      <div>
        <h2 id="coverage-title" className="text-xl">
          {t("soccer.coverage.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("soccer.coverage.lead")}</p>
      </div>
      <LayoutGroup id="coverage-phase">
        <div
          role="tablist"
          aria-label={t("soccer.coverage.title")}
          className="flex gap-1 overflow-x-auto border-b border-border"
        >
          {COVERAGE_PHASES.map((p) => {
            const on = p === phase;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={on}
                aria-controls="coverage-panel"
                onClick={() => setPhase(p)}
                className={cn(
                  "relative shrink-0 px-3 py-2 text-sm font-semibold transition-colors",
                  on ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`soccer.coverage.phase.${p}`)}
                <span className="ml-1.5 text-xs tnum text-muted-foreground">{count(p)}</span>
                {on && (
                  <motion.span
                    layoutId="coverage-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>
      <p className="text-sm text-muted-foreground">{t(`soccer.coverage.phaseLead.${phase}`)}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={phase}
          id="coverage-panel"
          role="tabpanel"
          className="grid gap-3 sm:grid-cols-2"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.25, ease: EASE }}
        >
          {shown.map((c, i) => (
            <motion.li
              key={c.key}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.035, ease: EASE }}
            >
              <CompetitionCard c={c} />
            </motion.li>
          ))}
        </motion.ul>
      </AnimatePresence>
    </section>
  );
}

function CompetitionCard({ c }: { c: CompetitionLive }) {
  const { t } = useTranslation("sports");
  const active = c.phase !== "planned";
  return (
    <article className="card-surface group flex h-full flex-col gap-3 p-4 transition-shadow hover:shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CompetitionBadge name={c.name} showName={false} />
          <h3 className="mt-2 truncate text-base">{c.name}</h3>
          <p className="text-xs text-muted-foreground">{t(`soccer.coverage.region.${c.region}`)}</p>
        </div>
        {c.phase === "launch" && (
          <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden="true" />
        )}
      </div>
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {!active
            ? t("soccer.coverage.notYet")
            : c.upcoming > 0
              ? t("soccer.coverage.fixtures", { count: c.upcoming })
              : t("soccer.coverage.noFixtures")}
        </li>
        {active && (
          <li className="flex items-center gap-1.5">
            <Table2 className="size-3.5" aria-hidden="true" />
            {c.tableTeams > 0
              ? t("soccer.coverage.table", { count: c.tableTeams })
              : c.table
                ? t("soccer.coverage.tablePending")
                : t("soccer.coverage.cupFormat")}
          </li>
        )}
      </ul>
      {active && (
        <div className="mt-auto flex flex-wrap gap-3 text-xs font-semibold">
          <Link
            to="/fixtures"
            search={{ comp: c.name }}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {t("soccer.coverage.viewFixtures")}
            <ArrowRight
              className="size-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          {c.tableTeams > 0 && c.phase === "launch" && (
            <Link
              to="/tables"
              search={{ league: c.key }}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {t("soccer.coverage.viewTable")}
              <ArrowRight className="size-3" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

type FeatureKey = "predict" | "duels" | "practice" | "tables" | "teams";
const FEATURES: { key: FeatureKey; icon: LucideIcon; to: string }[] = [
  { key: "predict", icon: Goal, to: "/fixtures" },
  { key: "duels", icon: Swords, to: "/duels" },
  { key: "practice", icon: Gamepad2, to: "/practice" },
  { key: "tables", icon: BarChart3, to: "/tables" },
  { key: "teams", icon: Users, to: "/teams" },
];

/** What members can do with football: predictions, duels, practice, tables. */
export function SoccerFeatures({ extra = [] }: { extra?: typeof FEATURES }) {
  const { t } = useTranslation("sports");
  const list = [...FEATURES, ...extra];
  return (
    <section aria-labelledby="features-title">
      <h2 id="features-title" className="text-xl">
        {t("soccer.features.title")}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {list.map((f, i) => (
          <Reveal as="li" key={f.key} delay={i * 0.05}>
            <Link
              to={f.to}
              className="card-surface group flex h-full flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5"
            >
              <span className="grid size-9 place-items-center bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="text-base">{t(`soccer.features.${f.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`soccer.features.${f.key}.body`)}</p>
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-primary">
                {t(`soccer.features.${f.key}.cta`)}
                <ArrowRight
                  className="size-3 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

/** Markets and the odds rules. */
export function SoccerMarketsAndOdds() {
  const { t } = useTranslation("sports");
  const { t: tm } = useTranslation("match");
  const odds = t("soccer.odds.items", { returnObjects: true }) as unknown as string[];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Reveal as="section" className="card-surface p-5">
        <h2 className="text-lg">{t("soccer.markets.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("soccer.markets.lead")}</p>
        <ul className="mt-3 space-y-2">
          {soccerMarkets().map((m) => (
            <li key={m} className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
              {tm(`market.${m}`)}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal as="section" delay={0.05} className="card-surface p-5">
        <h2 className="text-lg">{t("soccer.odds.title")}</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {odds.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Reveal>
    </div>
  );
}

const STEP_ICONS: LucideIcon[] = [FileSearch, ScanText, ShieldCheck, CheckCircle2];

/** PFIE pipeline in four steps, drawn as a connected line that fills in on scroll. */
export function PfieSteps({ checkedAt }: { checkedAt: string }) {
  const { t } = useTranslation("sports");
  const reduce = useReducedMotion();
  const steps = t("soccer.engine.steps", { returnObjects: true }) as unknown as {
    title: string;
    body: string;
  }[];
  return (
    <section aria-labelledby="engine-title" className="space-y-4">
      <h2 id="engine-title" className="text-xl">
        {t("soccer.engine.title")}
      </h2>
      <ol className="relative grid gap-4 sm:grid-cols-4">
        <motion.span
          aria-hidden="true"
          className="absolute left-4 right-4 top-[18px] hidden h-px origin-left bg-primary/40 sm:block"
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: EASE }}
        />
        {steps.map((s, i) => {
          const Icon = STEP_ICONS[i] ?? CheckCircle2;
          return (
            <Reveal as="li" key={s.title} delay={i * 0.12} className="relative">
              <span className="relative z-10 grid size-9 place-items-center bg-ink text-ink-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-base">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </Reveal>
          );
        })}
      </ol>
      <p className="text-xs text-muted-foreground">
        {t("soccer.engine.cadence")} {t("soccer.updated", { time: formatDateTime(checkedAt) })}
      </p>
    </section>
  );
}

/** FAQ list (the page head carries the same questions as FAQPage JSON-LD). */
export function SoccerFaq({ items }: { items: { q: string; a: string }[] }) {
  const { t } = useTranslation("sports");
  return (
    <section aria-labelledby="faq-title">
      <h2 id="faq-title" className="text-xl">
        {t("soccer.faq.title")}
      </h2>
      <div className="mt-3 divide-y divide-border border-y border-border">
        {items.map((f) => (
          <details key={f.q} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
              {f.q}
              <ArrowRight
                className="size-4 shrink-0 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Closing call to action. */
export function SoccerCta({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation("sports");
  return (
    <Reveal as="section" className="relative overflow-hidden bg-ink p-6 text-ink-foreground sm:p-8">
      <h2 className="text-2xl text-ink-foreground">{t("soccer.cta.title")}</h2>
      <p className="mt-2 max-w-xl text-sm opacity-80">{t("soccer.cta.body")}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        {signedIn ? (
          <Button asChild>
            <Link to="/discover">{t("soccer.cta.predictions")}</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link to="/join">{t("soccer.cta.join")}</Link>
          </Button>
        )}
      </div>
    </Reveal>
  );
}
