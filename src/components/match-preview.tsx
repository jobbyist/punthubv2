import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { ArrowRight, Check, Lock, MapPin, Pause, Play, Sparkles } from "lucide-react";
import { TeamLogo } from "@/components/team-logo";
import { useSession } from "@/components/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_MATCHUP_ID,
  MARQUEE_CYCLE_MS,
  MARQUEE_MATCHUPS,
  type MarqueeMatchup,
  type OutcomeKey,
  nextMatchupIndex,
  outcomeLabel,
  outcomesFor,
  roadmapWeek,
} from "@/lib/marquee-matchups";
import { cn } from "@/lib/utils";

const DEFAULT_INDEX = Math.max(
  0,
  MARQUEE_MATCHUPS.findIndex((m) => m.id === DEFAULT_MATCHUP_ID),
);
const BAR_SPRING = { type: "spring", stiffness: 120, damping: 14 } as const;

/**
 * Marquee Matchup card on the home page. ILLUSTRATIVE ONLY: every number is a sample (lib/marquee-matchups.ts) and
 * nothing tapped here is stored. Guests who tap an outcome get the Founding Member prompt; the CTA carries the pick to
 * /founding in router history state (no cookie or browser storage).
 *
 * Hydration: server and first client render always show the Soweto Derby; auto-rotation starts only after mount, never
 * with prefers-reduced-motion, and stops for good once the visitor picks a rivalry or an outcome.
 */
