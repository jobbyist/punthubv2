import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { UserAvatar } from "@/components/user-avatar";
import { useAsync } from "@/hooks/use-async";
import {
  BOARD_PERIODS,
  fetchMyScore,
  fetchScoreBoard,
  fetchScoringRules,
  type BoardPeriod,
  type ScoreRow,
} from "@/lib/scoreboard";
import { competitions } from "@/lib/sports/competitions";

const MARKETS = ["1X2", "BTTS", "OU25", "DC", "HCP"] as const;
/** Launch competitions (football only). The list grows with the fixtures coverage. */
const LAUNCH_COMPETITIONS = competitions.filter((c) => ["psl", "epl", "ucl"].includes(c.key));

function Row({ row, mine }: { row: ScoreRow; mine: boolean }) {
  return (
    <tr className={mine ? "bg-primary-soft font-semibold" : undefined}>
      <td className="py-2 pr-3 tnum">{row.rank}</td>
      <td className="py-2 pr-3">
        <span className="flex items-center gap-2">
          <UserAvatar username={row.username} url={row.avatar_url} />
          <span className="truncate">@{row.username}</span>
        </span>
      </td>
      <td className="py-2 pr-3 text-right tnum">{row.points}</td>
      <td className="py-2 pr-3 text-right tnum">{row.accuracy.toFixed(1)}%</td>
      <td className="py-2 pr-3 text-right tnum">{row.correct}</td>
      <td className="py-2 text-right tnum">{row.settled}</td>
    </tr>
  );
}

/** Competition points leaderboard: global or per competition, this week, this month or all time. */
export function PointsBoard() {
  const { t } = useTranslation("leaderboards");
  const { profile } = useSession();
  const [period, setPeriod] = useState<BoardPeriod>("week");
  const [competition, setCompetition] = useState<string>("");
  const comp = competition || null;

  const board = useAsync(() => fetchScoreBoard(period, comp), [period, comp]);
  const me = useAsync(
    () => (profile ? fetchMyScore(period, comp) : Promise.resolve(null)),
    [period, comp, profile?.id],
  );
  const rules = useAsync(() => fetchScoringRules(), []);
  const rows = board.data ?? [];
  const mine = me.data ?? null;
  const mineShown = mine !== null && rows.some((r) => r.username === mine.username);

  return (
    <section className="card-surface mb-8 p-5" aria-labelledby="points-board-title">
      <h2 id="points-board-title" className="font-display text-lg font-bold">
        {t("points.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("points.subtitle")}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {BOARD_PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              period === p ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {t(`points.period.${p}`)}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="sr-only">{t("points.competition")}</span>
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("points.allCompetitions")}</option>
            {LAUNCH_COMPETITIONS.map((c) => (
              <option key={c.key} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {board.loading ? (
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : board.failed ? (
        <p className="mt-4 text-sm text-destructive">{t("points.error")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("points.empty")}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-semibold">{t("points.col.rank")}</th>
                <th className="py-2 pr-3 font-semibold">{t("points.col.member")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("points.col.points")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("points.col.accuracy")}</th>
                <th className="py-2 pr-3 text-right font-semibold">{t("points.col.correct")}</th>
                <th className="py-2 text-right font-semibold">{t("points.col.settled")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <Row key={r.username} row={r} mine={r.username === mine?.username} />
              ))}
              {mine && !mineShown && <Row row={mine} mine />}
            </tbody>
          </table>
        </div>
      )}
      {profile && !me.loading && !mine && rows.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">{t("points.noRank")}</p>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">{t("points.rules.title")}</h3>
        <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
          {MARKETS.map((m) => (
            <li key={m} className="flex justify-between gap-3">
              <span>{t(`points.market.${m}`)}</span>
              <span className="tnum font-semibold text-foreground">
                {t("points.rules.value", { count: rules.data?.[m] ?? 0 })}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{t("points.rules.note")}</p>
      </div>
    </section>
  );
}
