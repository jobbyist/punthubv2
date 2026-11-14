import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { DuelSettleStore } from "./duels";

/** Duel settlement backed by the service-role client. Server only. */
export function createDuelSettleStore(): DuelSettleStore {
  return {
    async expire() {
      const { data, error } = await supabaseAdmin.rpc("expire_duels");
      if (error) throw error;
      return data ?? 0;
    },
    async toSettle() {
      const { data, error } = await supabaseAdmin.rpc("duels_to_settle");
      if (error) throw error;
      return data ?? [];
    },
    async settle(v) {
      const { data, error } = await supabaseAdmin.rpc("settle_duel", {
        p_duel: v.duelId,
        p_results: v.results,
        p_void: v.void,
      });
      if (error) throw error;
      return data ?? "skipped";
    },
  };
}
