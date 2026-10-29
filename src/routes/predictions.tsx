import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { TeamLogo } from "@/components/team-logo";
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
  const { fixtures, failed } = Route.useLoaderData();
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

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

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

      {failed && <p className="card-surface p-5 text-sm text-destructive">{t("error")}</p>}

      {!failed && days.length === 0 && (
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
              {day.fixtures.map((f) => (
                <li key={f.id}>
                  <Link
                    to="/match/$fixtureId"
                    params={{ fixtureId: f.id }}
                    className="grid grid-cols-[5.5rem_1fr] items-center gap-x-4 gap-y-1 p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[6.5rem_1fr_auto]"
                  >
                    <div className="text-sm font-semibold tnum">
                      {f.status === "live" ? t("live") : formatTime(f.kickoff_at)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-muted-foreground">
                        {f.competition} ·{" "}
                        {f.sport === "soccer" ? tc("sport.soccer") : tc("sport.rugby")}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold">
                        <span className="inline-flex items-center gap-2">
                          <TeamLogo team={f.home} size="sm" />
                          {f.home}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {tc("vs")}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <TeamLogo team={f.away} size="sm" />
                          {f.away}
                        </span>
                      </p>
                    </div>
                    <span className="hidden text-sm font-medium text-primary sm:block">
                      {t("pick")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{t("note")}</p>
    </AppShell>
  );
}
