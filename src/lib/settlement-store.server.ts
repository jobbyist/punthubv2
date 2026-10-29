import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { SettlementStore } from "./settle.server";

/** Settlement store backed by the service-role client. Server only. */
export function createSettlementStore(): SettlementStore {
  return {
    async pending() {
      const { data, error } = await supabaseAdmin.rpc("pending_settlements");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        prediction_id: r.prediction_id,
        market: r.market,
        selection: r.selection,
        line: r.line === null ? null : Number(r.line),
        odds: Number(r.odds),
        status: r.status,
        home_score: r.home_score,
        away_score: r.away_score,
      }));
    },
    async apply(rows) {
      const { data, error } = await supabaseAdmin.rpc("apply_auto_settlements", { p_rows: rows });
      if (error) throw error;
      return data ?? 0;
    },
  };
}
