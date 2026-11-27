/** Server-only read model for first-party PFIE learning. No raw user IDs or event rows are exposed. */
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface PfieLearningSignal {
  event_type: string | null;
  sport: string | null;
  competition: string | null;
  market: string | null;
  category: string | null;
  interactions: number;
  pseudonymous_participants: number;
  last_seen_at: string | null;
}

export async function getPfieLearningSignals(limit = 50): Promise<PfieLearningSignal[]> {
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("pfie_learning_signals")
    .select("event_type,sport,competition,market,category,interactions,pseudonymous_participants,last_seen_at")
    .order("interactions", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw new Error(`PFIE learning signals: ${error.message}`);
  return (data ?? []) as PfieLearningSignal[];
}
