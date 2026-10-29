import type { Sport } from "@/lib/sports/types";

export type Market = "1X2" | "DC" | "OU25" | "BTTS" | "HCP";

/** Markets open for each sport at launch. The database enforces the same rules. */
export const MARKETS_BY_SPORT: Record<Sport, Market[]> = {
  soccer: ["1X2", "DC", "OU25", "BTTS"],
  rugby: ["1X2", "HCP"],
};

export const SELECTIONS: Record<Market, string[]> = {
  "1X2": ["home", "draw", "away"],
  DC: ["1X", "X2", "12"],
  OU25: ["over", "under"],
  BTTS: ["yes", "no"],
  HCP: ["home", "away"],
};

export interface PickInput {
  market: Market;
  selection: string | null;
  /** Handicap line, applied to the home team's score. Handicap only. */
  line: string;
  odds: string;
  confidence: number | null;
  reasoning: string;
}

export type PickProblem = "selection" | "line" | "odds" | "confidence" | "reasoning";

export const REASONING_MAX = 280;

/** Two decimals at most, 1.01 to 50. Returns the number, or null when the text is not a valid price. */
export function parseOdds(text: string): number | null {
  const clean = text.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n >= 1.01 && n <= 50 ? n : null;
}

/** A handicap line such as -6.5 or 3, from -60 to 60 with at most two decimals. */
export function parseLine(text: string): number | null {
  const clean = text.trim().replace(",", ".").replace("−", "-");
  if (!/^[+-]?\d{1,2}(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n >= -60 && n <= 60 ? n : null;
}

/** Client-side checks, so mistakes are caught before a request. The server re-checks everything. */
export function validatePick(input: PickInput): PickProblem | null {
  if (!input.selection || !SELECTIONS[input.market].includes(input.selection)) return "selection";
  if (input.market === "HCP" && parseLine(input.line) === null) return "line";
  if (parseOdds(input.odds) === null) return "odds";
  if (!input.confidence || input.confidence < 1 || input.confidence > 5) return "confidence";
  if (input.reasoning.length > REASONING_MAX) return "reasoning";
  return null;
}

/** Maps what the database (or PostgREST) returns to a message key under match:error. */
export function pickErrorKey(
  error: { message?: string; code?: string } | null | undefined,
): string {
  const message = error?.message ?? "";
  if (
    error?.code === "23505" ||
    /duplicate key|predictions_user_id_fixture_id_market_key/.test(message)
  ) {
    return "duplicate";
  }
  const known = [
    "kickoff_passed",
    "fixture_not_open",
    "fixture_not_found",
    "daily_limit",
    "posting_paused",
    "banned",
    "age_not_attested",
    "no_profile",
    "not_authenticated",
    "invalid_market",
    "invalid_market_for_sport",
    "invalid_selection",
    "invalid_line",
    "invalid_odds",
    "invalid_confidence",
    "reasoning_too_long",
  ];
  return known.includes(message) ? message : "generic";
}

export interface Countdown {
  /** "open" while picks can still be posted, "locked" once kick-off has passed. */
  state: "open" | "locked";
  days: number;
  hours: number;
  minutes: number;
}

export function countdownTo(kickoff: string | Date, now: Date = new Date()): Countdown {
  const ms = new Date(kickoff).getTime() - now.getTime();
  if (ms <= 0) return { state: "locked", days: 0, hours: 0, minutes: 0 };
  const totalMinutes = Math.floor(ms / 60000);
  return {
    state: "open",
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/** "2h 14m", "1d 3h", "14m". Under a minute shows "<1m". */
export function formatSpan(c: Pick<Countdown, "days" | "hours" | "minutes">): string {
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  return c.minutes > 0 ? `${c.minutes}m` : "<1m";
}

/** How long before kick-off a pick was locked: "3h 12m". */
export function lockedBefore(createdAt: string, kickoff: string): string {
  const ms = new Date(kickoff).getTime() - new Date(createdAt).getTime();
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  return formatSpan({
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  });
}

export interface CrowdSplit {
  total: number;
  /** Percent of picks, rounded, for home, draw and away. They can sum to 99 or 101 because of rounding. */
  home: number;
  draw: number;
  away: number;
}

/** Split of the Match result (1X2) picks on a fixture. Other markets are ignored. */
export function crowdSplit(picks: { market: string; selection: string }[]): CrowdSplit | null {
  const rows = picks.filter((p) => p.market === "1X2");
  if (rows.length === 0) return null;
  const count = (s: string) => rows.filter((p) => p.selection === s).length;
  const pct = (n: number) => Math.round((n / rows.length) * 100);
  return {
    total: rows.length,
    home: pct(count("home")),
    draw: pct(count("draw")),
    away: pct(count("away")),
  };
}

/** The label for a handicap line: "+6.5" or "-6.5". */
export function signedLine(line: number): string {
  return line > 0 ? `+${line}` : String(line);
}
