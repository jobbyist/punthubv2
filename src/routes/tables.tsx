import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FilterChips } from "@/components/match/filter-chips";
import { FormGuide } from "@/components/match/form-guide";
import { TeamLogo } from "@/components/team-logo";
import { useTeamForms } from "@/hooks/use-team-forms";
import { formatDate, formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { STANDINGS_COMPETITIONS } from "@/lib/pfie/standings";
import { competitions, type CompetitionKey } from "@/lib/sports/competitions";
import {
  fetchStandings,
  fetchSyncStatuses,
  isStale,
  type StandingRow,
  type SyncStatus,
} from "@/lib/standings-data";
import { cn } from "@/lib/utils";

const KEYS = Object.keys(STANDINGS_COMPETITIONS) as CompetitionKey[];

export const Route = createFileRoute("/tables")({
  validateSearch: (s: Record<string, unknown>): { league?: CompetitionKey } =>
    typeof s["league"] === "string" && (KEYS as string[]).includes(s["league"])
      ? { league: s["league"] as CompetitionKey }
      : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "standings");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/tables" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Standings,
});

function Standings() {
  const { t } = useTranslation("standings");
  const navigate = useNavigate({ from: "/tables" });
  const league = Route.useSearch().league ?? "psl";
  const name = competitions.find((c) => c.key === league)?.name ?? league;
  const [rows, setRows] = useState<StandingRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [statuses, setStatuses] = useState<SyncStatus[]>([]);

  useEffect(() => {
    fetchSyncStatuses()
      .then(setStatuses)
      .catch((e: unknown) => console.error("sync status failed", e));
  }, []);
  useEffect(() => {
    let live = true;
    setRows(null);
    setFailed(false);
    fetchStandings(league)
      .then((r) => live && setRows(r))
      .catch((e: unknown) => {
        console.error("standings failed", e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [league]);

  const teams = useMemo(() => (rows ?? []).map((r) => r.team), [rows]);
  const { forms } = useTeamForms(teams);
  const status = statuses.find((s) => s.job === "standings" && s.scope === league);
  const stale = rows !== null && rows.length > 0 && isStale(status);
  const updated = rows?.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />
      <FilterChips
        id="standings-league"
        className="mb-6"
        chips={KEYS.map((k) => ({
          key: k,
          label: competitions.find((c) => c.key === k)?.name ?? k,
        }))}
        active={league}
        onSelect={(k) =>
          void navigate({
            search: { league: k as CompetitionKey },
            replace: true,
            resetScroll: false,
          })
        }
        label={t("filter")}
      />

      <section className="card-surface overflow-hidden" aria-labelledby="table-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 id="table-title" className="text-base">
            <CompetitionBadge
              name={name}
              className="[&>span:last-child]:text-sm [&>span:last-child]:text-foreground"
            />
          </h2>
          {updated && (
            <span className="text-xs text-muted-foreground tnum">
              {t("updated", { when: `${formatDate(updated)} ${formatTime(updated)}` })}
              {rows?.[0]?.source_domain && <> · {t("source", { domain: rows[0].source_domain })}</>}
            </span>
          )}
        </div>
        {stale && (
          <p
            role="status"
            className="flex items-start gap-2 border-b border-border bg-primary-soft px-4 py-2 text-xs font-medium text-primary"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t("stale")}
          </p>
        )}
        {failed ? (
          <p className="p-6 text-sm text-muted-foreground">{t("error")}</p>
        ) : rows === null ? (
          <div className="h-96 animate-pulse bg-muted" aria-hidden />
        ) : rows.length === 0 ? (
          <EmptyState art="podium" title={t("empty")} body={t("pending")} className="m-4" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-semibold" scope="col">
                    {t("cols.pos")}
                  </th>
                  <th className="px-2 py-2 font-semibold" scope="col">
                    {t("cols.team")}
                  </th>
                  {(["p", "w", "d", "l"] as const).map((c) => (
                    <th key={c} className="px-2 py-2 text-right font-semibold" scope="col">
                      {t(`cols.${c}`)}
                    </th>
                  ))}
                  <th
                    className="hidden px-2 py-2 text-right font-semibold sm:table-cell"
                    scope="col"
                  >
                    {t("cols.gf")}
                  </th>
                  <th
                    className="hidden px-2 py-2 text-right font-semibold sm:table-cell"
                    scope="col"
                  >
                    {t("cols.ga")}
                  </th>
                  <th className="px-2 py-2 text-right font-semibold" scope="col">
                    {t("cols.gd")}
                  </th>
                  <th className="px-2 py-2 text-right font-semibold" scope="col">
                    {t("cols.pts")}
                  </th>
                  <th
                    className="hidden px-3 py-2 text-right font-semibold md:table-cell"
                    scope="col"
                  >
                    {t("cols.form")}
                  </th>
                </tr>
              </thead>
              <tbody className="tnum">
                {rows.map((r) => (
                  <tr key={r.team} className="border-t border-border">
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-md text-xs font-bold",
                          r.position <= 4 ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {r.position}
                      </span>
                    </td>
                    <td className="max-w-0 px-2 py-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamLogo
                          team={r.team}
                          sport="soccer"
                          size="sm"
                          className="size-6 shrink-0"
                        />
                        <span className="truncate font-semibold">{r.team}</span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">{r.played}</td>
                    <td className="px-2 py-2.5 text-right">{r.won}</td>
                    <td className="px-2 py-2.5 text-right">{r.drawn}</td>
                    <td className="px-2 py-2.5 text-right">{r.lost}</td>
                    <td className="hidden px-2 py-2.5 text-right sm:table-cell">{r.goals_for}</td>
                    <td className="hidden px-2 py-2.5 text-right sm:table-cell">
                      {r.goals_against}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {r.goal_diff > 0 ? `+${r.goal_diff}` : r.goal_diff}
                    </td>
                    <td className="px-2 py-2.5 text-right font-display font-extrabold">
                      {r.points}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      <FormGuide team={r.team} entries={forms[r.team]?.entries} align="end" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="mt-3 text-xs text-muted-foreground">{t("note")}</p>
    </AppShell>
  );
}
