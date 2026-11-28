import { Link } from "@tanstack/react-router";
import { ChevronRight, Star } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { FormGuide } from "@/components/match/form-guide";
import { TeamLogo } from "@/components/team-logo";
import { badgeKey } from "@/lib/badges/resolve";
import type { FormEntry } from "@/lib/match/form";
import { teamSlug } from "@/lib/pfie/teams";
import type { StandingRow } from "@/lib/standings-data";
import { useTeamFollows } from "@/lib/teams/follows";
import { cn } from "@/lib/utils";

/**
 * League table used on /tables (full) and in the predictions hub (compact).
 *
 * Mobile first: by default a phone sees # / Team / P / GD / Pts, tablets add W-D-L and form, desktops see every
 * column. Below lg a segmented control switches between Short, Full (sticky team column, scrolls sideways) and
 * Form. Followed teams are highlighted, and each team links to its team page.
 */
export type StandingsView = "auto" | "short" | "full" | "form";

type Col = "p" | "w" | "d" | "l" | "gf" | "ga" | "gd" | "pts" | "form";

/** Which columns show for each view below lg. `auto` uses breakpoints instead. On lg+ every column shows. */
const VISIBLE: Record<Exclude<StandingsView, "auto">, readonly Col[]> = {
  short: ["p", "gd", "pts"],
  full: ["p", "w", "d", "l", "gf", "ga", "gd", "pts", "form"],
  form: ["form", "pts"],
};

const AUTO_CLASS: Record<Col, string> = {
  p: "table-cell",
  w: "hidden sm:table-cell",
  d: "hidden sm:table-cell",
  l: "hidden sm:table-cell",
  gf: "hidden md:table-cell",
  ga: "hidden md:table-cell",
  gd: "table-cell",
  pts: "table-cell",
  form: "hidden md:table-cell",
};

