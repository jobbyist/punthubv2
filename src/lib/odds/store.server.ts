/** Service-role store for the reference odds sync (tables market_odds, fixtures, sync_status). Server only. */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { OddsStore } from "./sync";

export async function createOddsStore(): Promise<OddsStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  return {
    async authorizedDomains() {
      const { data, error } = await db
        .from("bookmaker_odds_permissions")
        .select("domain")
        .eq("enabled", true)
        .eq("licence_status", "verified")
        .eq("data_rights_status", "approved")
        .eq("automated_access_allowed", true)
        .order("affiliate_priority", { ascending: true })
        .order("bookmaker_name", { ascending: true });
      if (error) throw new Error(`bookmaker_odds_permissions: ${error.message}`);
      return [...new Set((data ?? []).map((row) => String(row.domain)))];
    },
    async upcoming(fromIso, toIso) {
      const { data, error } = await db
        .from("fixtures")
        .select("id, competition, home, away, kickoff_at")
        .eq("status", "scheduled")
        .eq("sport", "soccer")
        .gte("kickoff_at", fromIso)
        .lt("kickoff_at", toIso)
        .order("kickoff_at")
        .limit(400);
      if (error) throw new Error(`fixtures: ${error.message}`);
      return ((data ?? []) as Record<string, string>[]).map((r) => ({
        id: r["id"]!,
        competition: r["competition"]!,
        home: r["home"]!,
        away: r["away"]!,
        kickoffAt: r["kickoff_at"]!,
      }));
    },
    async statuses() {
      const { data, error } = await db
        .from("sync_status")
        .select("scope, last_attempt_at, last_success_at, consecutive_failures")
        .eq("job", "odds");
      if (error) throw new Error(`sync_status: ${error.message}`);
      return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        scope: String(r["scope"]),
        lastAttemptAt: (r["last_attempt_at"] as string | null) ?? null,
        lastSuccessAt: (r["last_success_at"] as string | null) ?? null,
        consecutiveFailures: Number(r["consecutive_failures"] ?? 0),
      }));
    },
    async insert(rows, capturedAt) {
      const { error, count } = await db.from("market_odds").insert(
        rows.map((r) => ({
          fixture_id: r.fixtureId,
          market: r.market,
          selection: r.selection,
          price: r.price,
          source_domain: r.sourceDomain,
          source_url: r.sourceUrl,
          captured_at: capturedAt,
        })),
        { count: "exact" },
      );
      if (error) throw new Error(`market_odds: ${error.message}`);
      return count ?? rows.length;
    },
    async record(scope, ok, err, meta) {
      const { error } = await db.rpc("record_sync", {
        p_job: "odds",
        p_scope: scope,
        p_ok: ok,
        p_error: err,
        p_meta: meta,
      });
      if (error) throw new Error(`record_sync: ${error.message}`);
    },
  };
}
