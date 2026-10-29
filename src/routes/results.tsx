import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { useSession } from "@/components/session";
import { TeamLogo } from "@/components/team-logo";
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
          className={`grid size-6 place-items-center text-[11px] font-bold ${
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
    <section className="card-surface mb-6 p-5">
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
  const { profile } = useSession();
  const { data: days, failed, loading } = useAsync(() => fetchResults(14), []);

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      {profile && <MyRecord userId={profile.id} />}

      {failed && <p className="card-surface p-5 text-sm text-destructive">{t("error")}</p>}
      {!failed && !loading && (days ?? []).length === 0 && (
        <div className="card-surface p-6">
          <h2 className="text-lg">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("empty.body")}</p>
        </div>
      )}

      {(days ?? []).length > 0 && (
        <section className="card-surface overflow-hidden">
          <h2 className="p-5 pb-3 text-lg">{t("byDate")}</h2>
          {(days ?? []).map((day) => (
            <div key={day.label}>
              <div className="flex flex-wrap items-center gap-3 border-y border-border bg-muted/40 px-5 py-3 text-sm">
                <span className="font-semibold">{day.label}</span>
                <span className="flex-1" />
                <span className="text-muted-foreground tnum">
                  {t("day.matches", { count: day.fixtures.length })} ·{" "}
                  {t("day.picks", { count: day.picks })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-5 py-2.5 font-medium">{t("col.match")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("col.score")}</th>
                      <th className="px-3 py-2.5 font-medium">{t("col.crowd")}</th>
                      <th className="px-5 py-2.5 font-medium">{t("col.leaders")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.fixtures.map((r) => (
                      <tr key={r.fixture.id} className="border-t border-border hover:bg-muted/40">
                        <td className="px-5 py-3">
                          <p className="text-[11px] text-muted-foreground">
                            {r.fixture.competition}
                          </p>
                          <Link
                            to="/match/$fixtureId"
                            params={{ fixtureId: r.fixture.id }}
                            className="inline-flex flex-wrap items-center gap-x-2 font-medium hover:underline"
                          >
                            <TeamLogo team={r.fixture.home} size="sm" /> {r.fixture.home}
                            <span className="text-xs font-normal text-muted-foreground">v</span>
                            <TeamLogo team={r.fixture.away} size="sm" /> {r.fixture.away}
                          </Link>
                        </td>
                        <td className="px-3 py-3 font-semibold tnum">
                          {r.fixture.home_score} – {r.fixture.away_score}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {r.crowdWinRate === null
                            ? r.picks > 0
                              ? t("crowd.picks", { count: r.picks })
                              : t("crowd.none")
                            : t("crowd.won", { percent: pct(r.crowdWinRate, 0), count: r.settled })}
                        </td>
                        <td className="px-5 py-3">
                          {r.leaders.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {t("leader.none")}
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {r.leaders.map((l) => (
                                <li key={l.id} className="flex items-center gap-2 text-xs">
                                  <span className="font-medium">{l.username}</span>
                                  <span
                                    className={`px-1.5 py-0.5 font-semibold ${CHIP[l.result ?? "void"]}`}
                                  >
                                    {t(`leader.${l.result ?? "pending"}`)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}
    </AppShell>
  );
}
