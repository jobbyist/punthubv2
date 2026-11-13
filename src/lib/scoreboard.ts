/**
 * Competition points: the member-facing side of `20261113160000_competition_scoring.sql`.
 *
 * Postgres is the authority (one ledger row per settlement event, written by a trigger). The two pure functions
 * here state the same rules in TypeScript so they can be unit-tested and shown to members; they never write scores.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export const BOARD_PERIODS = ["week", "month", "all"] as const;
export type BoardPeriod = (typeof BOARD_PERIODS)[number];

export interface ScoreRow {
  rank: number;
  username: string;
  avatar_url: string | null;
  points: number;
  correct: number;
  settled: number;
  /** Percentage of settled picks that were correct, one decimal place. */
  accuracy: number;
}

export type ScoringRules = Record<string, number>;

/** Brief 4.5 defaults; DC and HCP are the two extra markets the pick form already offers. */
export const DEFAULT_SCORING_RULES: ScoringRules = { "1X2": 3, BTTS: 2, OU25: 2, DC: 1, HCP: 2 };

/** Points for one settled pick: the market's points when correct, nothing when wrong or void. */
export function pointsFor(
  market: string,
  result: "won" | "lost" | "void",
  rules: ScoringRules,
): number {
  return result === "won" ? (rules[market] ?? 0) : 0;
}

type Totals = Pick<ScoreRow, "username" | "points" | "correct" | "settled">;

/** Tie-break order: points, correct picks, accuracy, settled picks, then username. Same as the SQL. */
export function compareScores(a: Totals, b: Totals): number {
  const acc = (r: Totals) => (r.settled === 0 ? 0 : r.correct / r.settled);
  return (
    b.points - a.points ||
    b.correct - a.correct ||
    acc(b) - acc(a) ||
    b.settled - a.settled ||
    a.username.localeCompare(b.username)
  );
}

// The scoring functions are not in the generated types until `types.ts` is regenerated.
const db = supabase as unknown as SupabaseClient;

function toRow(r: Record<string, unknown>): ScoreRow {
  const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
  return {
    rank: n(r["rank"]),
    username: typeof r["username"] === "string" ? r["username"] : "",
    avatar_url: typeof r["avatar_url"] === "string" ? r["avatar_url"] : null,
    points: n(r["points"]),
    correct: n(r["correct"]),
    settled: n(r["settled"]),
    accuracy: n(r["accuracy"]),
  };
}

export async function fetchScoreBoard(
  period: BoardPeriod,
  competition: string | null,
  limit = 50,
): Promise<ScoreRow[]> {
  const { data, error } = await db.rpc("competition_leaderboard", {
    p_period: period,
    p_competition: competition,
    p_limit: limit,
    p_offset: 0,
  });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map(toRow);
}

/** The signed-in member's own row, even when they are outside the first page. Null when they have no settled pick. */
export async function fetchMyScore(
  period: BoardPeriod,
  competition: string | null,
): Promise<ScoreRow | null> {
  const { data, error } = await db.rpc("my_competition_rank", {
    p_period: period,
    p_competition: competition,
  });
  if (error) throw error;
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  return row ? toRow(row) : null;
}

export async function fetchScoringRules(): Promise<ScoringRules> {
  const { data, error } = await db.from("scoring_rules").select("market, points");
  if (error) throw error;
  const rules: ScoringRules = {};
  for (const r of (data ?? []) as { market: string; points: number }[]) rules[r.market] = r.points;
  return Object.keys(rules).length > 0 ? rules : DEFAULT_SCORING_RULES;
}
