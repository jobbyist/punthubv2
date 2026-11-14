import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Leaderboard building blocks shared by the sample boards and the live ones: a three-step podium whose blocks
 * rise in turn, and a ranked row with a medal, a monogram and a bar that grows to the member's share of the
 * leader's total. Works from 320 px: no table, no sideways scrolling.
 */

const MEDAL = [
  "bg-[oklch(0.85_0.16_90)] text-ink", // gold
  "bg-[oklch(0.86_0.01_250)] text-ink", // silver
  "bg-[oklch(0.8_0.09_55)] text-ink", // bronze
];

export function medalClass(rank: number | null | undefined): string {
  return rank && rank <= 3 ? MEDAL[rank - 1]! : "bg-muted text-muted-foreground";
}

export function Monogram({ name, className }: { name: string; className?: string }) {
  const letters =
    name
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 2)
      .toUpperCase() || "?";
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-xs font-extrabold text-primary ring-1 ring-primary/20",
        className,
      )}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

export interface PodiumEntry {
  name: string;
  value: ReactNode;
  sub?: ReactNode;
}

/** Top three as a podium: second, first, third. Fewer than three entries renders nothing. */
export function Podium({ entries, unit }: { entries: PodiumEntry[]; unit?: string }) {
  if (entries.length < 3) return null;
  const order = [
    { e: entries[1]!, rank: 2, h: "h-16 sm:h-20", i: 1 },
    { e: entries[0]!, rank: 1, h: "h-24 sm:h-28", i: 2 },
    { e: entries[2]!, rank: 3, h: "h-12 sm:h-14", i: 0 },
  ];
  return (
    <ol className="grid grid-cols-3 items-end gap-2 px-3 pt-6 sm:gap-4 sm:px-8">
      {order.map(({ e, rank, h, i }) => (
        <li key={e.name} className="flex min-w-0 flex-col items-center text-center" value={rank}>
          <Monogram
            name={e.name}
            className={cn("puntr-pop", rank === 1 ? "size-12 text-sm sm:size-14" : "size-10")}
          />
          <p className="mt-2 w-full truncate text-xs font-semibold sm:text-sm">{e.name}</p>
          <p className="text-sm font-extrabold text-primary tnum sm:text-base">
            {e.value}
            {unit && (
              <span className="ml-1 text-[10px] font-semibold text-muted-foreground">{unit}</span>
            )}
          </p>
          {e.sub && <p className="text-[10px] text-muted-foreground tnum">{e.sub}</p>}
          <div
            className={cn(
              "puntr-grow-y mt-2 grid w-full place-items-start rounded-t-lg border border-b-0 pt-2",
              h,
              rank === 1 ? "border-primary/40 bg-primary-soft" : "border-border bg-muted/60",
            )}
            style={{ ["--i" as string]: i }}
          >
            <span
              className={cn(
                "mx-auto grid size-7 place-items-center rounded-full text-xs font-extrabold tnum",
                medalClass(rank),
              )}
            >
              {rank}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** One ranked member. `share` (0 to 1) draws the bar; `stats` are short label/value pairs. */
export function RankRow({
  rank,
  name,
  nameSlot,
  share,
  primary,
  stats,
  highlight,
  index = 0,
}: {
  rank: number | null;
  name: string;
  /** Replaces the plain name (for a profile link). */
  nameSlot?: ReactNode;
  share?: number;
  primary: ReactNode;
  stats?: { label: string; value: ReactNode }[];
  highlight?: boolean;
  index?: number;
}) {
  return (
    <li
      className={cn(
        "puntr-rise flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-5",
        highlight && "bg-primary-soft/60",
      )}
      style={{ ["--i" as string]: Math.min(index, 10) }}
    >
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold tnum",
          medalClass(rank),
        )}
      >
        {rank ?? "–"}
      </span>
      <Monogram name={name} className="hidden min-[380px]:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold">{nameSlot ?? name}</span>
          <span className="shrink-0 text-sm font-extrabold text-primary tnum">{primary}</span>
        </div>
        {typeof share === "number" && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="puntr-grow-x h-full rounded-full bg-primary"
              style={{
                width: `${Math.max(4, Math.min(100, share * 100))}%`,
                ["--i" as string]: Math.min(index, 10) + 2,
              }}
            />
          </div>
        )}
        {stats && stats.length > 0 && (
          <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
            {stats.map((s) => (
              <div key={s.label} className="flex gap-1">
                <dt>{s.label}</dt>
                <dd className="font-semibold text-foreground tnum">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </li>
  );
}
