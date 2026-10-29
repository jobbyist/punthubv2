import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { crowdSplit } from "@/lib/picks";

/** Share of Match result (1X2) picks for home, draw and away, always with the sample size. */
export function CrowdSplit({
  picks,
  teams,
}: {
  picks: { market: string; selection: string }[];
  teams: { home: string; away: string };
}) {
  const { t } = useTranslation("match");
  const split = crowdSplit(picks);
  if (!split) return null;

  const rows = [
    { key: "home", label: teams.home, pct: split.home },
    { key: "draw", label: t("crowd.draw"), pct: split.draw },
    { key: "away", label: teams.away, pct: split.away },
  ] as const;

  return (
    <section className="card-surface p-5" aria-labelledby="crowd-title">
      <h2 id="crowd-title" className="text-lg">
        {t("crowd.title")}
      </h2>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div
            key={r.key}
            className="relative overflow-hidden border border-border px-3 py-2.5 text-sm"
          >
            <motion.span
              aria-hidden
              initial={{ width: 0 }}
              animate={{ width: `${r.pct}%` }}
              transition={{ duration: 0.8 }}
              className="absolute inset-y-0 left-0 bg-primary/15"
            />
            <span className="relative flex items-center justify-between gap-3">
              <span className="font-medium">
                {r.key === "draw"
                  ? r.label
                  : t("crowd.sample", { percent: r.pct, team: r.label, count: split.total })}
              </span>
              <span className="tnum text-xs font-semibold text-muted-foreground">{r.pct}%</span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("crowd.note", { count: split.total })}
      </p>
    </section>
  );
}
