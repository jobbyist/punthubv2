import { CalendarClock, CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { FormGuide } from "@/components/match/form-guide";
import { TeamLogo } from "@/components/team-logo";
import type { FormEntry } from "@/lib/match/form";
import { cn } from "@/lib/utils";

/**
 * One visual language for a match everywhere it appears: upcoming fixtures, live matches and settled results.
 * Header: competition monogram + name and a status/kick-off pill. Centre: crests on soft halos either side of a
 * centre plate (kick-off time, LIVE or the score), each with an optional last-5 form guide, then an optional
 * one-line insight. Footer: actions or meta. Names wrap to two lines and never push the layout, from 320 px up.
 */
export type FixtureCardStatus = "upcoming" | "live" | "final";

function Side({
  team,
  sport,
  align,
  dim,
  winner,
  form,
}: {
  team: string;
  sport?: string | undefined;
  align: "left" | "right";
  dim: boolean;
  winner: boolean;
  form?: FormEntry[] | undefined | null;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 text-center transition-opacity",
        dim && "opacity-55",
      )}
    >
      <span
        className={cn(
          "relative grid size-14 place-items-center rounded-full bg-gradient-to-b from-muted to-transparent ring-1 ring-border sm:size-16",
          winner && "ring-2 ring-primary/60",
        )}
      >
        <TeamLogo team={team} sport={sport} size="lg" className="size-10 sm:size-11" />
        {winner && (
          <CheckCircle2
            className={cn(
              "puntr-pop absolute -bottom-1 size-5 rounded-full bg-card text-primary",
              align === "left" ? "-right-1" : "-left-1",
            )}
            aria-hidden="true"
          />
        )}
      </span>
      <span
        className={cn(
          "line-clamp-2 text-[13px] leading-tight sm:text-sm",
          winner ? "font-bold" : "font-semibold",
        )}
      >
        {team}
      </span>
      {form !== undefined && <FormGuide team={team} entries={form ?? []} />}
    </div>
  );
}

export function FixtureCard({
  home,
  away,
  sport,
  sportLabel,
  competition,
  status = "upcoming",
  time,
  dayLabel,
  score,
  statusLabel,
  vsLabel = "vs",
  footer,
  className,
  children,
  pill,
  form,
  insight,
}: {
  home: string;
  away: string;
  sport?: string | undefined;
  sportLabel?: string;
  competition: string;
  status?: FixtureCardStatus;
  /** Kick-off time, already formatted (e.g. "19:30"). */
  time?: string;
  /** Small line under the time: the date, or "Sample kick-off". */
  dayLabel?: string;
  score?: { home: number | string; away: number | string } | undefined;
  /** "Live", "Full time" and so on, already translated. */
  statusLabel?: string;
  vsLabel?: string;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** Replaces the default status pill in the header (e.g. a kick-off countdown pill). */
  pill?: ReactNode;
  /** Last-5 form per side. Pass null (or []) to show the empty guide; leave undefined to hide it. */
  form?: { home?: FormEntry[] | null; away?: FormEntry[] | null } | undefined;
  /** One short line under the matchup, e.g. a goals-per-game read. */
  insight?: ReactNode;
}) {
  const h = score ? Number(score.home) : NaN;
  const a = score ? Number(score.away) : NaN;
  const decided = status === "final" && Number.isFinite(h) && Number.isFinite(a) && h !== a;
  const homeWon = decided && h > a;
  const awayWon = decided && a > h;

  return (
    <article className={cn("card-surface card-interactive flex min-w-0 flex-col", className)}>
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <span className="flex min-w-0 items-center gap-2">
          <CompetitionBadge name={competition} />
          {sportLabel && !pill && (
            <span className="hidden shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary sm:inline">
              {sportLabel}
            </span>
          )}
        </span>
        {pill ?? (
          <>
            {status === "live" && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                <span className="puntr-blink size-1.5 rounded-full bg-primary-foreground" />
                {statusLabel}
              </span>
            )}
            {status === "final" && statusLabel && (
              <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {statusLabel}
              </span>
            )}
          </>
        )}
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4 py-5 sm:gap-3">
        <Side
          team={home}
          sport={sport}
          align="left"
          dim={awayWon}
          winner={homeWon}
          form={form ? (form.home ?? null) : undefined}
        />
        <div className="min-w-[4.75rem] text-center">
          {score ? (
            <p className="font-display text-2xl font-extrabold leading-none tnum sm:text-[28px]">
              <span className={cn(awayWon && "text-muted-foreground")}>{score.home}</span>
              <span className="mx-1.5 text-muted-foreground/60">–</span>
              <span className={cn(homeWon && "text-muted-foreground")}>{score.away}</span>
            </p>
          ) : (
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                {vsLabel}
              </p>
              {time && (
                <p className="mt-1.5 inline-flex items-center rounded-lg bg-ink px-2.5 py-1 font-display text-sm font-extrabold text-ink-foreground tnum">
                  {time}
                </p>
              )}
            </>
          )}
          {dayLabel && (
            <p className="mt-1.5 text-[10px] leading-tight text-muted-foreground">{dayLabel}</p>
          )}
        </div>
        <Side
          team={away}
          sport={sport}
          align="right"
          dim={homeWon}
          winner={awayWon}
          form={form ? (form.away ?? null) : undefined}
        />
      </div>

      {insight && (
        <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <span className="min-w-0">{insight}</span>
        </p>
      )}

      {children && <div className="px-4 pb-4">{children}</div>}

      {footer && (
        <footer className="mt-auto flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5 text-[11px] text-muted-foreground">
          {footer}
        </footer>
      )}
    </article>
  );
}

/** Footer line used by upcoming fixtures. */
export function KickoffMeta({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        {label}
      </span>
      {value && <span className="font-semibold text-foreground tnum">{value}</span>}
    </>
  );
}
