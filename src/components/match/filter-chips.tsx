import { LayoutGroup, MotionConfig, motion } from "motion/react";

import { cn } from "@/lib/utils";

export interface FilterChip {
  key: string;
  label: string;
  count?: number;
}

/**
 * Pill filters with a sliding highlight (shared layout animation). The parent owns the state; selection is
 * announced through aria-pressed. Reduced motion is honoured by MotionConfig.
 */
export function FilterChips({
  id,
  chips,
  active,
  onSelect,
  label,
  className,
}: {
  /** Unique per page so two chip rows never share a highlight. */
  id: string;
  chips: FilterChip[];
  active: string;
  onSelect: (key: string) => void;
  label: string;
  className?: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={id}>
        <div
          role="group"
          aria-label={label}
          className={cn(
            "-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible",
            className,
          )}
        >
          {chips.map((c) => {
            const on = c.key === active;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(c.key)}
                className={cn(
                  "relative shrink-0 snap-start rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  on ? "text-ink-foreground" : "border border-border hover:bg-muted",
                )}
              >
                {on && (
                  <motion.span
                    layoutId={`${id}-pill`}
                    className="absolute inset-0 -z-10 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  {c.label}
                  {c.count !== undefined && (
                    <span className="ml-1.5 tnum opacity-70">{c.count}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