export function MatchPreview() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const { isSignedIn, loading } = useSession();
  // Gated on mount so the first client render matches the server (useReducedMotion is null on the server).
  const reduceRaw = useReducedMotion();

  const [index, setIndex] = useState(DEFAULT_INDEX);
  const [picks, setPicks] = useState<Partial<Record<MarqueeMatchup["id"], OutcomeKey>>>({});
  const [dialogPick, setDialogPick] = useState<{ id: MarqueeMatchup["id"]; k: OutcomeKey } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [stopped, setStopped] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { amount: 0.35 });
  const progress = useMotionValue(0);

  useEffect(() => setMounted(true), []);
  const reduce = mounted && Boolean(reduceRaw);

  const m = MARQUEE_MATCHUPS[index] ?? MARQUEE_MATCHUPS[0]!;
  const autoAvailable = mounted && !reduce && !stopped;
  const cycling = autoAvailable && !userPaused && !hovered && inView && !dialogPick;

  useAnimationFrame((_, delta) => {
    if (!cycling) return;
    const next = progress.get() + delta / MARQUEE_CYCLE_MS;
    if (next >= 1) {
      progress.set(0);
      setIndex((i) => nextMatchupIndex(i));
    } else {
      progress.set(next);
    }
  });

  // Keep the active rivalry visible in the pill bar without scrolling the page (no scrollIntoView).
  useEffect(() => {
    const bar = pillsRef.current;
    const pill = bar?.querySelector<HTMLElement>(`[data-id="${m.id}"]`);
    if (!bar || !pill) return;
    const left = pill.offsetLeft - (bar.clientWidth - pill.clientWidth) / 2;
    bar.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
  }, [m.id, reduce]);

  const select = useCallback(
    (i: number) => {
      setStopped(true);
      progress.set(0);
      setIndex(i);
    },
    [progress],
  );

  const handlePick = (k: OutcomeKey) => {
    setStopped(true);
    if (!loading && !isSignedIn) {
      setDialogPick({ id: m.id, k });
      return;
    }
    setPicks((p) => ({ ...p, [m.id]: k }));
  };

  const picked = picks[m.id] ?? null;
  const week = roadmapWeek(m.sport);
  const leanTeam = outcomeLabel(m, m.lean);
  const leanText = leanTeam ? t("matchups.ai.win", { team: leanTeam }) : t("matchups.draw");

  const dialogMatchup = dialogPick ? MARQUEE_MATCHUPS.find((x) => x.id === dialogPick.id) : null;
  const dialogTeam = dialogMatchup && dialogPick ? outcomeLabel(dialogMatchup, dialogPick.k) : null;
  const dialogMatchupName = dialogPick ? t(`matchups.items.${dialogPick.id}.short`) : "";

  return (
    <>
      <div
        ref={cardRef}
        className="card-surface relative isolate overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setHovered(true)}
        onBlurCapture={() => setHovered(false)}
        onTouchStart={() => setStopped(true)}
      >
        {/* Animated top sheen in brand green. Decorative. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden"
        >
          <motion.div
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ x: "-100%" }}
            animate={reduce ? { x: "50%" } : { x: ["-100%", "200%"] }}
            transition={
              reduce ? { duration: 0 } : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
            }
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4 sm:px-6">
          <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            {t("matchups.eyebrow")}
          </p>
          <div className="flex items-center gap-2">
            {autoAvailable ? (
              <button
                type="button"
                onClick={() => setUserPaused((p) => !p)}
                className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                aria-label={userPaused ? t("matchups.play") : t("matchups.pause")}
              >
                {userPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
              </button>
            ) : null}
          </div>
        </div>

        {/* Rivalry selector */}
        <div className="relative">
          <div
            ref={pillsRef}
            role="tablist"
            aria-label={t("matchups.selector")}
            className="flex gap-2 overflow-x-auto px-5 pb-3 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
          >
            {MARQUEE_MATCHUPS.map((x, i) => {
              const active = i === index;
              return (
                <button
                  key={x.id}
                  data-id={x.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls="marquee-panel"
                  onClick={() => select(i)}
                  className={cn(
                    "relative shrink-0 whitespace-nowrap border px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
                    active
                      ? "border-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="marquee-pill"
                      aria-hidden
                      className="absolute inset-0 bg-primary"
                      transition={reduce ? { duration: 0 } : BAR_SPRING}
                    />
                  ) : null}
                  <span className="relative">{t(`matchups.items.${x.id}.short`)}</span>
                </button>
              );
            })}
          </div>
          {/* Auto-rotation progress. */}
          <div aria-hidden className="h-0.5 bg-border/60">
            {autoAvailable ? (
              <motion.div className="h-full origin-left bg-primary" style={{ scaleX: progress }} />
            ) : null}
          </div>
        </div>

        <div id="marquee-panel" role="tabpanel" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={m.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0 : 0.22 }}
            >
              {/* Clash section with floodlight backdrop. */}
              <div className="relative overflow-hidden px-4 pb-5 pt-5 sm:px-6">
                <Floodlights reduce={reduce} />

                <div className="relative text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <span className="inline-block border border-primary/30 bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                      {t(`matchups.items.${m.id}.tag`)}
                    </span>
                    <span className="bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {week === null
                        ? t("matchups.status.illustrative")
                        : t("matchups.status.roadmap", { week })}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg leading-tight sm:text-xl">
                    {t(`matchups.items.${m.id}.title`)}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(`matchups.items.${m.id}.competition`)}
                  </p>
                </div>

                {/* Badge above the name on phones so neither name is cut off; side by side from sm up. */}
                <div className="relative mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
                  <TeamSide
                    team={m.home.team}
                    label={m.home.label}
                    sport={m.sport}
                    reduce={reduce}
                  />
                  <VsBadge label={tc("vs").toUpperCase()} reduce={reduce} />
                  <TeamSide
                    team={m.away.team}
                    label={m.away.label}
                    sport={m.sport}
                    reduce={reduce}
                    away
                  />
                </div>

                <p className="relative mt-4 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">{t(`matchups.items.${m.id}.venue`)}</span>
                </p>
              </div>

              {/* AI lean */}
              <div className="flex items-center gap-4 border-t border-border px-4 py-4 sm:px-6">
                <ConfidenceDial
                  value={m.confidence}
                  label={t("matchups.ai.dial")}
                  run={mounted && inView}
                  reduce={reduce}
                  id={m.id}
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    <Sparkles className="size-3" aria-hidden />
                    {t("matchups.ai.pick")} · <span className="tnum">{m.confidence}%</span>
                  </span>
                  <p className="mt-1.5 text-sm font-semibold leading-snug">
                    {t("matchups.ai.lean", { outcome: leanText })}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {t(`matchups.items.${m.id}.insight`)}
                  </p>
                </div>
              </div>

              {/* Community split */}
              <div className="border-t border-border px-4 py-5 sm:px-6">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">{t("matchups.community")}</p>
                  <p className="text-xs text-muted-foreground">{t("matchups.tap")}</p>
                </div>
                <div className="mt-2 space-y-2">
                  {outcomesFor(m).map((k) => {
                    const share = m.split[k] ?? 0;
                    const active = picked === k;
                    const isLean = m.lean === k;
                    return (
                      <motion.button
                        key={k}
                        type="button"
                        onClick={() => handlePick(k)}
                        aria-pressed={active}
                        {...(reduce ? {} : { whileTap: { scale: 0.98 } })}
                        className={cn(
                          "relative min-h-12 w-full overflow-hidden border px-3 py-3 text-left text-sm transition-[border-color,box-shadow] touch-manipulation",
                          active
                            ? "border-primary bg-primary-soft shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_22%,transparent)]"
                            : "border-border hover:border-primary/50",
                        )}
                      >
                        <motion.span
                          aria-hidden
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={reduce ? { duration: 0 } : { ...BAR_SPRING, delay: 0.1 }}
                          className={cn(
                            "absolute inset-y-0 left-0",
                            active ? "bg-primary/20" : isLean ? "bg-primary/10" : "bg-muted",
                          )}
                        />
                        <span className="relative flex items-center justify-between gap-3">
                          <span className="flex min-w-0 items-center gap-2">
                            <AnimatePresence initial={false}>
                              {active ? (
                                <motion.span
                                  key="check"
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  transition={reduce ? { duration: 0 } : BAR_SPRING}
                                  className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
                                >
                                  <Check className="size-3" strokeWidth={3} />
                                  <span className="sr-only">{t("matchups.picked")}</span>
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                            <span className="min-w-0 truncate font-medium">
                              {outcomeLabel(m, k) ?? t("matchups.draw")}
                            </span>
                            {isLean ? (
                              <Sparkles
                                className="size-3.5 shrink-0 text-primary"
                                aria-label={t("matchups.ai.pick")}
                              />
                            ) : null}
                          </span>
                          <span className="shrink-0 tnum text-xs font-bold text-foreground">
                            {share}%
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-border px-4 pb-5 pt-4 sm:px-6">
          <p className="flex items-start gap-2 text-xs text-muted-foreground" aria-live="polite">
            <Lock className="mt-0.5 size-3.5 shrink-0 text-primary" />
            {picked ? t("preview.locked") : t("preview.idle")}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/80">{t("matchups.fine")}</p>
        </div>
      </div>

      <Dialog open={dialogPick !== null} onOpenChange={(o) => !o && setDialogPick(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-5 sm:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-xl font-extrabold leading-tight">
              {t("matchups.dialog.title", { matchup: dialogMatchupName })}
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed">
              {dialogTeam
                ? t("matchups.dialog.body", { team: dialogTeam })
                : t("matchups.dialog.bodyDraw")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 sm:flex-col">
            <Button asChild className="h-12 w-full text-sm font-bold">
              <Link
                to="/founding"
                state={(prev) => ({
                  ...prev,
                  marqueePick: { matchup: dialogMatchupName, team: dialogTeam },
                })}
                onClick={() => setDialogPick(null)}
              >
                {t("matchups.dialog.cta")} <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamSide({
  team,
  label,
  sport,
  reduce,
  away = false,
}: {
  team: string;
  label: string;
  sport: string;
  reduce: boolean;
  away?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col items-center gap-2 text-center",
        away ? "sm:flex-row-reverse sm:text-right" : "sm:flex-row sm:text-left",
      )}
    >
      <motion.div
        {...(reduce ? {} : { whileHover: { y: -3, scale: 1.06 } })}
        transition={BAR_SPRING}
        className="rounded-full shadow-[0_6px_18px_color-mix(in_oklch,var(--primary)_18%,transparent)]"
      >
        <TeamLogo team={team} sport={sport} size="lg" className="size-12 sm:size-14" />
      </motion.div>
      <span className="text-sm font-semibold leading-tight sm:text-base">{label}</span>
    </div>
  );
}

function VsBadge({ label, reduce }: { label: string; reduce: boolean }) {
  return (
    <span className="relative grid size-10 shrink-0 place-items-center">
      {!reduce ? (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full ring-2 ring-primary/50"
          animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      ) : null}
      <span className="relative grid size-10 place-items-center rounded-full bg-ink text-[10px] font-extrabold tracking-wide text-ink-foreground ring-2 ring-primary shadow-[0_0_16px_color-mix(in_oklch,var(--primary)_45%,transparent)]">
        {label}
      </span>
    </span>
  );
}

/** Two soft stadium floodlight beams in brand green plus a pitch glow. Decorative, no images. */
function Floodlights({ reduce }: { reduce: boolean }) {
  const beam =
    "absolute -top-10 h-48 w-40 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_70%)] blur-sm";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
      <motion.span
        className={cn(beam, "left-[8%] -rotate-12")}
        {...(reduce ? {} : { animate: { opacity: [0.65, 1, 0.65] } })}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className={cn(beam, "right-[8%] rotate-12")}
        {...(reduce ? {} : { animate: { opacity: [1, 0.65, 1] } })}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(ellipse_at_bottom,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_70%)]" />
    </div>
  );
}

/** Circular confidence gauge that fills from 0 when the card is in view and again on each matchup change. */
function ConfidenceDial({
  value,
  label,
  run,
  reduce,
  id,
}: {
  value: number;
  label: string;
  run: boolean;
  reduce: boolean;
  id: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const target = c * (1 - value / 100);
  return (
    <div className="relative size-16 shrink-0" role="img" aria-label={`${label}: ${value}%`}>
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" className="stroke-border" strokeWidth="6" />
        <motion.circle
          key={id}
          cx="32"
          cy="32"
          r={r}
          fill="none"
          className="stroke-primary"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? target : c }}
          animate={{ strokeDashoffset: run || reduce ? target : c }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-display text-sm font-extrabold tnum">
        {value}%
      </span>
    </div>
  );
}
