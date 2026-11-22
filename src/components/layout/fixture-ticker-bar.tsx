import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatTime } from "@/lib/format";

const ACTIVE_COMPETITIONS = ["Betway Premiership", "Premier League", "UEFA Champions League"];
const FALLBACK: UpcomingFixture[] = [
  { id: "preview-pirates-chiefs", sport: "soccer", competition: "Betway Premiership", home: "Orlando Pirates", away: "Kaizer Chiefs", kickoff_at: "2026-11-28T15:30:00+02:00", status: "scheduled" },
  { id: "preview-city-arsenal", sport: "soccer", competition: "Premier League", home: "Manchester City", away: "Arsenal", kickoff_at: "2026-11-29T18:30:00+02:00", status: "scheduled" },
];

function isActive(fixture: UpcomingFixture) {
  return ACTIVE_COMPETITIONS.some((name) => fixture.competition.toLowerCase().includes(name.toLowerCase()));
}

function liveMinute(kickoff: string) {
  return Math.max(1, Math.min(120, Math.floor((Date.now() - new Date(kickoff).getTime()) / 60_000)));
}

/** Compact, horizontally moving match strip for signed-in members and the post-launch experience. */
export function FixtureTickerBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>(FALLBACK);
  const [isFallback, setIsFallback] = useState(true);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = (await fetchUpcomingFixtures({ days: 10, limit: 80 }))
          .filter(isActive)
          .slice(0, 12);
        if (active && rows.length) {
          setFixtures(rows);
          setIsFallback(false);
        } else if (active) {
          setFixtures(FALLBACK);
          setIsFallback(true);
        }
      } catch (error) {
        console.warn("[Puntr] Fixture ticker using preview fallback", error);
        if (active) {
          setFixtures(FALLBACK);
          setIsFallback(true);
        }
      }
    };
    void load();
    const refresh = window.setInterval(() => void load(), 60_000);
    const clock = window.setInterval(() => setMinute((v) => v + 1), 30_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const items = useMemo(() => [...fixtures, ...fixtures], [fixtures]);
  if (path === "/join" || path === "/founding" || path.startsWith("/admin")) return null;

  return (
    <div className="relative z-40 h-9 overflow-hidden border-b border-border/60 bg-muted/60 text-xs font-medium text-foreground">
      <div className="flex h-full items-center">
        <span className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-border/60 bg-muted/90 px-3 font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Matchday
        </span>
        <div className="min-w-0 flex-1 overflow-hidden" aria-label="Live and upcoming fixtures">
          <motion.div
            className="flex w-max items-center gap-3 px-3"
            animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={reduceMotion ? undefined : { duration: Math.max(24, fixtures.length * 7), ease: "linear", repeat: Infinity }}
            whileHover={{ animationPlayState: "paused" }}
          >
            {items.map((fixture, index) => {
              const live = fixture.status === "live";
              const pill = (
                <>
                  <CompetitionBadge name={fixture.competition} showName={false} />
                  <span className="font-semibold">{fixture.home} <span className="text-muted-foreground">vs</span> {fixture.away}</span>
                  {live ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <span className="puntr-blink size-1.5 rounded-full bg-emerald-500" /> LIVE {liveMinute(fixture.kickoff_at)}'
                    </span>
                  ) : (
                    <span className="text-muted-foreground tnum">{formatTime(fixture.kickoff_at)}</span>
                  )}
                  <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">PUNT AI</span>
                  {isFallback && <span className="text-[9px] text-muted-foreground">PREVIEW</span>}
                </>
              );
              const className = "inline-flex h-7 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 transition-colors hover:border-primary/50 hover:bg-background focus-visible:outline-2 focus-visible:outline-primary";
              return isFallback ? (
                <span key={`${fixture.id}-${index}`} className={className}>{pill}</span>
              ) : (
                <Link
                  key={`${fixture.id}-${index}`}
                  to="/match/$fixtureId"
                  params={{ fixtureId: fixture.id }}
                  className={className}
                  aria-label={`${fixture.competition}: ${fixture.home} versus ${fixture.away}`}
                >
                  {pill}
                </Link>
              );
            })}, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatTime } from "@/lib/format";

