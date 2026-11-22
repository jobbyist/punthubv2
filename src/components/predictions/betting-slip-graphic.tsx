import { motion, useReducedMotion } from "motion/react";

export function BettingSlipGraphic({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion();
  const legs = [0, 1, 2];
  return (
    <div aria-hidden className={`relative mx-auto w-full max-w-xs ${compact ? "h-44" : "h-56"}`}>
      <div className="absolute left-2 top-2 w-44 rotate-[-4deg] rounded-lg border border-border bg-card p-3 shadow-md">
        <div className="mb-2 h-2 w-16 rounded bg-foreground/80" />
        {legs.map(i => <div key={i} className="mb-2 flex items-center justify-between"><span className="h-1.5 w-20 rounded bg-muted-foreground/50" /><span className="h-1.5 w-8 rounded bg-muted" /></div>)}
        <div className="mt-3 h-2 w-full rounded bg-muted" />
        {!reduce && <motion.div className="absolute inset-x-2 h-6 rounded bg-gradient-to-b from-transparent via-primary/30 to-transparent" initial={{ top: 8 }} animate={{ top: [8, 110, 8] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />}
      </div>
      <div className="absolute bottom-1 right-0 flex w-44 flex-col gap-2">
        {legs.map(i => {
          const chip = <><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-primary" /><span className="h-1.5 w-14 rounded bg-foreground/60" /></span><span className="rounded bg-primary-soft px-1.5 text-[10px] font-bold text-primary">{["1X2", "BTTS", "O/U"][i]}</span></>;
          const cls = "flex items-center justify-between rounded-md border border-primary/30 bg-background px-2.5 py-1.5 shadow-sm";
          return reduce ? <div key={i} className={cls}>{chip}</div> : <motion.div key={i} initial={{ opacity: 0, x: -24, scale: 0.9 }} animate={{ opacity: [0, 1, 1, 0], x: [-24, 0, 0, 8], scale: [0.9, 1, 1, 0.98] }} transition={{ duration: 3.2, delay: 0.5 + i * 0.45, repeat: Infinity, repeatDelay: 0.4 }} className={cls}>{chip}</motion.div>;
        })}
      </div>
    </div>
  );
}
