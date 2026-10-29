import { supabase } from "@/integrations/supabase/client";
import type { UpcomingFixture } from "@/lib/fixtures";

export interface FixtureRow extends UpcomingFixture {
  home_score: number | null;
  away_score: number | null;
}

export interface PickRow {
  id: string;
  user_id: string;
  fixture_id: string;
  market: string;
  selection: string;
  line: number | null;
  odds: number;
  confidence: number;
  reasoning: string | null;
  created_at: string;
  hash: string;
  username: string | null;
  founding_number: number | null;
  result: "won" | "lost" | "void" | null;
  units: number | null;
}

const FIXTURE_COLUMNS =
  "id, sport, competition, home, away, kickoff_at, status, home_score, away_score";
const PICK_COLUMNS =
  "id, user_id, fixture_id, market, selection, line, odds, confidence, reasoning, created_at, hash";

export async function fetchFixture(id: string): Promise<FixtureRow | null> {
  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as FixtureRow | null) ?? null;
}

/** Adds usernames, Founding numbers and results to raw picks. Everything read here is public. */
async function decorate(
  rows: Omit<PickRow, "username" | "founding_number" | "result" | "units">[],
): Promise<PickRow[]> {
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const ids = rows.map((r) => r.id);
  const [{ data: profiles }, { data: results }] = await Promise.all([
    supabase.from("public_profiles").select("id, username, founding_number").in("id", userIds),
    supabase
      .from("prediction_results")
      .select("prediction_id, result, units")
      .in("prediction_id", ids),
  ]);
  const byUser = new Map((profiles ?? []).map((p) => [p.id, p]));
  const byPick = new Map((results ?? []).map((r) => [r.prediction_id, r]));
  return rows.map((r) => {
    const p = byUser.get(r.user_id);
    const res = byPick.get(r.id);
    return {
      ...r,
      username: p?.username ?? null,
      founding_number: p?.founding_number ?? null,
      result: (res?.result as PickRow["result"]) ?? null,
      units: res?.units ?? null,
    };
  });
}

type RawPick = Omit<PickRow, "username" | "founding_number" | "result" | "units">;

/** Every visible (not hidden by moderation) pick on one match, oldest first. */
export async function fetchPicksForFixture(fixtureId: string): Promise<PickRow[]> {
  const { data, error } = await supabase
    .from("visible_predictions")
    .select(PICK_COLUMNS)
    .eq("fixture_id", fixtureId)
    .order("seq", { ascending: true })
    .limit(500);
  if (error) throw error;
  return decorate((data ?? []) as unknown as RawPick[]);
}

export interface FeedPick extends PickRow {
  fixture: FixtureRow | null;
}

export type FeedSort = "new" | "top" | "mine";

/** Monday of the current week in Johannesburg as YYYY-MM-DD, the key weekly_leaderboard uses. */
export function currentWeekStart(now: Date = new Date()): string {
  const sast = new Date(now.getTime() + 2 * 3600 * 1000);
  const day = (sast.getUTCDay() + 6) % 7;
  sast.setUTCDate(sast.getUTCDate() - day);
  return sast.toISOString().slice(0, 10);
}

/** Latest locked picks across all matches. "top" limits to this week's leading tipsters by units. */
export async function fetchFeed(opts: {
  sort: FeedSort;
  userId?: string | undefined;
  before?: string | undefined;
  limit?: number;
}): Promise<FeedPick[]> {
  const limit = opts.limit ?? 20;
  let q = supabase
    .from("visible_predictions")
    .select(PICK_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.before) q = q.lt("created_at", opts.before);

  if (opts.sort === "mine") {
    if (!opts.userId) return [];
    q = q.eq("user_id", opts.userId);
  } else if (opts.sort === "top") {
    const { data: leaders } = await supabase
      .from("weekly_leaderboard")
      .select("user_id")
      .eq("week_start", currentWeekStart())
      .order("units", { ascending: false })
      .limit(10);
    const ids = (leaders ?? []).map((l) => l.user_id).filter((x): x is string => !!x);
    if (ids.length === 0) return [];
    q = q.in("user_id", ids);
  }

  const { data, error } = await q;
  if (error) throw error;
  const picks = await decorate((data ?? []) as unknown as RawPick[]);
  const fixtureIds = [...new Set(picks.map((p) => p.fixture_id))];
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .in("id", fixtureIds);
  const byId = new Map((fixtures ?? []).map((f) => [f.id, f as FixtureRow]));
  return picks.map((p) => ({ ...p, fixture: byId.get(p.fixture_id) ?? null }));
}
