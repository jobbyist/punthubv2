import { competitionMeta } from "@/lib/match/competition-meta";
import { cn } from "@/lib/utils";

const TONES = {
  ink: "bg-ink text-ink-foreground",
  primary: "bg-primary text-primary-foreground",
  soft: "bg-primary-soft text-primary",
} as const;

/** Monogram tile + competition name. Original artwork only: no league logos (organisers' trademarks). */
export function CompetitionBadge({
  name,
  showName = true,
  className,
}: {
  name: string;
  showName?: boolean;
  className?: string;
}) {
  const meta = competitionMeta(name);
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className={cn(
          "grid h-6 min-w-6 shrink-0 place-items-center rounded-md px-1 font-display text-[9px] font-extrabold leading-none tracking-wide",
          TONES[meta.tone],
        )}
        aria-hidden={showName ? "true" : undefined}
        title={showName ? undefined : name}
      >
        {meta.short}
      </span>
      {showName && (
        <span className="truncate text-[11px] font-semibold text-muted-foreground">{name}</span>
      )}
    </span>
  );
}
