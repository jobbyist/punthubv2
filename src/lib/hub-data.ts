/** Small reads for the Predictions hub: latest verified results and simple counts. Public data only. */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface HubResult {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
  home_score: number;
  away_score: number;
}

/** Most recent completed matches (finished fixtures plus verified season results). */
export async function fetchLatestResults(limit = 6): Promise<HubResult[]> {
  const { data, error } = await db
    .from("completed_matches")
    .select("id, competition, home, away, kickoff_at, home_score, away_score")
    .lte("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as HubResult[];
}

/** Competition keys that have a stored league table, for the hub's table snapshot tabs. */
export async function fetchTableKeys(): Promise<string[]> {
  const { data, error } = await db
    .from("league_standings")
    .select("competition_key")
    .order("competition_key")
    .limit(1000);
  if (error) throw error;
  return [
    ...new Set(((data ?? []) as { competition_key: string }[]).map((r) => r.competition_key)),
  ];
}