function colClass(view: StandingsView, col: Col): string {
  if (view === "auto") return AUTO_CLASS[col];
  return VISIBLE[view].includes(col) ? "table-cell" : "hidden lg:table-cell";
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

interface Props {
  rows: StandingRow[];
  forms?: Record<string, { entries?: FormEntry[] } | undefined>;
  /** Competition key, for the CAF Confederation Cup note. */
  competitionKey?: string | null;
  variant?: "full" | "compact";
  /** Accessible table caption (e.g. the league name). */
  caption: string;
}

export function StandingsTable({
  rows,
  forms = {},
  competitionKey,
  variant = "full",
  caption,
}: Props) {
  const { t } = useTranslation("standings");
  const [view, setView] = useState<StandingsView>("auto");
  const { isFollowing, available: followsAvailable } = useTeamFollows();
  const compact = variant === "compact";

  const groups = useMemo(() => {
    const map = new Map<string, StandingRow[]>();
    for (const row of rows) {
      const group = row.group_name ?? "";
      map.set(group, [...(map.get(group) ?? []), row]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);
  const grouped = groups.length > 1 || (groups[0]?.[0] ?? "") !== "";
  /** Top places get a green rank badge: four in a league table, two in a group. */
  const topPlaces = grouped ? 2 : 4;

  const cols: readonly Col[] = compact
    ? ["p", "gd", "pts"]
    : ["p", "w", "d", "l", "gf", "ga", "gd", "pts", "form"];
  const cls = (col: Col) => (compact ? "table-cell" : colClass(view, col));
  const wide = !compact && view === "full";

  return (
    <div>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-3 lg:hidden">
          <div
            role="radiogroup"
            aria-label={t("views.label")}
            className="inline-flex rounded-lg border border-border bg-muted/60 p-0.5"
          >
            {(["short", "full", "form"] as const).map((v) => {
              const active = view === v || (view === "auto" && v === "short");
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setView(v)}
                  className={cn(
                    "min-h-9 rounded-md px-3 text-xs font-semibold transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t(`views.${v}`)}
                </button>
              );
            })}
          </div>
          {wide && (
            <span className="text-[11px] text-muted-foreground" aria-hidden="true">
              {t("views.scroll")}
            </span>
          )}
        </div>
      )}

      <div className={cn("overflow-x-auto overscroll-x-contain", !compact && "mt-2 lg:mt-0")}>
        <table className={cn("w-full text-sm", wide && "min-w-[640px] lg:min-w-0")}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th
                scope="col"
                className={cn("py-2 pl-3 pr-2 font-semibold", wide && "sticky left-0 z-10 bg-card")}
              >
                <span className="inline-block w-7 text-center">#</span>
                <span className="ml-2">{t("cols.team")}</span>
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={cn(
                    "px-2 py-2 font-semibold",
                    c === "form" ? "pr-3 text-right" : "text-center",
                    c === "pts" && "text-foreground",
                    !compact && (c === "form" ? "lg:w-36" : "lg:w-12"),
                    cls(c),
                  )}
                >
                  <abbr title={t(`key.${c}`)} className="no-underline">
                    {t(`cols.${c}`)}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tnum">
            {groups.map(([group, groupRows]) => (
              <Fragment key={group || "overall"}>
                {group && (
                  <tr className="border-t-2 border-border bg-muted/50">
                    <th
                      scope="row"
                      colSpan={cols.length + 1}
                      className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-foreground"
                    >
                      {t("group", { group })}
                      {competitionKey === "caf-cc" && group === "C" && groupRows.length === 3 && (
                        <p className="mt-1 text-[10px] font-medium normal-case tracking-normal text-muted-foreground">
                          {t("groupPending")}
                        </p>
                      )}
                    </th>
                  </tr>
                )}
                {groupRows.map((r) => {
                  const followed = followsAvailable && isFollowing(badgeKey(r.team));
                  const top = r.position <= topPlaces;
                  return (
                    <tr
                      key={`${group}-${r.team}`}
                      className={cn(
                        "group/row border-t border-border transition-colors hover:bg-muted/40",
                        followed && "bg-primary-soft/60 hover:bg-primary-soft",
                      )}
                    >
                      <th
                        scope="row"
                        className={cn(
                          "max-w-0 py-2.5 pl-3 pr-2 text-left font-normal",
                          wide && "sticky left-0 z-10 w-[11.5rem] max-w-[11.5rem] bg-card",
                          wide && followed && "bg-primary-soft",
                          !wide && "w-full lg:w-auto lg:min-w-56",
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-md text-xs font-bold",
                              top
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                            )}
                          >
                            {r.position}
                          </span>
                          <TeamLogo
                            team={r.team}
                            sport="soccer"
                            size="sm"
                            className="size-6 shrink-0"
                          />
                          <Link
                            to="/teams/$slug"
                            params={{ slug: teamSlug(r.team) }}
                            className="min-w-0 truncate font-semibold hover:text-primary hover:underline focus-visible:underline"
                          >
                            {r.team}
                          </Link>
                          {followed && (
                            <Star
                              className="size-3.5 shrink-0 fill-primary text-primary"
                              aria-label={t("following")}
                            />
                          )}
                        </span>
                      </th>
                      <td className={cn("px-2 py-2.5 text-center text-muted-foreground", cls("p"))}>
                        {r.played}
                      </td>
                      {!compact && (
                        <>
                          <td className={cn("px-2 py-2.5 text-center", cls("w"))}>{r.won}</td>
                          <td className={cn("px-2 py-2.5 text-center", cls("d"))}>{r.drawn}</td>
                          <td className={cn("px-2 py-2.5 text-center", cls("l"))}>{r.lost}</td>
                          <td className={cn("px-2 py-2.5 text-center", cls("gf"))}>
                            {r.goals_for}
                          </td>
                          <td className={cn("px-2 py-2.5 text-center", cls("ga"))}>
                            {r.goals_against}
                          </td>
                        </>
                      )}
                      <td
                        className={cn(
                          "px-2 py-2.5 text-center",
                          r.goal_diff > 0 && "text-primary",
                          r.goal_diff < 0 && "text-muted-foreground",
                          cls("gd"),
                        )}
                      >
                        {signed(r.goal_diff)}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2.5 text-center font-display text-[15px] font-extrabold",
                          cls("pts"),
                        )}
                      >
                        {r.points}
                      </td>
                      {!compact && (
                        <td className={cn("py-2.5 pl-2 pr-3", cls("form"))}>
                          <FormGuide
                            team={r.team}
                            entries={forms[r.team]?.entries}
                            align="end"
                            size={view === "form" ? "md" : "sm"}
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {!compact && (
        <details className="group border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            {t("key.title")}
          </summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c} className="flex gap-1.5">
                <dt className="font-bold text-foreground">{t(`cols.${c}`)}</dt>
                <dd>{t(`key.${c}`)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2">{t("key.top", { count: topPlaces })}</p>
          {followsAvailable && <p className="mt-1">{t("key.followed")}</p>}
        </details>
      )}
    </div>
  );
}
