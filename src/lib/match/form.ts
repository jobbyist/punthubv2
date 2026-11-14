import { supabase } from "@/integrations/supabase/client";

/**
 * Team form from Puntr's own settled fixtures: no third-party stats and no AI. A team shows form only once we
 * have stored at least one final score for it; nothing here estimates or invents a number (owner rule: AI never
 * calculates scores and the product never claims data it does not have).
 */
export type FormLetter = "W" | "D" | "L";

export interface FinishedRow {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
}

export interface FormEntry {
  result: FormLetter;
  opponent: string;
  venue: "H" | "A";
  scored: number;
  conceded: number;
  kickoff_at: string;
  competition: string;
}

export interface TeamForm {
  team: string;
  /** Newest first, at most `n`. */
  entries: FormEntry[];
  played: number;
  scored: number;
  conceded: number;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Last `n` results per team, newest first. Rows without both scores are ignored. */
export function computeForms(
  rows: FinishedRow[],
  teams: string[],
  n = 5,
): Record<string, TeamForm> {
  const sorted = [...rows]
    .filter((r) => r.home_score !== null && r.away_score !== null)
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
  const out: Record<string, TeamForm> = {};
  for (const team of new Set(teams)) {
    const key = norm(team);
    const entries: FormEntry[] = [];
    for (const r of sorted) {
      if (entries.length >= n) break;
      const home = norm(r.home) === key;
      const away = norm(r.away) === key;
      if (!home && !away) continue;
      const scored = (home ? r.home_score : r.away_score) as number;
      const conceded = (home ? r.away_score : r.home_score) as number;
      entries.push({
        result: scored > conceded ? "W" : scored < conceded ? "L" : "D",
        opponent: home ? r.away : r.home,
        venue: home ? "H" : "A",
        scored,
        conceded,
        kickoff_at: r.kickoff_at,
        competition: r.competition,
      });
    }
    out[team] = {
      team,
      entries,
      played: entries.length,
      scored: entries.reduce((s, e) => s + e.scored, 0),
      conceded: entries.reduce((s, e) => s + e.conceded, 0),
    };
  }
  return out;
}

/** Earlier meetings between the two teams (either venue), newest first. */
export function headToHead(rows: FinishedRow[], a: string, b: string, n = 5): FinishedRow[] {
  const x = norm(a);
  const y = norm(b);
  return rows
    .filter(
      (r) =>
        r.home_score !== null &&
        r.away_score !== null &&
        ((norm(r.home) === x && norm(r.away) === y) || (norm(r.home) === y && norm(r.away) === x)),
    )
    .sort((p, q) => q.kickoff_at.localeCompare(p.kickoff_at))
    .slice(0, n);
}

/** Average per match to one decimal, or null below `min` matches (too few to say anything). */
export function perMatch(total: number, played: number, min = 3): string | null {
  if (played < min) return null;
  return (total / played).toFixed(1);
}

/** PostgREST `in` list with every name quoted, so commas or brackets in a team name cannot break the filter. */
export function quotedList(names: string[]): string {
  return names.map((n) => `"${n.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
}

/** Finished fixtures involving any of `teams`, newest first (public read through RLS). */
export async function fetchFinishedFor(teams: string[], limit = 300): Promise<FinishedRow[]> {
  const unique = Array.from(new Set(teams)).filter(Boolean).slice(0, 80);
  if (unique.length === 0) return [];
  const list = quotedList(unique);
  const { data, error } = await supabase
    .from("fixtures")
    .select("id, competition, home, away, kickoff_at, home_score, away_score")
    .eq("status", "finished")
    .or(`home.in.(${list}),away.in.(${list})`)
    .order("kickoff_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FinishedRow[];
}
