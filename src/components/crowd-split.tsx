import { useEffect, useState } from "react";
import { motion, animate, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { crowdSplit } from "@/lib/picks";

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setCount(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.85,
      ease: "easeOut",
      onUpdate: (v) => setCount(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <>{count}%</>;
}

/** Community 1X2 split, using only recorded picks. */
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
    { key: "home", label: teams.home, pct: split.home, color: "bg-emerald-500" },
    { key: "draw", label: t("crowd.draw"), pct: split.draw, color: "bg-amber-400" },
    { key: "away", label: teams.away, pct: split.away, color: "bg-sky-500" },
  ] as const;
  return (
    <section className="card-surface p-5" aria-labelledby="crowd-title">
      <div className="flex items-end justify-between gap-3">
        <h2 id="crowd-title" className="text-lg">
          {t("crowd.title")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t("crowd.note", { count: split.total })}
        </span>
      </div>
      <div
        className="mt-4 flex h-4 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={rows.map((r) => `${r.label} ${r.pct}%`).join(", ")}
      >
        {rows.map((r) => (
          <motion.div
            key={r.key}
            initial={{ width: 0 }}
            animate={{ width: `${r.pct}%` }}
            transition={{ duration: 0.85, ease: "easeOut" }}
            className={r.color}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.key} className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5">
              <span className={`size-2 shrink-0 rounded-full ${r.color}`} />
              <span className="truncate text-xs text-muted-foreground">{r.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">
              <CountUp value={r.pct} />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
