import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { RankRow } from "@/components/leader-board";
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

function Row({
  row,
  mine,
  top,
  index,
  labels,
}: {
  row: ScoreRow;
  mine: boolean;
  top: number;
  index: number;
  labels: { accuracy: string; correct: string; settled: string };
}) {
  return (
    <RankRow
      rank={row.rank}
      index={index}
      name={row.username}
      nameSlot={<>@{row.username}</>}
      highlight={mine}
      primary={row.points}
      {...(top > 0 ? { share: row.points / top } : {})}
      stats={[
        { label: labels.accuracy, value: `${row.accuracy.toFixed(1)}%` },
        { label: labels.correct, value: row.correct },
        { label: labels.settled, value: row.settled },
      ]}
    />
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
  const top = Math.max(0, ...rows.map((r) => r.points));
  const labels = {
    accuracy: t("points.col.accuracy"),
    correct: t("points.col.correct"),
    settled: t("points.col.settled"),
  };

  return (
    <section className="card-surface overflow-hidden p-5" aria-labelledby="points-board-title">
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
        <div className="puntr-shimmer mt-4 h-32 rounded-lg" aria-hidden />
      ) : board.failed ? (
        <p className="mt-4 text-sm text-destructive">{t("points.error")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("points.empty")}</p>
      ) : (
        <ol className="-mx-5 mt-4 divide-y divide-border border-y border-border">
          {rows.map((r, i) => (
            <Row
              key={r.username}
              row={r}
              mine={r.username === mine?.username}
              top={top}
              index={i}
              labels={labels}
            />
          ))}
          {mine && !mineShown && (
            <Row row={mine} mine top={top} index={rows.length} labels={labels} />
          )}
        </ol>
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
