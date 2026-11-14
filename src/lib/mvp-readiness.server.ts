import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  TASK_IDS,
  type Metrics,
  type ReadinessSnapshot,
  type StoredState,
} from "@/lib/mvp-readiness";

/**
 * Server only. Reads the /dev checklist state and the live launch metrics with the service role.
 * Every read is best effort: a failing query leaves that metric null (scored as 0) instead of
 * breaking the page, and a missing `dev_readiness_state` table falls back to the catalogue defaults.
 */

// Tables and views not in the generated types yet (accessed through an untyped client).
type Untyped = {
  from: (t: string) => {
    select: (
      cols: string,
      opts?: { count?: "exact"; head?: boolean },
    ) => PromiseLike<{ data: unknown; count: number | null; error: unknown }> & {
      gte: (
        c: string,
        v: string,
      ) => {
        lt: (c: string, v: string) => PromiseLike<{ count: number | null; error: unknown }>;
      };
      limit: (n: number) => PromiseLike<{ data: unknown; error: unknown }>;
      eq: (c: string, v: string | number) => PromiseLike<{ data: unknown; error: unknown }>;
    };
    upsert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};
const db = () => supabaseAdmin as unknown as Untyped;

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

export async function readState(): Promise<{ state: StoredState; available: boolean }> {
  const res = await safe(async () => {
    const { data, error } = await db()
      .from("dev_readiness_state")
      .select("task_id, done, updated_at")
      .limit(500);
    if (error) throw error;
    return data as Array<{ task_id: string; done: boolean; updated_at: string }>;
  });
  if (!res) return { state: {}, available: false };
  const state: StoredState = {};
  for (const r of res) state[r.task_id] = { done: r.done, updatedAt: r.updated_at };
  return { state, available: true };
}

export async function readMetrics(now = new Date()): Promise<Metrics> {
  const in14 = new Date(now.getTime() + 14 * 86_400_000).toISOString();
  const [foundingMembers, annualPasses, upcomingFixtures, completedResults, standingsLeagues] =
    await Promise.all([
      safe(async () => {
        const { data, error } = await supabaseAdmin.rpc("founding_spots_taken");
        if (error) throw error;
        if (data == null) return null;
        return Number(data);
      }),
      safe(async () => {
        const { data, error } = await supabaseAdmin.rpc("annual_pass_taken");
        if (error) throw error;
        if (data == null) return null;
        return Number(data);
      }),
      safe(async () => {
        const { count, error } = await db()
          .from("fixtures")
          .select("id", { count: "exact", head: true })
          .gte("kickoff_at", now.toISOString())
          .lt("kickoff_at", in14);
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        const { count, error } = await db()
          .from("completed_matches")
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      safe(async () => {
        // One row per (league, team), so position 1 gives one row per league with a table.
        const { data, error } = await db()
          .from("league_standings")
          .select("competition_key")
          .eq("position", 1);
        if (error) throw error;
        const rows = (data ?? []) as Array<{ competition_key: string }>;
        return new Set(rows.map((r) => r.competition_key)).size;
      }),
    ]);
  return { foundingMembers, annualPasses, upcomingFixtures, completedResults, standingsLeagues };
}

export async function readSnapshot(): Promise<ReadinessSnapshot> {
  const [{ state, available }, metrics] = await Promise.all([readState(), readMetrics()]);
  return { state, metrics, stateAvailable: available, readAt: new Date().toISOString() };
}

export async function writeTask(taskId: string, done: boolean): Promise<{ ok: boolean }> {
  if (!TASK_IDS.has(taskId)) return { ok: false };
  const { error } = await db()
    .from("dev_readiness_state")
    .upsert({ task_id: taskId, done, updated_at: new Date().toISOString() });
  return { ok: !error };
}
