import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface StandingRow {
  team: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  source_domain: string | null;
  synced_at: string;
  updated_at: string;
}

export interface SyncStatus {
  job: string;
  scope: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  last_synced_at: string | null;
  consecutive_failures: number;
  last_error: string | null;
  meta: Record<string, unknown>;
}

export async function fetchStandings(competitionKey: string): Promise<StandingRow[]> {
  const { data, error } = await db
    .from("league_standings")
    .select(
      "team, position, played, won, drawn, lost, goals_for, goals_against, goal_diff, points, source_domain, synced_at, updated_at",
    )
    .eq("competition_key", competitionKey)
    .order("position");
  if (error) throw error;
  return (data ?? []) as StandingRow[];
}

export async function fetchSyncStatuses(): Promise<SyncStatus[]> {
  const { data, error } = await db
    .from("sync_status")
    .select(
      "job, scope, last_attempt_at, last_success_at, last_synced_at, consecutive_failures, last_error, meta",
    )
    .order("job")
    .order("scope");
  if (error) throw error;
  return (data ?? []) as SyncStatus[];
}

const STALE_MS = 18 * 3_600_000;

/** Stale when the last successful refresh is older than 18 hours or the latest attempt failed. */
export function isStale(s: SyncStatus | undefined, now = Date.now()): boolean {
  if (!s?.last_success_at) return true;
  return s.consecutive_failures > 0 || now - Date.parse(s.last_success_at) > STALE_MS;
}
