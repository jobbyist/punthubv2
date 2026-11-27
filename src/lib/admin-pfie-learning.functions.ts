import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const adminPfieLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    runs: number; total: number; approved: number; quarantined: number; excluded: number;
    routeQuality: number; forecastPending: number; realActivity: number; syntheticExamples: number;
    recent: { id: string; taskType: string; fixtureKey: string | null; status: string; labelStatus: string; createdAt: string; sourceKind: string }[];
    signals: { event_type: string | null; sport: string | null; competition: string | null; market: string | null; category: string | null; interactions: number; pseudonymous_participants: number; last_seen_at: string | null }[];
  } | null> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { getPfieLearningSignals } = await import("@/lib/pfie/learning.server");
    const [runs, all, approved, quarantined, excluded, route, forecast, realActivity, syntheticExamples, recent, signals] = await Promise.all([
      db.from("pfie_learning_ingest_runs").select("id", { count: "exact", head: true }),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("training_status", "approved"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("training_status", "quarantined"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("training_status", "excluded"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("task_type", "route_quality").eq("training_status", "approved"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("task_type", "forecast_evaluation").eq("label_status", "pending_verification"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).eq("source_kind", "real_activity_event"),
      db.from("pfie_learning_examples").select("id", { count: "exact", head: true }).in("source_kind", ["synthetic_session", "synthetic_research"]),
      db.from("pfie_learning_examples").select("id,task_type,fixture_key,training_status,label_status,created_at,source_kind").order("created_at", { ascending: false }).limit(25),
      getPfieLearningSignals(20),
    ]);
    for (const r of [runs, all, approved, quarantined, excluded, route, forecast, realActivity, syntheticExamples, recent]) if (r.error) throw r.error;
    return {
      runs: runs.count ?? 0, total: all.count ?? 0, approved: approved.count ?? 0,
      quarantined: quarantined.count ?? 0, excluded: excluded.count ?? 0,
      routeQuality: route.count ?? 0, forecastPending: forecast.count ?? 0,
      realActivity: realActivity.count ?? 0, syntheticExamples: syntheticExamples.count ?? 0,
      recent: (recent.data ?? []).map(r => ({ id: r.id, taskType: r.task_type, fixtureKey: r.fixture_key, status: r.training_status, labelStatus: r.label_status, createdAt: r.created_at, sourceKind: r.source_kind })),
      signals,
    };
  });

export const approvePfieLearningExample = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { id: string }) => data)
  .handler(async ({ context, data }): Promise<boolean> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) throw new Error("Admin access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: approved, error } = await db.rpc("admin_approve_pfie_learning_example", { p_example_id: data.id, p_admin_id: context.userId });
    if (error) throw error;
    return approved === true;
  });
