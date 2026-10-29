import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { ReportButton } from "@/components/report-button";
import { TeamLogo } from "@/components/team-logo";
import { formatDate, formatTime, odds as formatOdds } from "@/lib/format";
import { selectionLabel } from "@/lib/pick-labels";
import type { FeedPick, PickRow } from "@/lib/pick-data";
import { lockedBefore } from "@/lib/picks";

const RESULT_STYLE = {
  won: "bg-primary-soft text-primary",
  lost: "bg-destructive/10 text-destructive",
  void: "bg-muted text-muted-foreground",
} as const;

/** A locked pick. Shown in the community feed (with its fixture) and on the match page. No edit or delete exists. */
export function PickCard({
  pick,
  fixture,
  teams,
  kickoff,
}: {
  pick: PickRow;
  /** Present in the feed, where the card also shows which match it is on. */
  fixture?: FeedPick["fixture"];
  teams: { home: string; away: string };
  kickoff: string;
}) {
  const { t } = useTranslation("match");
  const label = selectionLabel(t, pick, teams);

  return (
    <article className="card-surface p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold uppercase">
          {(pick.username ?? "?").slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {pick.username ? (
              <Link
                to="/u/$username"
                params={{ username: pick.username }}
                className="hover:underline"
              >
                {pick.username}
              </Link>
            ) : (
              "-"
            )}
            {pick.founding_number && (
              <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
                {t("picks.founding", { number: pick.founding_number })}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("picks.lockedBefore", { span: lockedBefore(pick.created_at, kickoff) })}
          </p>
        </div>
        {pick.result ? (
          <span className={`px-2 py-1 text-xs font-semibold ${RESULT_STYLE[pick.result]}`}>
            {t(`picks.${pick.result}`)}
            {pick.units !== null && pick.result !== "void" && (
              <span className="ml-1 tnum">
                {t("picks.units", {
                  units: `${pick.units > 0 ? "+" : ""}${pick.units.toFixed(2)}`,
                })}
              </span>
            )}
          </span>
        ) : (
          <span className="bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
            {t("picks.pending")}
          </span>
        )}
      </div>

      {fixture && (
        <Link
          to="/match/$fixtureId"
          params={{ fixtureId: fixture.id }}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:bg-muted/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            <TeamLogo team={fixture.home} size="sm" />
            <span className="truncate text-sm font-medium">{fixture.home}</span>
          </span>
          <span className="text-center text-[11px] text-muted-foreground">
            <span className="block">{fixture.competition}</span>
            <span className="block tnum">
              {formatDate(fixture.kickoff_at)} · {formatTime(fixture.kickoff_at)}
            </span>
          </span>
          <span className="flex min-w-0 items-center justify-end gap-3">
            <span className="truncate text-sm font-medium">{fixture.away}</span>
            <TeamLogo team={fixture.away} size="sm" />
          </span>
        </Link>
      )}

      <div className="mt-4 rounded-xl bg-muted/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">{t(`market.${pick.market}`)}</span>
          <span className="font-semibold">{label}</span>
          <span className="tnum font-semibold text-primary">
            {t("picks.odds")} {formatOdds(pick.odds)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("picks.confidence", { value: pick.confidence })}
        </p>
      </div>

      {pick.reasoning && <p className="mt-3 text-[15px] leading-relaxed">{pick.reasoning}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tnum">
          {t("picks.hash")}{" "}
          <a href={`/verify?id=${pick.id}`} className="font-mono underline" title={pick.hash}>
            {pick.hash.slice(0, 10)}
          </a>
        </span>
        <span className="flex items-center gap-4">
          {fixture && (
            <Link to="/match/$fixtureId" params={{ fixtureId: fixture.id }} className="underline">
              {t("back")}
            </Link>
          )}
          <ReportButton predictionId={pick.id} />
        </span>
      </div>
    </article>
  );
}
