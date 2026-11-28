/**
 * Marquee matchups for the home page preview card (src/components/match-preview.tsx).
 *
 * ILLUSTRATIVE ONLY. Every number here (AI confidence, community split) is a sample for the guest preview, not a
 * model output or a real poll. Copy (titles, venues, insights) lives in the `home` namespace under `matchups.items.<id>`
 * so it is translated with the rest of the site. Real form and head-to-head numbers come only from recorded results
 * (owner rule, 14 Nov 2026), so this file carries none.
 *
 * Sports other than football are on the roadmap, not live: their tag is derived from SPORT_ROADMAP so the card never
 * claims coverage the platform does not have yet.
 */
import { SPORT_ROADMAP, type RoadmapSport } from "@/lib/roadmap";

export type MatchupSport = Extract<RoadmapSport, "soccer" | "rugby" | "basketball" | "cricket">;
export type OutcomeKey = "home" | "draw" | "away";

export type MarqueeTeam = {
  /** Name used for the badge lookup (team_badges registry / bundled logos). */
  team: string;
  /** Name shown on the card. */
  label: string;
};

export type MarqueeMatchup = {
  id: "soweto" | "boks-ab" | "clasico" | "north-south" | "celtics-lakers" | "proteas-aus";
  sport: MatchupSport;
  home: MarqueeTeam;
  away: MarqueeTeam;
  /** Sample AI confidence for the lean, 0-100. */
  confidence: number;
  /** The outcome the sample model leans to. */
  lean: OutcomeKey;
  /** Sample community split. Two-way sports have no draw. Shares sum to 100. */
  split: Partial<Record<OutcomeKey, number>>;
};

export const MARQUEE_MATCHUPS: readonly MarqueeMatchup[] = [
  {
    id: "soweto",
    sport: "soccer",
    home: { team: "Orlando Pirates", label: "Orlando Pirates" },
    away: { team: "Kaizer Chiefs", label: "Kaizer Chiefs" },
    confidence: 74,
    lean: "home",
    split: { home: 62, draw: 22, away: 16 },
  },
  {
    id: "boks-ab",
    sport: "rugby",
    home: { team: "South Africa", label: "South Africa" },
    away: { team: "New Zealand", label: "New Zealand" },
    confidence: 61,
    lean: "home",
    split: { home: 58, draw: 4, away: 38 },
  },
  {
    id: "clasico",
    sport: "soccer",
    home: { team: "Real Madrid", label: "Real Madrid" },
    away: { team: "Barcelona", label: "FC Barcelona" },
    confidence: 52,
    lean: "away",
    split: { home: 41, draw: 24, away: 35 },
  },
  {
    id: "north-south",
    sport: "rugby",
    home: { team: "Stormers", label: "DHL Stormers" },
    away: { team: "Bulls", label: "Vodacom Bulls" },
    confidence: 57,
    lean: "home",
    split: { home: 54, draw: 3, away: 43 },
  },
  {
    id: "celtics-lakers",
    sport: "basketball",
    home: { team: "Boston Celtics", label: "Boston Celtics" },
    away: { team: "Los Angeles Lakers", label: "LA Lakers" },
    confidence: 66,
    lean: "home",
    split: { home: 63, away: 37 },
  },
  {
    id: "proteas-aus",
    sport: "cricket",
    home: { team: "South Africa", label: "South Africa" },
    away: { team: "Australia", label: "Australia" },
    confidence: 55,
    lean: "home",
    split: { home: 57, away: 43 },
  },
];

/** Curated teams shown in the home hero badge marquee, across all supported sports. */
export const MARQUEE_BADGE_TEAMS = [
  {
    sport: "soccer",
    team: "Orlando Pirates",
    label: "Orlando Pirates",
    competition: "Club football",
  },
  { sport: "soccer", team: "Kaizer Chiefs", label: "Kaizer Chiefs", competition: "Club football" },
  { sport: "rugby", team: "South Africa", label: "Springboks", competition: "International rugby" },
  { sport: "rugby", team: "New Zealand", label: "All Blacks", competition: "International rugby" },
  { sport: "soccer", team: "Real Madrid", label: "Real Madrid", competition: "Club football" },
  { sport: "soccer", team: "Barcelona", label: "FC Barcelona", competition: "Club football" },
  {
    sport: "rugby",
    team: "Stormers",
    label: "DHL Stormers",
    competition: "United Rugby Championship",
  },
  {
    sport: "rugby",
    team: "Bulls",
    label: "Vodacom Bulls",
    competition: "United Rugby Championship",
  },
  { sport: "basketball", team: "Boston Celtics", label: "Boston Celtics", competition: "NBA" },
  { sport: "basketball", team: "Los Angeles Lakers", label: "LA Lakers", competition: "NBA" },
  {
    sport: "cricket",
    team: "South Africa",
    label: "Proteas",
    competition: "International cricket",
  },
  {
    sport: "soccer",
    team: "Australia",
    label: "Australia · World Cup",
    competition: "FIFA World Cup",
  },
] as const;
/** The SSR/first-paint matchup: always the Soweto Derby, so server and client render the same markup. */
export const DEFAULT_MATCHUP_ID: MarqueeMatchup["id"] = "soweto";

/** Auto-rotation interval for the card, in milliseconds. */
export const MARQUEE_CYCLE_MS = 8000;

export function outcomesFor(m: MarqueeMatchup): OutcomeKey[] {
  return (["home", "draw", "away"] as const).filter((k) => m.split[k] !== undefined);
}

export function isTwoWay(m: MarqueeMatchup): boolean {
  return m.split.draw === undefined;
}

/** First roadmap week a sport goes live (week 1 = launch week), or null for football, which is live at launch. */
export function roadmapWeek(sport: MatchupSport): number | null {
  if (sport === "soccer") return null;
  return SPORT_ROADMAP.find((r) => r.sport === sport)?.weeks[0] ?? null;
}

export function nextMatchupIndex(current: number, length = MARQUEE_MATCHUPS.length): number {
  return (current + 1) % length;
}

/** Display name for an outcome: a team label, or null for the draw (the caller translates "Draw"). */
export function outcomeLabel(m: MarqueeMatchup, k: OutcomeKey): string | null {
  if (k === "home") return m.home.label;
  if (k === "away") return m.away.label;
  return null;
}

/** A guest's sample pick, carried to /founding in router history state (never in a cookie or browser storage). */
export type MarqueePickState = { matchup: string; team: string | null };

declare module "@tanstack/react-router" {
  interface HistoryState {
    marqueePick?: MarqueePickState;
  }
}
