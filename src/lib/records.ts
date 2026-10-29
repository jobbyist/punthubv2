import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { currentWeekStart, type FixtureRow } from "@/lib/pick-data";

export const MIN_SETTLED_FOR_RANK = 10;
export const MIN_ODDS_FOR_RANK = 1.5;

export interface BoardRow {
  week_start: string;
  user_id: string;
  username: string;
  picks_settled: number;
  wins: number;
  units: number;
  roi: number;
  eligible: boolean;
  rank: number | null;
}

export interface TipsterStats {
  picks: number;
  settled: number;
  wins: number;
  units: number;
  roi: number | null;
  win_rate: number | null;
  form_last_10: string;
}

/** Monday of the previous week, from a Monday date string. */
export function previousWeekStart(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** "Mon 26 Oct 2026 to Sun 1 Nov 2026". */
export function weekRange(weekStart: string): { from: string; to: string } {
  const from = new Date(`${weekStart}T12:00:00+02:00`);
  const to = new Date(from.getTime() + 6 * 24 * 3600 * 1000);
  return { from: formatDate(from), to: formatDate(to) };
}

/** How many more settled picks (at odds of 1.50 or more) a tipster needs before they are ranked. */
export function picksNeeded(settled: number): number {
  return Math.max(0, MIN_SETTLED_FOR_RANK - settled);
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Eligible tipsters first, in rank order, then everyone else by units. */
export async function fetchWeeklyBoard(weekStart: string, limit = 50): Promise<BoardRow[]> {
  const { data, error } = await supabase
    .from("weekly_leaderboard")
    .select("week_start, user_id, username, picks_settled, wins, units, roi, eligible, rank")
    .eq("week_start", weekStart)
    .order("units", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows: BoardRow[] = (data ?? []).map((r) => ({
    week_start: r.week_start ?? weekStart,
    user_id: r.user_id ?? "",
    username: r.username ?? "",
    picks_settled: num(r.picks_settled),
    wins: num(r.wins),
    units: num(r.units),
    roi: num(r.roi),
    eligible: r.eligible === true,
    rank: r.rank ?? null,
  }));
  return rows.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.eligible && b.eligible) return (a.rank ?? 1e9) - (b.rank ?? 1e9);
    return b.units - a.units;
  });
}

export async function fetchThisWeeksLeaders(count: number): Promise<BoardRow[]> {
  return (await fetchWeeklyBoard(currentWeekStart(), count)).slice(0, count);
}

export interface PublicProfile {
  id: string;
  username: string;
  founding_number: number | null;
  created_at: string | null;
}

export async function fetchPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username, founding_number, created_at")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  if (!data?.id || !data.username) return null;
  return {
    id: data.id,
    username: data.username,
    founding_number: data.founding_number,
    created_at: data.created_at,
  };
}

export async function fetchTipsterStats(userId: string): Promise<TipsterStats> {
  const { data, error } = await supabase
    .from("tipster_stats")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return {
    picks: num(data?.picks),
    settled: num(data?.settled),
    wins: num(data?.wins),
    units: num(data?.units),
    roi: data?.roi === null || data?.roi === undefined ? null : Number(data.roi),
    win_rate:
      data?.win_rate === null || data?.win_rate === undefined ? null : Number(data.win_rate),
    form_last_10: data?.form_last_10 ?? "",
  };
}

// ---------------------------------------------------------------------------------------------------------
// Results: finished fixtures with how the crowd and this week's top tipsters did
// ---------------------------------------------------------------------------------------------------------

export interface ResultPick {
  id: string;
  user_id: string;
  username: string | null;
  result: "won" | "lost" | "void" | null;
}

export interface ResultFixture {
  fixture: FixtureRow;
  picks: number;
  settled: number;
  /** Share of settled (won or lost) picks that won, or null when none are settled. */
  crowdWinRate: number | null;
  leaders: ResultPick[];
}

export function summariseFixture(
  fixture: FixtureRow,
  picks: ResultPick[],
  leaderIds: string[],
): ResultFixture {
  const decided = picks.filter((p) => p.result === "won" || p.result === "lost");
  const won = decided.filter((p) => p.result === "won").length;
  return {
    fixture,
    picks: picks.length,
    settled: decided.length,
    crowdWinRate: decided.length ? won / decided.length : null,
    leaders: picks.filter((p) => leaderIds.includes(p.user_id)),
  };
}

export interface ResultDay {
  label: string;
  fixtures: ResultFixture[];
  picks: number;
}

/** Groups by South African calendar day, newest first. Input must already be newest first. */
export function groupResultsByDay(items: ResultFixture[]): ResultDay[] {
  const days: ResultDay[] = [];
  for (const item of items) {
    const label = formatDate(item.fixture.kickoff_at);
    const last = days[days.length - 1];
    if (last && last.label === label) {
      last.fixtures.push(item);
      last.picks += item.picks;
    } else days.push({ label, fixtures: [item], picks: item.picks });
  }
  return days;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function fetchResults(days = 14): Promise<ResultDay[]> {
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
  const { data: fx, error } = await supabase
    .from("fixtures")
    .select("id, sport, competition, home, away, kickoff_at, status, home_score, away_score")
    .eq("status", "finished")
    .gte("kickoff_at", since)
    .order("kickoff_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const fixtures = (fx ?? []) as FixtureRow[];
  if (fixtures.length === 0) return [];

  const { data: picks } = await supabase
    .from("visible_predictions")
    .select("id, user_id, fixture_id")
    .in(
      "fixture_id",
      fixtures.map((f) => f.id),
    )
    .limit(2000);
  const rows = picks ?? [];

  const resultById = new Map<string, "won" | "lost" | "void">();
  for (const ids of chunk(
    rows.map((r) => r.id).filter((x): x is string => !!x),
    100,
  )) {
    const { data } = await supabase
      .from("prediction_results")
      .select("prediction_id, result")
      .in("prediction_id", ids);
    for (const r of data ?? [])
      if (r.prediction_id) resultById.set(r.prediction_id, r.result as "won" | "lost" | "void");
  }

  const leaders = await fetchThisWeeksLeaders(3);
  const names = new Map(leaders.map((l) => [l.user_id, l.username]));
  const leaderIds = leaders.map((l) => l.user_id);

  const items = fixtures.map((f) =>
    summariseFixture(
      f,
      rows
        .filter((r) => r.fixture_id === f.id && r.id && r.user_id)
        .map((r) => ({
          id: r.id!,
          user_id: r.user_id!,
          username: names.get(r.user_id!) ?? null,
          result: resultById.get(r.id!) ?? null,
        })),
      leaderIds,
    ),
  );
  return groupResultsByDay(items);
}
