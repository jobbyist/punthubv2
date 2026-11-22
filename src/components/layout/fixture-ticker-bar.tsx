import { Link, useRouterState } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { TeamLogo } from "@/components/team-logo";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatTime } from "@/lib/format";

const ACTIVE_COMPETITIONS = ["Betway Premiership", "Premier League", "UEFA Champions League"];
const FALLBACK: UpcomingFixture[] = [
  { id: "preview-pirates-chiefs", sport: "soccer", competition: "Betway Premiership", home: "Orlando Pirates", away: "Kaizer Chiefs", kickoff_at: "2026-11-28T15:30:00+02:00", status: "scheduled" },
  { id: "preview-city-arsenal", sport: "soccer", competition: "Premier League", home: "Manchester City", away: "Arsenal", kickoff_at: "2026-11-29T18:30:00+02:00", status: "scheduled" },
];

const TEAM_SHORT_NAMES: Record<string, string> = {
  "Liverpool": "LIV", "Arsenal": "ARS", "Manchester City": "MCI", "Manchester United": "MUN",
  "Chelsea": "CHE", "Tottenham Hotspur": "TOT", "Tottenham": "TOT", "Newcastle United": "NEW",
  "Aston Villa": "AVL", "Brighton": "BHA", "Brighton & Hove Albion": "BHA", "West Ham United": "WHU",
  "Everton": "EVE", "Fulham": "FUL", "Brentford": "BRE", "Crystal Palace": "CRY",
  "Nottingham Forest": "NFO", "Bournemouth": "BOU", "Wolverhampton Wanderers": "WOL", "Wolves": "WOL",
  "Sunderland": "SUN", "Leeds United": "LEE", "Burnley": "BUR",
  "Orlando Pirates": "ORL", "Kaizer Chiefs": "KAI", "Mamelodi Sundowns": "MSU",
  "Stellenbosch": "STB", "Sekhukhune United": "SEK", "SuperSport United": "SSU",
  "Cape Town City": "CTC", "Polokwane City": "POL", "Real Madrid": "RMA", "Bayern Munich": "BAY",
};

function shortTeamName(name: string) {
  const known = TEAM_SHORT_NAMES[name];
  if (known) return known;
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts.map((part) => part[0]).join("") : parts[0].slice(0, 3))
    .slice(0, 3)
    .toUpperCase();
}

function isActive(fixture: UpcomingFixture) {
  return ACTIVE_COMPETITIONS.some((name) => fixture.competition.toLowerCase().includes(name.toLowerCase()));
}

function liveMinute(kickoff: string) {
  return Math.max(1, Math.min(120, Math.floor((Date.now() - new Date(kickoff).getTime()) / 60_000)));
}

/** Mobile-only match ticker. Desktop navigation has its own wider fixture discovery surfaces. */
export function FixtureTickerBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const reduceMotion = useReducedMotion();
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>(FALLBACK);
  const [isFallback, setIsFallback] = useState(true);
  const [, setMinuteTick] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = (await fetchUpcomingFixtures({ days: 10, limit: 80 })).filter(isActive).slice(0, 12);
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
    const clock = window.setInterval(() => setMinuteTick((value) => value + 1), 60_000);
    return () => {
      active = false;
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, []);

  const items = useMemo(() => [...fixtures, ...fixtures], [fixtures]);
  if (path === "/join" || path === "/founding" || path.startsWith("/admin")) return null;

  return (
    <div className="relative z-30 block h-12 overflow-hidden border-b border-border/70 bg-background lg:hidden sm:h-[52px]">
      <div className="flex h-full items-center">
        <span className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-border/70 bg-muted/80 px-2.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground sm:px-3 sm:text-[10px]">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Matchday
        </span>
        <div className="min-w-0 flex-1 overflow-hidden" aria-label="Live and upcoming fixtures">
          <motion.div
            className="flex w-max items-center gap-2 px-2.5 sm:gap-3 sm:px-3"
            animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
            transition={reduceMotion ? undefined : { duration: Math.max(90, fixtures.length * 15), ease: "linear", repeat: Infinity }}
          >
            {items.map((fixture, index) => {
              const home = (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <TeamLogo team={fixture.home} sport={fixture.sport} size="sm" className="!size-6 sm:!size-7" />
                  <span className="text-[11px] font-extrabold tracking-wide sm:text-xs">{shortTeamName(fixture.home)}</span>
                </span>
              );
              const away = (
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <TeamLogo team={fixture.away} sport={fixture.sport} size="sm" className="!size-6 sm:!size-7" />
                  <span className="text-[11px] font-extrabold tracking-wide sm:text-xs">{shortTeamName(fixture.away)}</span>
                </span>
              );
              const status = fixture.status === "live" ? (
                <span className="ml-1 inline-flex shrink-0 items-center gap-1 text-[9px] font-bold text-emerald-600 sm:text-[10px]">
                  <span className="puntr-blink size-1.5 rounded-full bg-emerald-500" />
                  {liveMinute(fixture.kickoff_at)}'
                  {fixture.home_score !== null && fixture.home_score !== undefined && fixture.away_score !== null && fixture.away_score !== undefined
                    ? <span className="font-extrabold text-foreground">{fixture.home_score}–{fixture.away_score}</span>
                    : null}
                </span>
              ) : (
                <span className="ml-1 shrink-0 text-[9px] font-semibold tabular-nums text-muted-foreground sm:text-[10px]">{formatTime(fixture.kickoff_at)}</span>
              );
              const pill = (
                <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-border/80 bg-card px-2.5 shadow-sm sm:h-10 sm:gap-2.5 sm:px-3">
                  {home}
                  <span className="text-[10px] font-bold text-muted-foreground">-</span>
                  {away}
                  {status}
                  {isFallback && <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</span>}
                </span>
              );
              return isFallback ? (
                <span key={fixture.id + "-" + index}>{pill}</span>
              ) : (
                <Link
                  key={fixture.id + "-" + index}
                  to="/match/$fixtureId"
                  params={{ fixtureId: fixture.id }}
                  aria-label={fixture.competition + ": " + fixture.home + " versus " + fixture.away}
                  className="rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {pill}
                </Link>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
