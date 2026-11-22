import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface FixtureStatsRecord {
  home_stats: Record<string, number>;
  away_stats: Record<string, number>;
  source_domains: string[];
  verified_at: string;
}

export interface FixtureLineupsRecord {
  home_players: { name: string; position: string | null; role: "starter" | "substitute" }[];
  away_players: { name: string; position: string | null; role: "starter" | "substitute" }[];
  source_domains: string[];
  verified_at: string;
}

export async function fetchFixtureIntelligence(fixtureId: string): Promise<{
  stats: FixtureStatsRecord | null;
  lineups: FixtureLineupsRecord | null;
}> {
  const [stats, lineups] = await Promise.all([
    db.from("fixture_match_stats")
      .select("home_stats, away_stats, source_domains, verified_at")
      .eq("fixture_id", fixtureId)
      .maybeSingle(),
    db.from("fixture_lineups")
      .select("home_players, away_players, source_domains, verified_at")
      .eq("fixture_id", fixtureId)
      .maybeSingle(),
  ]);
  if (stats.error) throw stats.error;
  if (lineups.error) throw lineups.error;
  return {
    stats: (stats.data as FixtureStatsRecord | null) ?? null,
    lineups: (lineups.data as FixtureLineupsRecord | null) ?? null,
  };
}
