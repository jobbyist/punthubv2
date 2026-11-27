import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Context = { supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: boolean | null }> } };

export interface SyntheticAdminSnapshot {
  configured: boolean;
  experiment: {
    id: string;
    label: string;
    status: string;
    startsAt: string;
    endsAt: string;
    budgetCapUsd: number;
    reservedUsd: number;
    spentUsd: number;
    updatedAt: string;
  } | null;
  personas: { total: number; active: number; lastRunAt: string | null; lastDecisionAt: string | null } ;
  sessions: {
    total: number;
    recent: { id: string; personaKey: string; type: string; startedAt: string; finishedAt: string | null; outcome: string; paths: string[]; error: string | null }[];
  };
  research: {
    total: number;
    recent: { fixtureKey: string; createdAt: string; decisionCount: number; sourceCount: number; noPickCount: number }[];
  };
  budget: {
    reserved: number;
    settled: number;
    failed: number;
    recent: { provider: string; operation: string; estimatedUsd: number; settledUsd: number | null; status: string; createdAt: string }[];
  };
}

export const adminSyntheticExperiment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyntheticAdminSnapshot | null> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (isAdmin !== true) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const slug = "puntr-30-day-synthetic-2026-11-27";

    const { data: experiment, error: experimentError } = await db
      .from("synthetic_experiments")
      .select("id,label,status,starts_at,ends_at,budget_cap_usd,reserved_usd,spent_usd,updated_at")
      .eq("slug", slug)
      .maybeSingle();

    // A preview or a deployment preceding the migration should render an explicit setup state.
    if (experimentError?.code === "42P01" || experimentError?.code === "PGRST205") {
      return {
        configured: false, experiment: null,
        personas: { total: 0, active: 0, lastRunAt: null, lastDecisionAt: null },
        sessions: { total: 0, recent: [] }, research: { total: 0, recent: [] },
        budget: { reserved: 0, settled: 0, failed: 0, recent: [] },
      };
    }
    if (experimentError) throw experimentError;
    if (!experiment) {
      return {
        configured: false, experiment: null,
        personas: { total: 0, active: 0, lastRunAt: null, lastDecisionAt: null },
        sessions: { total: 0, recent: [] }, research: { total: 0, recent: [] },
        budget: { reserved: 0, settled: 0, failed: 0, recent: [] },
      };
    }

    const [personaResult, sessionCount, sessionResult, researchCount, researchResult, budgetResult] = await Promise.all([
      db.from("synthetic_personas").select("persona_key,active,last_run_at,last_decision_at").eq("experiment_id", experiment.id).order("persona_key"),
      db.from("synthetic_sessions").select("id", { count: "exact", head: true }).eq("experiment_id", experiment.id),
      db.from("synthetic_sessions").select("id,persona_key,session_type,started_at,finished_at,outcome,page_paths,error_code").eq("experiment_id", experiment.id).order("started_at", { ascending: false }).limit(30),
      db.from("synthetic_research").select("id", { count: "exact", head: true }).eq("experiment_id", experiment.id),
      db.from("synthetic_research").select("fixture_key,created_at,response_json,source_urls").eq("experiment_id", experiment.id).order("created_at", { ascending: false }).limit(20),
      db.from("synthetic_budget_ledger").select("provider,operation,estimated_usd,settled_usd,status,created_at").eq("experiment_id", experiment.id).order("created_at", { ascending: false }).limit(30),
    ]);
    for (const result of [personaResult, sessionResult, researchResult, budgetResult]) {
      if (result.error) throw result.error;
    }

    const personas = personaResult.data ?? [];
    const sessions = sessionResult.data ?? [];
    const research = researchResult.data ?? [];
    const ledger = budgetResult.data ?? [];
    const recentResearch = research.map((row) => {
      const payload = row.response_json as Record<string, unknown>;
      const decisions = Array.isArray(payload["decisions"]) ? payload["decisions"] as Record<string, unknown>[] : [];
      return {
        fixtureKey: row.fixture_key,
        createdAt: row.created_at,
        decisionCount: decisions.length,
        sourceCount: Array.isArray(row.source_urls) ? row.source_urls.length : 0,
        noPickCount: decisions.filter((d) => d["selection"] === "no_pick").length,
      };
    });

    return {
      configured: true,
      experiment: {
        id: experiment.id, label: experiment.label, status: experiment.status,
        startsAt: experiment.starts_at, endsAt: experiment.ends_at,
        budgetCapUsd: Number(experiment.budget_cap_usd),
        reservedUsd: Number(experiment.reserved_usd), spentUsd: Number(experiment.spent_usd),
        updatedAt: experiment.updated_at,
      },
      personas: {
        total: personas.length,
        active: personas.filter((p) => p.active).length,
        lastRunAt: personas.reduce<string | null>((latest, p) => !p.last_run_at ? latest : !latest || p.last_run_at > latest ? p.last_run_at : latest, null),
        lastDecisionAt: personas.reduce<string | null>((latest, p) => !p.last_decision_at ? latest : !latest || p.last_decision_at > latest ? p.last_decision_at : latest, null),
      },
      sessions: {
        total: sessionCount.count ?? 0,
        recent: sessions.map((s) => ({
          id: s.id, personaKey: s.persona_key, type: s.session_type,
          startedAt: s.started_at, finishedAt: s.finished_at, outcome: s.outcome,
          paths: s.page_paths ?? [], error: s.error_code,
        })),
      },
      research: { total: researchCount.count ?? 0, recent: recentResearch },
      budget: {
        reserved: ledger.filter((r) => r.status === "reserved").length,
        settled: ledger.filter((r) => r.status === "settled").length,
        failed: ledger.filter((r) => r.status === "failed").length,
        recent: ledger.map((r) => ({
          provider: r.provider, operation: r.operation, estimatedUsd: Number(r.estimated_usd),
          settledUsd: r.settled_usd === null ? null : Number(r.settled_usd),
          status: r.status, createdAt: r.created_at,
        })),
      },
    };
  });
