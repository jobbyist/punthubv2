/**
 * Live football coverage numbers for the soccer page, from public tables only (RLS public reads):
 * upcoming fixtures, verified results, stored league tables and their freshness. Every number is counted from the
 * database at request time, so the page moves with PFIE without copy changes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { soccerCoverage, type CoverageCompetition } from "@/lib/sports/coverage";
import type { CompetitionKey } from "@/lib/sports/competitions";

const db = supabase as unknown as SupabaseClient;

export interface CompetitionLive extends CoverageCompetition {
  /** Fixtures in the next 14 days. */
  upcoming: number;
  /** Teams in the stored, verified table (0 when none is stored yet). */
  tableTeams: number;
  /** When the stored table was last confirmed. */
  tableUpdatedAt: string | null;
  /** Teams seen in this competition's fixtures, tables or verified results. */
  teams: number | null;
}

export interface SoccerCoverageLive {
  competitions: CompetitionLive[];
  totals: {
    upcoming: number;
    results: number;
    teams: number;
    tables: number;
  };
  nextKickoff: string | null;
  checkedAt: string;
}

async function safe<T>(label: string, run: () => PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    console.error(`coverage: ${label} failed`, error);
    return fallback;
  }
}

export async function fetchSoccerCoverage(now = new Date()): Promise<SoccerCoverageLive> {
  const list = soccerCoverage();
  const byName = new Map(list.map((c) => [c.name, c.key]));
  const to = new Date(now.getTime() + 14 * 86_400_000).toISOString();

  const [fixtures, tables, results] = await Promise.all([
    safe(
      "fixtures",
      async () => {
        const { data, error } = await db
          .from("fixtures")
          .select("competition, home, away, kickoff_at")
          .eq("sport", "soccer")
          .in("status", ["scheduled", "live"])
          .gte("kickoff_at", now.toISOString())
          .lte("kickoff_at", to)
          .order("kickoff_at", { ascending: true })
          .limit(1000);
        if (error) throw error;
        return (data ?? []) as {
          competition: string;
          home: string;
          away: string;
          kickoff_at: string;
        }[];
      },
      [],
    ),
    safe(
      "tables",
      async () => {
        const { data, error } = await db
          .from("league_standings")
          .select("competition_key, team, updated_at")
          .in(
            "competition_key",
            list.filter((c) => c.table).map((c) => c.key),
          )
          .limit(2000);
        if (error) throw error;
        return (data ?? []) as { competition_key: string; team: string; updated_at: string }[];
      },
      [],
    ),
    safe(
      "results",
      async () => {
        const { count, error } = await db
          .from("completed_matches")
          .select("id", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      },
      0,
    ),
  ]);

  const upcoming = new Map<CompetitionKey, number>();
  const teamsBy = new Map<CompetitionKey, Set<string>>();
  const allTeams = new Set<string>();
  const addTeam = (key: CompetitionKey, team: string) => {
    const t = team.trim().toLowerCase();
    if (!t) return;
    if (!teamsBy.has(key)) teamsBy.set(key, new Set());
    teamsBy.get(key)!.add(t);
    allTeams.add(t);
  };
  for (const f of fixtures) {
    const key = byName.get(f.competition);
    if (!key) continue;
    upcoming.set(key, (upcoming.get(key) ?? 0) + 1);
    addTeam(key, f.home);
    addTeam(key, f.away);
  }
  const tableTeams = new Map<string, number>();
  const tableUpdated = new Map<string, string>();
  for (const r of tables) {
    tableTeams.set(r.competition_key, (tableTeams.get(r.competition_key) ?? 0) + 1);
    const prev = tableUpdated.get(r.competition_key);
    if (!prev || r.updated_at > prev) tableUpdated.set(r.competition_key, r.updated_at);
    if (list.some((c) => c.key === r.competition_key))
      addTeam(r.competition_key as CompetitionKey, r.team);
  }

  const competitions: CompetitionLive[] = list.map((c) => ({
    ...c,
    upcoming: upcoming.get(c.key) ?? 0,
    tableTeams: tableTeams.get(c.key) ?? 0,
    tableUpdatedAt: tableUpdated.get(c.key) ?? null,
    teams: teamsBy.get(c.key)?.size || c.teams,
  }));

  return {
    competitions,
    totals: {
      upcoming: fixtures.filter((f) => byName.has(f.competition)).length,
      results,
      teams: allTeams.size,
      tables: competitions.filter((c) => c.tableTeams > 0).length,
    },
    nextKickoff: fixtures[0]?.kickoff_at ?? null,
    checkedAt: now.toISOString(),
  };
}