const ACTIVE_COMPETITIONS = ["Betway Premiership", "Premier League", "UEFA Champions League"];
const FALLBACK: UpcomingFixture[] = [
  { id: "preview-pirates-chiefs", sport: "soccer", competition: "Betway Premiership", home: "Orlando Pirates", away: "Kaizer Chiefs", kickoff_at: "2026-11-28T15:30:00+02:00", status: "scheduled" },
  { id: "preview-city-arsenal", sport: "soccer", competition: "Premier League", home: "Manchester City", away: "Arsenal", kickoff_at: "2026-11-29T18:30:00+02:00", status: "scheduled" },
];

function isActive(fixture: UpcomingFixture) {
  return ACTIVE_COMPETITIONS.some((name) => fixture.competition.toLowerCase().includes(name.toLowerCase()));
}

function liveMinute(kickoff: string) {
  return Math.max(1, Math.min(120, Math.floor((Date.now() - new Date(kickoff).getTime()) / 60_000)));
}

/** Compact, horizontally moving match strip for signed-in members and the post-launch experience. */
export function FixtureTickerBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>(FALLBACK);
  const [isFallback, setIsFallback] = useState(true);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = (await fetchUpcomingFixtures({ days: 10, limit: 80 }))
          .filter(isActive)
          .slice(0, 12);
        if (active && rows.length) {
          setFixtures(rows);
          setIsFallback(false);
        } else if (active) {
          setFixtures(FALLBACK);
          setIsFallback(true);
        }
      } catch (error) {
        console.warn("[Puntr] Fixture ticker using preview fallback", error);
        if (active) {
          setFixtures(FALLBACK);
          setIsFallback(true);
        }
      }
    };
    void load();
    const refresh = window.setInterval(() => void load(), 60_000);
    const clock = window.setInterval(() => setMinute((v) => v + 1), 30_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const items = useMemo(() => [...fixtures, ...fixtures], [fixtures]);
  if (path === "/join" || path === "/founding" || path.startsWith("/admin")) return null;

  return (
    <div className="relative z-40 h-9 overflow-hidden border-b border-border/60 bg-muted/60 text-xs font-medium text-foreground">
      <div className="flex h-full items-center">
        <span className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-border/60 bg-muted/90 px-3 font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Matchday
        </span>
        <div className="min-w-0 flex-1 overflow-hidden" aria-label="Live and upcoming fixtures">
          <motion.div
            className="flex w-max items-center gap-3 px-3"
            animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={reduceMotion ? undefined : { duration: Math.max(24, fixtures.length * 7), ease: "linear", repeat: Infinity }}
            whileHover={{ animationPlayState: "paused" }}
          >
            {items.map((fixture, index) => {
              const live = fixture.status === "live";
              const fallback = isFallback;
              return (
                <Link
                  key={`${fixture.id}-${index}`}
                  to={fallback ? "/" : "/match/$fixtureId"}
                  params={fallback ? undefined : { fixtureId: fixture.id }}
                  className="inline-flex h-7 shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 transition-colors hover:border-primary/50 hover:bg-background focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`${fixture.competition}: ${fixture.home} versus ${fixture.away}`}
                >
                  <CompetitionBadge name={fixture.competition} showName={false} />
                  <span className="font-semibold">{fixture.home} <span className="text-muted-foreground">vs</span> {fixture.away}</span>
                  {live ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <span className="puntr-blink size-1.5 rounded-full bg-emerald-500" /> LIVE {liveMinute(fixture.kickoff_at) + minute % 2}'
                    </span>
                  ) : (
                    <span className="text-muted-foreground tnum">{formatTime(fixture.kickoff_at)}</span>
                  )}
                  <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">PUNT AI</span>
                  {fallback && <span className="text-[9px] text-muted-foreground">PREVIEW</span>}
                </Link>
              );
            })}
          </motion.div>
        </div>
        <Link to="/discover" className="z-10 hidden h-full shrink-0 items-center gap-1 border-l border-border/60 bg-muted/90 px-3 font-semibold text-primary sm:inline-flex">
          Discover <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
