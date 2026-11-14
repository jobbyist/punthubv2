import { motion } from "motion/react";

/** Two-sided share bar with names and percentages, animated on change. */
export function SplitBar({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: number;
  right: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const total = left + right;
  const lp = total ? Math.round((left / total) * 100) : 50;
  const rp = total ? 100 - lp : 50;
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-xs font-semibold">
        <span className="truncate">
          {leftLabel} <span className="text-primary tnum">{total ? `${lp}%` : ""}</span>
        </span>
        <span className="truncate text-right">
          <span className="tnum text-muted-foreground">{total ? `${rp}%` : ""}</span> {rightLabel}
        </span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${leftLabel} ${lp}%, ${rightLabel} ${rp}%`}
      >
        <motion.span
          className="h-full bg-primary"
          initial={false}
          animate={{ width: `${lp}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
        <motion.span
          className="h-full bg-ink"
          initial={false}
          animate={{ width: `${rp}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        />
      </div>
    </div>
  );
}
