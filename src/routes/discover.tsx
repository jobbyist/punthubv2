import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Blurred, FoundingGateCard, FREE_ITEMS, useGated } from "@/components/intel/guest-gate";
import { IntelPanel } from "@/components/intel/intel-panel";
import { EmptyState } from "@/components/empty-state";
import {
  DuelsTeaser,
  HubNav,
  LatestResults,
  LeadersTeaser,
  NewsroomTeaser,
  TableSnapshot,
} from "@/components/predictions/hub";
import { FantasyArenaPromo, SlipConverterPromo } from "@/components/predictions/slip-converter-promo";
import { FilterChips, type FilterChip } from "@/components/match/filter-chips";
import { LiveMatchCard } from "@/components/match/live-match-card";
import { useNow } from "@/hooks/use-now";
import { useTeamForms } from "@/hooks/use-team-forms";
import { fetchUpcomingFixtures, groupFixturesByDay } from "@/lib/fixtures";
import { saDayKey } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import type { Sport } from "@/lib/sports/types";

type Search = { sport?: Sport; competition?: string; when?: "today" };

export const Route = createFileRoute("/discover")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    if (search["sport"] === "soccer" || search["sport"] === "rugby") out.sport = search["sport"];
    if (typeof search["competition"] === "string" && search["competition"])
      out.competition = search["competition"].slice(0, 80);
    if (search["when"] === "today") out.when = "today";
    return out;
  },
  loaderDeps: ({ search }) => ({ sport: search.sport }),
  loader: async ({ deps }) => {
    try {
      return { fixtures: await fetchUpcomingFixtures({ sport: deps.sport }), failed: false };
    } catch (error) {
      console.error("fixtures load failed", error);
      return { fixtures: [], failed: true };
    }
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "predictions");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/discover" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("title"),
            description: t("meta.description"),
            url: "https://puntr.co.za/discover",
            isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
          }),
        },
      ],
    };
  },
  component: Predictions,
});

const HUB_FIXTURES = 6;

function Predictions() {
  const { t } = useTranslation("predictions");
  const { t: tc } = useTranslation("common");
  const { t: tm } = useTranslation("matchcard");
  const navigate = useNavigate({ from: "/discover" });
  const { fixtures } = Route.useLoaderData();
  const { sport, competition, when } = Route.useSearch();
  const now = useNow(60_000);
  const todayKey = now ? saDayKey(now) : null;
  // League chips come from what is actually loaded, so a league appears only when it has fixtures.
  const leagues = Array.from(
    fixtures.reduce(
      (m, f) => m.set(f.competition, (m.get(f.competition) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const todayCount = todayKey
    ? fixtures.filter((f) => saDayKey(f.kickoff_at) === todayKey).length
    : 0;
  const shown = fixtures.filter(
    (f) =>
      (!competition || f.competition === competition) &&
      (when !== "today" || (todayKey !== null && saDayKey(f.kickoff_at) === todayKey)),
  );
  // The hub previews the next few matches; the full list lives on /fixtures.
  const days = groupFixturesByDay(shown.slice(0, HUB_FIXTURES));
  const gated = useGated();
  // Position of each fixture across all days, so the first FREE_ITEMS stay open for guests.
  const order = new Map(days.flatMap((d) => d.fixtures).map((f, i) => [f.id, i]));
  const { forms, rows } = useTeamForms(fixtures.flatMap((f) => [f.home, f.away]));
  const active = when === "today" ? "@today" : (competition ?? "@all");
  const chips: FilterChip[] = [
    { key: "@all", label: tm("filter.all"), count: fixtures.length },
    ...(todayCount > 0 ? [{ key: "@today", label: tm("filter.today"), count: todayCount }] : []),
    ...leagues.map(([name, n]) => ({ key: name, label: name, count: n })),
  ];
  const select = (key: string) =>
    void navigate({
      search: {
        ...(sport ? { sport } : {}),
        ...(key === "@today" ? { when: "today" as const } : {}),
        ...(key.startsWith("@") ? {} : { competition: key }),
      },
      replace: true,
      resetScroll: false,
    });

  return (
    <AppShell>
      <PageHeading art="pitch" title={t("title")} subtitle={t("subtitle")} />

      <HubNav fixtureCount={fixtures.length} />

      <SlipConverterPromo />
      <FantasyArenaPromo />

      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-xl sm:text-2xl">{t("hub.next.title")}</h2>
        <Link
          to="/fixtures"
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          {t("hub.next.cta", { count: fixtures.length })}
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {chips.length > 2 && (
        <FilterChips
          id="discover-filter"
          className="mb-6"
          chips={chips}
          active={active}
          onSelect={select}
          label={t("filter.label")}
        />
      )}

      {days.length === 0 && (
        <EmptyState art="pitch" title={t("empty.title")} body={t("empty.body")} />
      )}

      <MotionConfig reducedMotion="user">
        <LayoutGroup id="predictions-grid">
          <div className="space-y-8">
            {days.map((day) => (
              <motion.section key={day.label} layout aria-label={day.label}>
                <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  {day.label}
                  <span className="h-px flex-1 bg-border" aria-hidden="true" />
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tnum">
                    {day.fixtures.length}
                  </span>
                </h2>
                <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {day.fixtures.map((f) => {
                      const i = order.get(f.id) ?? 0;
                      const locked = gated(i);
                      return (
                        <Fragment key={f.id}>
                          {i === FREE_ITEMS && locked && (
                            <li className="col-span-full">
                              <FoundingGateCard />
                            </li>
                          )}
                          <motion.li
                            layout
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="min-w-0"
                          >
                            <LiveMatchCard
                              fixture={f}
                              forms={forms}
                              rows={rows}
                              sportLabel={tc(`sport.${f.sport}`)}
                              locked={locked}
                            >
                              {locked && (
                                <Blurred gated>
                                  <IntelPanel compact />
                                </Blurred>
                              )}
                            </LiveMatchCard>
                          </motion.li>
                        </Fragment>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </div>
        </LayoutGroup>
      </MotionConfig>

      {shown.length > HUB_FIXTURES && (
        <div className="mt-6 flex justify-center">
          <Link
            to="/fixtures"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-5 text-sm font-semibold hover:bg-muted"
          >
            {t("hub.next.more", { count: shown.length - HUB_FIXTURES })}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <LatestResults />
        <TableSnapshot />
        <DuelsTeaser />
        <LeadersTeaser />
        <NewsroomTeaser />
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{t("note")}</p>
    </AppShell>
  );
}
