/** Service-role persistence for PFIE match statistics and confirmed soccer/rugby line-ups. Server only. */
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  IntelligenceFixture,
  MatchIntelligenceJob,
  IntelligenceKind,
  MatchIntelligenceStore,
  VerifiedLineups,
  VerifiedMatchStats,
} from "./match-intelligence";

export async function createMatchIntelligenceStore(): Promise<MatchIntelligenceStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;

  const due = (lastAttempt: string | null | undefined, now: Date, waitMs: number) => {
    if (!lastAttempt) return true;
    const parsed = Date.parse(lastAttempt);
    return !Number.isFinite(parsed) || now.getTime() - parsed >= waitMs;
  };

  return {
    async dueJobs(now, limit) {
      const since = new Date(now.getTime() - 48 * 60 * 60_000).toISOString();
      const until = new Date(now.getTime() + 72 * 60 * 60_000).toISOString();
      const lineupSince = new Date(now.getTime() - 15 * 60_000).toISOString();

      const [upcoming, finished] = await Promise.all([
        db.from("fixtures")
          .select("id, sport, competition, home, away, kickoff_at, status, home_score, away_score")
          .in("status", ["scheduled", "live"])
          .gte("kickoff_at", lineupSince)
          .lte("kickoff_at", until)
          .in("sport", ["soccer", "rugby"])
          .order("kickoff_at")
          .limit(100),
        db.from("fixtures")
          .select("id, sport, competition, home, away, kickoff_at, status, home_score, away_score")
          .eq("status", "finished")
          .eq("sport", "soccer")
          .gte("kickoff_at", since)
          .not("home_score", "is", null)
          .not("away_score", "is", null)
          .order("kickoff_at", { ascending: true })
          .limit(100),
      ]);
      if (upcoming.error) throw new Error("upcoming fixtures: " + upcoming.error.message);
      if (finished.error) throw new Error("finished fixtures: " + finished.error.message);

      const lineupScopes = (upcoming.data ?? []).map((row) => String(row.id));
      const statsScopes = (finished.data ?? []).map((row) => String(row.id));
      const scopes = [...new Set([...lineupScopes, ...statsScopes])];
      const [statuses, savedLineups, savedStats] = await Promise.all([
        scopes.length
          ? db.from("sync_status").select("job, scope, last_attempt_at")
              .in("job", ["match-stats", "match-lineups"]).in("scope", scopes)
          : Promise.resolve({ data: [], error: null }),
        lineupScopes.length
          ? db.from("fixture_lineups").select("fixture_id").in("fixture_id", lineupScopes)
          : Promise.resolve({ data: [], error: null }),
        statsScopes.length
          ? db.from("fixture_match_stats").select("fixture_id").in("fixture_id", statsScopes)
          : Promise.resolve({ data: [], error: null }),
      ]);
      for (const result of [statuses, savedLineups, savedStats]) {
        if (result.error) throw new Error("match intelligence due jobs: " + result.error.message);
      }
      const statusMap = new Map<string, string | null>(
        (statuses.data ?? []).map((row) => [
          String(row.job) + ":" + String(row.scope),
          row.last_attempt_at as string | null,
        ] as const),
      );
      const lineupIds = new Set((savedLineups.data ?? []).map((row) => String(row.fixture_id)));
      const statsIds = new Set((savedStats.data ?? []).map((row) => String(row.fixture_id)));
      const toFixture = (row: Record<string, unknown>): IntelligenceFixture => ({
        id: String(row["id"]),
        sport: String(row["sport"]),
        competition: String(row["competition"]),
        home: String(row["home"]),
        away: String(row["away"]),
        kickoffAt: String(row["kickoff_at"]),
        status: String(row["status"]),
        homeScore: row["home_score"] === null ? null : Number(row["home_score"]),
        awayScore: row["away_score"] === null ? null : Number(row["away_score"]),
      });
      const lineups: MatchIntelligenceJob[] = (upcoming.data ?? [])
        .filter((row) => row.sport === "rugby" || Date.parse(String(row.kickoff_at)) <= now.getTime() + 90 * 60_000)
        .filter((row) => !lineupIds.has(String(row.id)))
        .filter((row) => due(
          statusMap.get("match-lineups:" + String(row.id)),
          now,
          row.sport === "rugby" ? 30 * 60_000 : 10 * 60_000,
        ))
        .map((row) => ({ kind: "lineups", fixture: toFixture(row as Record<string, unknown>) }));
      const stats: MatchIntelligenceJob[] = (finished.data ?? [])
        .filter((row) => !statsIds.has(String(row.id)))
        .filter((row) => due(statusMap.get("match-stats:" + String(row.id)), now, 30 * 60_000))
        .map((row) => ({ kind: "stats", fixture: toFixture(row as Record<string, unknown>) }));
      // Alternate queue priority every 15-minute slot so a busy rugby lineup window cannot starve post-match stats.
      const jobs = now.getUTCMinutes() % 30 === 0
        ? [...stats, ...lineups]
        : [...lineups, ...stats];
      return jobs.slice(0, limit);
    },

    async saveStats(fixtureId: string, result: VerifiedMatchStats, verifiedAt: string) {
      const { error } = await db.from("fixture_match_stats").upsert({
        fixture_id: fixtureId,
        home_stats: result.homeStats,
        away_stats: result.awayStats,
        source_domains: result.sourceDomains,
        sources: result.sources,
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      }, { onConflict: "fixture_id" });
      if (error) throw new Error("fixture_match_stats: " + error.message);
    },

    async saveLineups(fixtureId: string, result: VerifiedLineups, verifiedAt: string) {
      const { error } = await db.from("fixture_lineups").upsert({
        fixture_id: fixtureId,
        home_players: result.homePlayers,
        away_players: result.awayPlayers,
        source_domains: result.sourceDomains,
        sources: result.sources,
        verified_at: verifiedAt,
        updated_at: verifiedAt,
      }, { onConflict: "fixture_id" });
      if (error) throw new Error("fixture_lineups: " + error.message);
    },

    async record(kind: IntelligenceKind, fixtureId: string, ok: boolean, error: string | null, meta: Record<string, unknown>) {
      const { error: dbError } = await db.rpc("record_sync", {
        p_job: kind === "stats" ? "match-stats" : "match-lineups",
        p_scope: fixtureId,
        p_ok: ok,
        p_error: error,
        p_meta: meta,
      });
      if (dbError) throw new Error("record_sync: " + dbError.message);
    },
  };
}
