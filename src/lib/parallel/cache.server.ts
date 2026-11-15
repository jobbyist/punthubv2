/**
 * Supabase-backed store for the Parallel response cache (table `parallel_cache`, service role only).
 * Until migration 20261115010000 is applied the table does not exist: reads and writes fail softly and every call
 * simply goes to the provider, exactly as before.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { CacheStore } from "./cached";

export async function createCacheStore(): Promise<CacheStore> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as unknown as SupabaseClient;
  return {
    async get(key) {
      const { data, error } = await db
        .from("parallel_cache")
        .select("response, expires_at")
        .eq("key", key)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const row = data as { response: unknown; expires_at: string } | null;
      return row ? { response: row.response, expiresAt: row.expires_at } : null;
    },
    async put(entry) {
      const { error } = await db.from("parallel_cache").upsert(
        {
          key: entry.key,
          endpoint: entry.endpoint,
          purpose: entry.purpose,
          response: entry.response,
          expires_at: entry.expiresAt,
        },
        { onConflict: "key" },
      );
      if (error) throw new Error(error.message);
    },
  };
}
