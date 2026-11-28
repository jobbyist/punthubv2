import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FilterChips } from "@/components/match/filter-chips";
import { StandingsTable } from "@/components/standings/standings-table";
import { useTeamForms } from "@/hooks/use-team-forms";
import { formatDate, formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { STANDINGS_LAUNCH_KEYS } from "@/lib/pfie/standings";
import { competitions, type CompetitionKey } from "@/lib/sports/competitions";
import {
  fetchStandings,
  fetchSyncStatuses,
  freshStandingsKeys,
  isStale,
  type StandingRow,
  type SyncStatus,
} from "@/lib/standings-data";

const KEYS = [...STANDINGS_LAUNCH_KEYS] as CompetitionKey[];

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
  const [rows, setRows] = useState<StandingRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [statuses, setStatuses] = useState<SyncStatus[] | null>(null);
  const activeKeys = useMemo(
    () => (statuses ? freshStandingsKeys(KEYS, statuses) : []),
    [statuses],
  );
  const selectedLeague = activeKeys.includes(league) ? league : (activeKeys[0] ?? null);
  const name = selectedLeague
    ? (competitions.find((c) => c.key === selectedLeague)?.name ?? selectedLeague)
    : "League tables";

  useEffect(() => {
    fetchSyncStatuses()
      .then(setStatuses)
      .catch((e: unknown) => {
        console.error("sync status failed", e);
        setStatuses([]);
      });
  }, []);
  useEffect(() => {
    if (statuses !== null && selectedLeague && selectedLeague !== league) {
      void navigate({
        search: { league: selectedLeague },
        replace: true,
        resetScroll: false,
      });
    }
  }, [statuses, selectedLeague, league, navigate]);

  useEffect(() => {
    if (statuses === null) return;
    if (!selectedLeague) {
      setRows([]);
      setFailed(false);
      return;
    }
    let live = true;
    setRows(null);
    setFailed(false);
    fetchStandings(selectedLeague)
      .then((r) => live && setRows(r))
      .catch((e: unknown) => {
        console.error("standings failed", e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [selectedLeague, statuses]);

  const teams = useMemo(() => (rows ?? []).map((r) => r.team), [rows]);
  const { forms } = useTeamForms(teams);
  const status = statuses?.find((s) => s.job === "standings" && s.scope === selectedLeague);
  const stale = rows !== null && rows.length > 0 && isStale(status);
  const updated = rows?.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), "");

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />
      {statuses === null ? (
        <div className="h-64 animate-pulse rounded-xl bg-muted" aria-hidden />
      ) : activeKeys.length === 0 ? (
        <EmptyState
          art="podium"
          title="League tables temporarily unavailable"
          body="We only publish tables after a recent successful verification. Competitions return automatically when fresh standings are restored."
          className="m-4"
        />
      ) : (
        <>
          <FilterChips
            id="standings-league"
            className="mb-6"
            chips={activeKeys.map((k) => ({
              key: k,
              label: competitions.find((c) => c.key === k)?.name ?? k,
            }))}
            active={selectedLeague ?? activeKeys[0]!}
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
                  {rows?.[0]?.source_domain && (
                    <> · {t("source", { domain: rows[0].source_domain })}</>
                  )}
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
              <StandingsTable
                rows={rows}
                forms={forms}
                competitionKey={selectedLeague}
                caption={name}
              />
            )}
          </section>
        </>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("note")}</p>
    </AppShell>
  );
}
