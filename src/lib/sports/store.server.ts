import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { FixtureStore } from "./sync.server";

/** Fixture store backed by the service-role client. Server only. */
export function createFixtureStore(): FixtureStore {
  return {
    async finishedRefs(provider, refs) {
      if (refs.length === 0) return new Set();
      const { data, error } = await supabaseAdmin
        .from("fixtures")
        .select("provider_ref")
        .eq("provider", provider)
        .eq("status", "finished")
        .in("provider_ref", refs);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.provider_ref));
    },
    async upsert(rows) {
      const { error } = await supabaseAdmin.from("fixtures").upsert(
        rows.map((r) => ({
          provider: r.provider,
          provider_ref: r.providerRef,
          sport: r.sport,
          competition: r.competition,
          home: r.home,
          away: r.away,
          kickoff_at: r.kickoffAt,
          status: r.status,
          home_score: r.homeScore,
          away_score: r.awayScore,
        })),
        { onConflict: "provider,provider_ref" },
      );
      if (error) throw error;
    },
    async openSince(since, now) {
      const { data, error } = await supabaseAdmin
        .from("fixtures")
        .select("provider, provider_ref, competition, kickoff_at")
        .in("status", ["scheduled", "live"])
        .gte("kickoff_at", since.toISOString())
        .lte("kickoff_at", now.toISOString());
      if (error) throw error;
      return (data ?? []).map((r) => ({
        provider: r.provider,
        providerRef: r.provider_ref,
        competition: r.competition,
        kickoffAt: r.kickoff_at,
      }));
    },
  };
}
