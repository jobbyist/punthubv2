import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { FilterChips } from "@/components/match/filter-chips";
import { fetchDuelBoard, type DuelBoardRow } from "@/lib/duels-data";
import { cn } from "@/lib/utils";

/** H2H Duel Leaderboard: duel XP (win 3, draw 1), then wins. PuntPoints never affect the order. */
export function DuelBoard({ className }: { className?: string }) {
  const { t } = useTranslation("duels");
  const [days, setDays] = useState<number | null>(7);
  const [rows, setRows] = useState<DuelBoardRow[] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    fetchDuelBoard(days)
      .then((r) => live && setRows(r))
      .catch((e: unknown) => {
        console.error("duel board failed", e);
        if (live) setRows([]);
      });
    return () => {
      live = false;
    };
  }, [days]);
  return (
    <section className={cn("card-surface p-5", className)} aria-labelledby="duel-board-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="duel-board-title" className="text-base">
          {t("board.title")}
        </h2>
        <FilterChips
          id="duel-board-days"
          chips={[
            { key: "7", label: t("board.week") },
            { key: "all", label: t("board.all") },
          ]}
          active={days === 7 ? "7" : "all"}
          onSelect={(k) => setDays(k === "7" ? 7 : null)}
          label={t("board.title")}
          className="[&_button]:px-3 [&_button]:py-1 [&_button]:text-xs"
        />
      </div>
      {rows === null ? (
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("board.empty")}</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 font-semibold">{t("board.rank")}</th>
              <th className="pb-2 font-semibold">{t("board.member")}</th>
              <th className="pb-2 text-right font-semibold" title={t("board.wins")}>
                {t("board.wins")}
              </th>
              <th className="pb-2 text-right font-semibold" title={t("board.draws")}>
                {t("board.draws")}
              </th>
              <th className="pb-2 text-right font-semibold" title={t("board.losses")}>
                {t("board.losses")}
              </th>
              <th className="pb-2 text-right font-semibold">{t("board.xp")}</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.slice(0, 10).map((r, i) => (
              <tr key={r.username} className="border-t border-border">
                <td className="py-2 font-display font-extrabold">{i + 1}</td>
                <td className="max-w-0 truncate py-2 font-semibold">
                  <Link
                    to="/u/$username"
                    params={{ username: r.username }}
                    className="hover:text-primary"
                  >
                    @{r.username}
                  </Link>
                </td>
                <td className="py-2 text-right">{r.wins}</td>
                <td className="py-2 text-right">{r.draws}</td>
                <td className="py-2 text-right">{r.losses}</td>
                <td className="py-2 text-right font-bold text-primary">{r.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="mt-3 text-[11px] text-muted-foreground">{t("board.note")}</p>
    </section>
  );
}
