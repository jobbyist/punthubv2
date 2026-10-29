import type { Competition } from "./competitions";
import { mapFootballStatus, mapRugbyStatus } from "./status";
import type { NormalisedFixture } from "./types";

export const PROVIDER = "apisports";

interface FootballItem {
  fixture?: { id?: number; date?: string; status?: { short?: string } };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  goals?: { home?: number | null; away?: number | null };
  score?: { fulltime?: { home?: number | null; away?: number | null } };
}

interface RugbyItem {
  id?: number;
  date?: string;
  status?: { short?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  scores?: { home?: number | null; away?: number | null };
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Soccer scores use the 90-minute (full-time) score so extra time and penalties never reach grading. */
export function normaliseFootball(item: FootballItem, comp: Competition): NormalisedFixture | null {
  const id = item.fixture?.id;
  const date = item.fixture?.date;
  const home = item.teams?.home?.name;
  const away = item.teams?.away?.name;
  const status = mapFootballStatus(item.fixture?.status?.short);
  if (!id || !date || !home || !away || !status || Number.isNaN(Date.parse(date))) return null;
  if (comp.teamIncludes) {
    const needle = comp.teamIncludes.toLowerCase();
    if (!home.toLowerCase().includes(needle) && !away.toLowerCase().includes(needle)) return null;
  }
  const finished = status === "finished";
  const ft = item.score?.fulltime;
  const homeScore = finished ? (num(ft?.home) ?? num(item.goals?.home)) : null;
  const awayScore = finished ? (num(ft?.away) ?? num(item.goals?.away)) : null;
  return {
    provider: PROVIDER,
    providerRef: `football:${id}`,
    sport: "soccer",
    competition: comp.name,
    home,
    away,
    kickoffAt: new Date(date).toISOString(),
    status,
    homeScore: homeScore !== null && awayScore !== null ? homeScore : null,
    awayScore: homeScore !== null && awayScore !== null ? awayScore : null,
  };
}

export function normaliseRugby(item: RugbyItem, comp: Competition): NormalisedFixture | null {
  const id = item.id;
  const date = item.date;
  const home = item.teams?.home?.name;
  const away = item.teams?.away?.name;
  const status = mapRugbyStatus(item.status?.short);
  if (!id || !date || !home || !away || !status || Number.isNaN(Date.parse(date))) return null;
  if (comp.teamIncludes) {
    const needle = comp.teamIncludes.toLowerCase();
    if (!home.toLowerCase().includes(needle) && !away.toLowerCase().includes(needle)) return null;
  }
  const finished = status === "finished";
  const h = finished ? num(item.scores?.home) : null;
  const a = finished ? num(item.scores?.away) : null;
  return {
    provider: PROVIDER,
    providerRef: `rugby:${id}`,
    sport: "rugby",
    competition: comp.name,
    home,
    away,
    kickoffAt: new Date(date).toISOString(),
    status,
    homeScore: h !== null && a !== null ? h : null,
    awayScore: h !== null && a !== null ? a : null,
  };
}
