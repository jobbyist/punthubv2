import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Blurred, FoundingGateCard, useGated } from "@/components/intel/guest-gate";
import { useSession } from "@/components/session";
import { EmptyState } from "@/components/empty-state";
import { FixtureCard } from "@/components/fixture-card";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { formatUnits, pct } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchResults, fetchTipsterStats } from "@/lib/records";

export const Route = createFileRoute("/results")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "results");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/results" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Results,
});

const EXAMPLES = [
  {
    competition: "Premier League",
    home: "Arsenal",
    away: "Liverpool",
    sport: "soccer",
    score: { home: 2, away: 1 },
  },
  {
    competition: "Betway Premiership",
    home: "Orlando Pirates",
    away: "Kaizer Chiefs",
    sport: "soccer",
    score: { home: 1, away: 1 },
  },
  {
    competition: "International Rugby",
    home: "South Africa",
    away: "New Zealand",
    sport: "rugby",
    score: { home: 24, away: 19 },
  },
] as const;

const CHIP = {
  won: "bg-primary-soft text-primary",
  lost: "bg-destructive/10 text-destructive",
  void: "bg-muted text-muted-foreground",
} as const;

function FormChips({ form }: { form: string }) {
  return (
    <span className="inline-flex gap-1" aria-label={form}>
      {form.split("").map((c, i) => (
        <span
          key={i}
          className={`puntr-pop grid size-6 place-items-center rounded-md text-[11px] font-bold ${
            c === "W" ? CHIP.won : c === "L" ? CHIP.lost : CHIP.void
          }`}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

function MyRecord({ userId }: { userId: string }) {
  const { t } = useTranslation("results");
  const { data } = useAsync(() => fetchTipsterStats(userId), [userId]);
  if (!data) return null;
  const items = [
    [String(data.picks), t("mine.picks")],
    [String(data.settled), t("mine.settled")],
    [data.win_rate === null ? t("mine.none") : pct(data.win_rate, 0), t("mine.winRate")],
    [formatUnits(data.units), t("mine.units")],
  ] as const;
  return (
    <section className="card-surface mb-10 p-5 sm:p-6">
      <h2 className="text-lg">{t("mine.title")}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {items.map(([v, l]) => (
          <div key={l} className="text-center">
            <p
              className={`font-display text-2xl font-extrabold tnum ${v.startsWith("+") ? "text-primary" : ""}`}
            >
              {v}
            </p>
            <p className="text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
        <div className="col-span-2 text-center sm:col-span-1">
          <p className="min-h-8">
            {data.form_last_10 ? <FormChips form={data.form_last_10} /> : t("mine.none")}
          </p>
          <p className="text-xs text-muted-foreground">{t("mine.form")}</p>
        </div>
      </div>
    </section>
  );
}

function Results() {
  const { t } = useTranslation("results");
  const { t: tc } = useTranslation("common");
  const { profile } = useSession();
  const { data: days, failed, loading } = useAsync(() => fetchResults(14), []);
  const gated = useGated();
  const order = new Map(
    (days ?? []).flatMap((d) => d.fixtures).map((r, i) => [r.fixture.id, i] as const),
  );
  const anyGated = gated(order.size - 1);

  return (
    <AppShell>
      <PageHeading art="scoreboard" title={t("title")} subtitle={t("subtitle")} />

      <section className="mb-10" aria-labelledby="results-example-title">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="results-example-title" className="text-xl">
              {t("example.title")}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t("example.description")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <span className="puntr-blink size-1.5 rounded-full bg-primary" aria-hidden="true" />
            {t("example.badge")}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {EXAMPLES.map((m, i) => (
            <div key={m.competition} className="puntr-rise" style={{ ["--i" as string]: i }}>
              <FixtureCard
                className="h-full"
                home={m.home}
                away={m.away}
                sport={m.sport}
                sportLabel={tc(`sport.${m.sport}`)}
                competition={m.competition}
                status="final"
                statusLabel={t("example.fullTime")}
                score={m.score}
                footer={<span>{t("example.detail")}</span>}
              />
            </div>
          ))}
        </div>
      </section>

      {profile && <MyRecord userId={profile.id} />}

      {failed && <p className="card-surface p-5 text-sm text-destructive">{t("error")}</p>}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="puntr-shimmer h-44 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && !failed && (days ?? []).length === 0 && (
        <EmptyState
          art="scoreboard"
          title={t("empty.title")}
          body={t("empty.body")}
          action={
            <Button asChild variant="outline">
              <Link to="/predictions">{tc("action.seeFixtures")}</Link>
            </Button>
          }
        />
      )}

      {(days ?? []).length > 0 && (
        <section className="relative" aria-labelledby="results-by-date">
          {anyGated && <FoundingGateCard top="13rem" />}
          <h2 id="results-by-date" className="mb-4 text-xl">
            {t("byDate")}
          </h2>
          <div className="space-y-8">
            {(days ?? []).map((day) => (
              <div key={day.label}>
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-semibold">{day.label}</span>
                  <span className="h-px min-w-6 flex-1 bg-border" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground tnum">
                    {t("day.matches", { count: day.fixtures.length })} ·{" "}
                    {t("day.picks", { count: day.picks })}
                  </span>
                </div>
                <ul className="grid gap-4 md:grid-cols-2">
                  {day.fixtures.map((r) => {
                    const isGated = gated(order.get(r.fixture.id) ?? 0);
                    return (
                      <li key={r.fixture.id}>
                        <Link
                          to="/match/$fixtureId"
                          params={{ fixtureId: r.fixture.id }}
                          className="block h-full rounded-2xl focus-visible:outline-offset-4"
                        >
                          <FixtureCard
                            className="h-full"
                            home={r.fixture.home}
                            away={r.fixture.away}
                            sport={r.fixture.sport}
                            competition={r.fixture.competition}
                            status="final"
                            statusLabel={t("example.fullTime")}
                            score={{
                              home: r.fixture.home_score ?? "-",
                              away: r.fixture.away_score ?? "-",
                            }}
                            footer={
                              <Blurred gated={isGated}>
                                <span>
                                  {r.crowdWinRate === null
                                    ? r.picks > 0
                                      ? t("crowd.picks", { count: r.picks })
                                      : t("crowd.none")
                                    : t("crowd.won", {
                                        percent: pct(r.crowdWinRate, 0),
                                        count: r.settled,
                                      })}
                                </span>
                              </Blurred>
                            }
                          >
                            <Blurred gated={isGated}>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                                {t("col.leaders")}
                              </p>
                              {r.leaders.length === 0 ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t("leader.none")}
                                </p>
                              ) : (
                                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                  {r.leaders.map((l) => (
                                    <li
                                      key={l.id}
                                      className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-2 pr-0.5 text-xs"
                                    >
                                      <span className="font-medium">{l.username}</span>
                                      <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${CHIP[l.result ?? "void"]}`}
                                      >
                                        {t(`leader.${l.result ?? "pending"}`)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </Blurred>
                          </FixtureCard>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </AppShell>
  );
}
