/** Standings/history store on the service-role client. Server only. */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { SyncStatusRow, TablesStore } from "./tables";
import type { StandingRow } from "./standings";

const db = supabaseAdmin as unknown as SupabaseClient;

export function createTablesStore(): TablesStore {
  return {
    async statuses() {
      const { data, error } = await db
        .from("sync_status")
        .select("job, scope, last_attempt_at, last_success_at, consecutive_failures");
      if (error) throw new Error(`sync_status: ${error.message}`);
      return ((data ?? []) as Record<string, unknown>[]).map((r): SyncStatusRow => ({
        job: r["job"] as SyncStatusRow["job"],
        scope: r["scope"] as string,
        lastAttemptAt: (r["last_attempt_at"] as string | null) ?? null,
        lastSuccessAt: (r["last_success_at"] as string | null) ?? null,
        consecutiveFailures: (r["consecutive_failures"] as number) ?? 0,
      }));
    },
    async latestFinished(since) {
      const { data, error } = await db
        .from("fixtures")
        .select("competition, kickoff_at")
        .eq("status", "finished")
        .gte("kickoff_at", since.toISOString())
        .limit(2000);
      if (error) throw new Error(`fixtures: ${error.message}`);
      const out = new Map<string, number>();
      for (const r of (data ?? []) as { competition: string; kickoff_at: string }[])
        out.set(r.competition, Math.max(out.get(r.competition) ?? 0, Date.parse(r.kickoff_at)));
      return out;
    },
    async knownTeams(competition) {
      const [fx, st] = await Promise.all([
        db.from("fixtures").select("home, away").eq("competition", competition).limit(1000),
        db.from("league_standings").select("team").eq("competition", competition),
      ]);
      const names = new Set<string>();
      for (const r of (fx.data ?? []) as { home: string; away: string }[]) {
        names.add(r.home);
        names.add(r.away);
      }
      for (const r of (st.data ?? []) as { team: string }[]) names.add(r.team);
      return [...names];
    },
    async completedCounts(competition) {
      const { data, error } = await db
        .from("completed_matches")
        .select("home, away")
        .eq("competition", competition)
        .limit(2000);
      if (error) throw new Error(`completed_matches: ${error.message}`);
      const counts = new Map<string, number>();
      for (const r of (data ?? []) as { home: string; away: string }[])
        for (const t of [r.home, r.away])
          counts.set(t.toLowerCase(), (counts.get(t.toLowerCase()) ?? 0) + 1);
      return counts;
    },
    async cafGroupStageResults() {
      const { data, error } = await db
        .from("completed_matches")
        .select("home, away, kickoff_at, home_score, away_score")
        .eq("competition", "CAF Confederation Cup")
        .gte("kickoff_at", "2026-11-27T00:00:00Z")
        .lt("kickoff_at", "2027-02-01T00:00:00Z")
        .order("kickoff_at");
      if (error) throw new Error(`completed_matches CAF group stage: ${error.message}`);
      return (
        (data ?? []) as {
          home: string;
          away: string;
          kickoff_at: string;
          home_score: number;
          away_score: number;
        }[]
      ).map((row) => ({
        home: row.home,
        away: row.away,
        kickoffAt: row.kickoff_at,
        homeScore: row.home_score,
        awayScore: row.away_score,
      }));
    },
    async currentStandings(key, season): Promise<StandingRow[]> {
      const { data, error } = await db
        .from("league_standings")
        .select(
          "group_name, position, team, played, won, drawn, lost, goals_for, goals_against, points",
        )
        .eq("competition_key", key)
        .eq("season", season)
        .order("position");
      if (error) throw new Error(`league_standings: ${error.message}`);
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        ...(typeof r["group_name"] === "string" && r["group_name"]
          ? { group: r["group_name"] as string }
          : {}),
        position: r["position"] as number,
        team: r["team"] as string,
        played: r["played"] as number,
        won: r["won"] as number,
        drawn: r["drawn"] as number,
        lost: r["lost"] as number,
        goalsFor: r["goals_for"] as number,
        goalsAgainst: r["goals_against"] as number,
        points: r["points"] as number,
      }));
    },
    async replaceStandings(input) {
      const { data, error } = await db.rpc("replace_standings", {
        p_key: input.key,
        p_competition: input.competition,
        p_season: input.season,
        p_rows: input.rows,
        p_source_domain: input.domain,
        p_source_url: input.url,
      });
      if (error) throw new Error(`replace_standings: ${error.message}`);
      return (data as number) ?? 0;
    },
    async insertHistory(rows) {
      const { data, error } = await db.rpc("insert_team_results", { p_rows: rows });
      if (error) throw new Error(`insert_team_results: ${error.message}`);
      return (data as number) ?? 0;
    },
    async record(job, scope, ok, err, meta) {
      const { error } = await db.rpc("record_sync", {
        p_job: job,
        p_scope: scope,
        p_ok: ok,
        p_error: err,
        p_meta: meta,
      });
      if (error) throw new Error(`record_sync: ${error.message}`);
    },
  };
}
