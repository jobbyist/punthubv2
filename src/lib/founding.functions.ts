import { createServerFn } from "@tanstack/react-start";

import { foundingSpots, type FoundingSpots } from "@/lib/founding";

const TTL_MS = 60_000;
let cached: { at: number; value: FoundingSpots } | null = null;

/**
 * Founding spots left, cached for 60 seconds per server instance so a busy homepage does not query the database
 * on every view. Reads the public founding_spots_taken() function, so it works for signed-out visitors.
 * Returns null when the count cannot be read, and the UI then shows nothing rather than a wrong number.
 */
export const getFoundingSpots = createServerFn({ method: "GET" }).handler(
  async (): Promise<FoundingSpots | null> => {
    const now = Date.now();
    if (cached && now - cached.at < TTL_MS) return cached.value;
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("founding_spots_taken");
    if (error || typeof data !== "number") {
      console.error("founding_spots_taken failed", error);
      return cached?.value ?? null;
    }
    const value = foundingSpots(data);
    cached = { at: now, value };
    return value;
  },
);
