import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Lock, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { TeamLogo } from "@/components/team-logo";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";

const ACTIVE_COMPETITIONS = ["Betway Premiership", "Premier League", "UEFA Champions League"];
const PREVIEW_FIXTURES: UpcomingFixture[] = [
  {
    id: "preview-pirates-chiefs",
    sport: "soccer",
    competition: "Betway Premiership",
    home: "Orlando Pirates",
    away: "Kaizer Chiefs",
    kickoff_at: "2026-11-28T15:30:00+02:00",
    status: "scheduled",
  },
  {
    id: "preview-city-arsenal",
    sport: "soccer",
    competition: "Premier League",
    home: "Manchester City",
    away: "Arsenal",
    kickoff_at: "2026-11-29T18:30:00+02:00",
    status: "scheduled",
  },
  {
    id: "preview-real-bayern",
    sport: "soccer",
    competition: "UEFA Champions League",
    home: "Real Madrid",
    away: "Bayern Munich",
    kickoff_at: "2026-12-02T21:00:00+02:00",
    status: "scheduled",
  },
  {
    id: "preview-liverpool-arsenal",
    sport: "soccer",
    competition: "Premier League",
    home: "Liverpool",
    away: "Arsenal",
    kickoff_at: "2026-12-03T20:00:00+02:00",
    status: "scheduled",
  },
];

function isActive(fixture: UpcomingFixture) {
  return ACTIVE_COMPETITIONS.some((name) =>
    fixture.competition.toLowerCase().includes(name.toLowerCase()),
  );
}

/** Guest-facing Matchday Intelligence rail. The preview state is deterministic for SSR and hydration. */
export function HeroFixtureRail() {
  const rail = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>(PREVIEW_FIXTURES);
  const [isFallback, setIsFallback] = useState(true);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [reservationOpen, setReservationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetchUpcomingFixtures({ days: 14, limit: 100 })
      .then((rows) => {
        const curated = rows.filter(isActive).slice(0, 6);
        if (active && curated.length) {
          setFixtures(curated);
          setIsFallback(false);
        }
      })
      .catch((error) => console.warn("[Puntr] Guest fixture rail using preview fixtures", error));
    return () => {
      active = false;
    };
  }, []);

  const advance = useCallback(
    (direction = 1) => {
      const el = rail.current;
      if (!el) return;
      const cards = el.querySelectorAll<HTMLElement>("[data-fixture-card]");
      if (!cards.length) return;
      const next = (index + direction + cards.length) % cards.length;
      setIndex(next);
      el.scrollTo({
        left: (cards[next]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [index, reduceMotion],
  );

  useEffect(() => {
    if (paused || reduceMotion || fixtures.length < 2) return;
    const timer = window.setInterval(() => advance(1), 15000);
    return () => window.clearInterval(timer);
  }, [advance, fixtures.length, paused, reduceMotion]);

  return (
    <section className="relative mb-5 mt-2" aria-label="Upcoming matchday intelligence">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              Matchday Intelligence
            </p>
            <p className="text-xs text-muted-foreground">The fixtures worth watching next</p>
          </div>
          {isFallback && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
              Preview
            </span>
          )}
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => advance(-1)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Previous fixtures"
            className="grid size-6 place-items-center rounded-full border border-border bg-background/80 shadow-sm transition-opacity hover:bg-muted sm:opacity-60 sm:hover:opacity-100"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => advance(1)}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            aria-label="Next fixtures"
            className="grid size-6 place-items-center rounded-full border border-border bg-background/80 shadow-sm hover:bg-muted"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={rail}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
        }}
        onScroll={() => {
          const el = rail.current;
          if (!el) return;
          const cards = [...el.querySelectorAll<HTMLElement>("[data-fixture-card]")];
          const closest = cards.reduce(
            (best, card, i) =>
              Math.abs(card.offsetLeft - el.scrollLeft) <
              Math.abs((cards[best]?.offsetLeft ?? 0) - el.scrollLeft)
                ? i
                : best,
            0,
          );
          setIndex(closest);
        }}
      >
        {fixtures.map((fixture) => (
          <motion.article
            key={fixture.id}
            data-fixture-card
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-[min(82vw,310px)] shrink-0 snap-start rounded-2xl border border-border bg-card p-3 shadow-sm sm:w-[310px]"
          >
            <div className="flex items-center justify-between gap-2">
              <CompetitionBadge name={fixture.competition} />
              <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                {formatDate(fixture.kickoff_at)} · {formatTime(fixture.kickoff_at)} SAST
              </span>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TeamLogo team={fixture.home} sport={fixture.sport} size="sm" />
                <span className="line-clamp-2 text-xs font-bold">{fixture.home}</span>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">VS</span>
              <div className="flex min-w-0 items-center justify-end gap-2 text-right">
                <span className="line-clamp-2 text-xs font-bold">{fixture.away}</span>
                <TeamLogo team={fixture.away} sport={fixture.sport} size="sm" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
              <button
                type="button"
                onClick={() => setReservationOpen(true)}
                className="inline-flex items-center gap-1.5 text-left text-[10px] text-muted-foreground hover:text-primary"
              >
                <Lock className="size-3 text-primary" /> PUNT AI confidence locked
              </button>
              <button
                type="button"
                onClick={() => setReservationOpen(true)}
                className="shrink-0 text-[10px] font-bold text-primary hover:underline"
              >
                Back this pick →
              </button>
            </div>
            {isFallback && (
              <p className="mt-1 text-[9px] text-muted-foreground">
                Illustrative fixture preview — live schedule unavailable
              </p>
            )}
          </motion.article>
        ))}
      </div>
      <div
        className="mt-1 flex justify-center gap-1.5"
        aria-label={`Fixture ${index + 1} of ${fixtures.length}`}
      >
        {fixtures.map((fixture, i) => (
          <span
            key={fixture.id}
            className={`h-1 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-border"}`}
          />
        ))}
      </div>
      <Dialog open={reservationOpen} onOpenChange={setReservationOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Get closer to the action</DialogTitle>
            <DialogDescription>
              Unlock the full PUNT AI match intelligence experience as a Puntr Founding Member. Join
              the first 100 members before the platform launch.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Founding access is free. No payment is required to reserve your place. 18+ only. Gamble
            responsibly.
          </div>
          <Link
            to="/join"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            Reserve my Founding spot
          </Link>
        </DialogContent>
      </Dialog>
    </section>
  );
}
