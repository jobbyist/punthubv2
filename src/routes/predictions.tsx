import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Blurred, FoundingGateCard, FREE_ITEMS, useGated } from "@/components/intel/guest-gate";
import { IntelPanel } from "@/components/intel/intel-panel";
import { FixtureMatchup } from "@/components/fixture-matchup";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
import { fetchUpcomingFixtures, groupFixturesByDay } from "@/lib/fixtures";
import { formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import type { Sport } from "@/lib/sports/types";

type Search = { sport?: Sport; competition?: string };

export const Route = createFileRoute("/predictions")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const out: Search = {};
    if (search["sport"] === "soccer" || search["sport"] === "rugby") out.sport = search["sport"];
    if (typeof search["competition"] === "string" && search["competition"])
      out.competition = search["competition"].slice(0, 80);
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
      links: [{ rel: "canonical", href: "https://puntr.co.za/predictions" }],
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
            url: "https://puntr.co.za/predictions",
            isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
          }),
        },
      ],
    };
  },
  component: Predictions,
});

function Predictions() {
  const { t } = useTranslation("predictions");
  const { t: tc } = useTranslation("common");
  const { fixtures } = Route.useLoaderData();
  const { sport, competition } = Route.useSearch();
  // League chips come from what is actually loaded, so a league appears only when it has fixtures.
  const leagues = Array.from(
    fixtures.reduce(
      (m, f) => m.set(f.competition, (m.get(f.competition) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const shown = competition ? fixtures.filter((f) => f.competition === competition) : fixtures;
  const days = groupFixturesByDay(shown);
  const gated = useGated();
  // Position of each fixture across all days, so the first FREE_ITEMS stay open for guests.
  const order = new Map(days.flatMap((d) => d.fixtures).map((f, i) => [f.id, i]));

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      <IllustrativeFixtures />

      {leagues.length > 1 && (
        <div
          className="mb-6 flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t("filter.label")}
        >
          {[
            [undefined, fixtures.length] as const,
            ...leagues.map(([name, n]) => [name, n] as const),
          ].map(([name, n]) => {
            const active = competition === name;
            return (
              <Link
                key={name ?? "all"}
                to="/predictions"
                search={{
                  ...(sport ? { sport } : {}),
                  ...(name ? { competition: name } : {}),
                }}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
                }`}
              >
                {name ?? t("filter.all")} <span className="tnum opacity-70">{n}</span>
              </Link>
            );
          })}
        </div>
      )}

      {days.length === 0 && (
        <div className="card-surface p-6">
          <h2 className="text-lg">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
        </div>
      )}

      <div className="space-y-6">
        {days.map((day) => (
          <section key={day.label} aria-label={day.label}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {day.label}
            </h2>
            <ul className="card-surface divide-y divide-border">
              {day.fixtures.map((f) => {
                const i = order.get(f.id) ?? 0;
                return (
                  <Fragment key={f.id}>
                    {i === FREE_ITEMS && gated(i) && <FoundingGateCard as="li" />}
                    <li>
                      <Link
                        to="/match/$fixtureId"
                        params={{ fixtureId: f.id }}
                        className="block p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">
                            {f.competition} ·{" "}
                            {f.sport === "soccer" ? tc("sport.soccer") : tc("sport.rugby")}
                          </span>
                          <span className="shrink-0 font-medium text-primary">{t("pick")}</span>
                        </div>
                        <div className="mt-3">
                          <FixtureMatchup
                            home={f.home}
                            away={f.away}
                            sport={f.sport}
                            center={
                              <span
                                className={`text-sm font-bold tnum ${f.status === "live" ? "text-primary" : ""}`}
                              >
                                {f.status === "live" ? t("live") : formatTime(f.kickoff_at)}
                              </span>
                            }
                          />
                        </div>
                      </Link>
                      <div className="px-4 pb-4">
                        <Blurred gated={gated(i)}>
                          <IntelPanel />
                        </Blurred>
                      </div>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{t("note")}</p>
    </AppShell>
  );
}
