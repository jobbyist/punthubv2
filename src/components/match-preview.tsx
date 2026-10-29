import { useState } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { key: "home", label: "Orlando Pirates", share: 62 },
  { key: "draw", label: "Draw", share: 22 },
  { key: "away", label: "Kaizer Chiefs", share: 16 },
] as const;

/**
 * Illustrative only: a sample fixture that shows how a pick is made and locked.
 * Nothing here is stored, and the numbers are not real predictions.
 */
export function MatchPreview() {
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 sm:px-6">
        <h2 className="text-lg">Soweto Derby</h2>
        <span className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Illustrative example
        </span>
      </div>
      <div className="border-t border-border px-5 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo team="Orlando Pirates" size="lg" />
            <span className="truncate font-semibold">Orlando Pirates</span>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">VS</span>
          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="truncate text-right font-semibold">Kaizer Chiefs</span>
            <TeamLogo team="Kaizer Chiefs" size="lg" />
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Betway Premiership · Sample fixture</p>

        <p className="mt-5 text-sm font-semibold">Tap to try a pick</p>
        <div className="mt-2 space-y-2">
          {OPTIONS.map((o) => {
            const active = picked === o.key;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setPicked(o.key)}
                aria-pressed={active}
                className={cn(
                  "relative w-full overflow-hidden border px-3 py-2.5 text-left text-sm transition-colors",
                  active ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50",
                )}
              >
                <motion.span
                  aria-hidden
                  initial={{ width: 0 }}
                  animate={{ width: `${o.share}%` }}
                  transition={{ duration: 0.9, delay: 0.2 }}
                  className={cn("absolute inset-y-0 left-0", active ? "bg-primary/15" : "bg-muted")}
                />
                <span className="relative flex items-center justify-between">
                  <span className="font-medium">{o.label}</span>
                  <span className="tnum text-xs font-semibold text-muted-foreground">{o.share}%</span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground" aria-live="polite">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {picked
            ? "On Puntr this pick would be timestamped and locked at kick-off. It could not be edited or deleted."
            : "Picks lock at kick-off and cannot be edited or deleted."}
        </p>
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          Sample split for illustration. Not a real prediction. Nothing you tap here is saved.
        </p>
      </div>
    </div>
  );
}
