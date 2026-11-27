import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export const Route = createFileRoute("/api/cron/pfie-learning-ingest")({
  server: { handlers: { GET: async ({ request }) => {
    const { checkCronAuth } = await import("@/lib/cron-auth.server");
    const denied = checkCronAuth(request);
    if (denied) return denied;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data: run, error: startError } = await db.from("pfie_learning_ingest_runs")
      .insert({ metadata: { runner: "vercel_cron", scope: "all_synthetic_experiments" } }).select("id").single();
    if (startError || !run) return Response.json({ ok: false, error: "could_not_start_learning_ingest" }, { status: 500 });
    let sessionsSeen = 0, researchSeen = 0, examplesUpserted = 0;
    try {
      const [sr, rr] = await Promise.all([
        db.from("synthetic_sessions").select("id,experiment_id,persona_key,session_type,started_at,finished_at,outcome,page_paths,error_code,metadata").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(1000),
        db.from("synthetic_research").select("id,experiment_id,fixture_key,provider,response_json,source_urls,created_at").order("created_at", { ascending: false }).limit(1000),
      ]);
      if (sr.error) throw sr.error;
      if (rr.error) throw rr.error;
      sessionsSeen = (sr.data ?? []).length;
      researchSeen = (rr.data ?? []).length;
      for (const s of sr.data ?? []) {
        const meta = record(s.metadata) ? s.metadata : {};
        const routeCheck = s.session_type === "read_only_route_check";
        const { error } = await db.from("pfie_learning_examples").upsert({
          source_kind: "synthetic_session", source_id: s.id, experiment_id: s.experiment_id,
          task_type: "route_quality",
          payload: { persona_key: s.persona_key, session_type: s.session_type, outcome: s.outcome, page_paths: s.page_paths ?? [], error_code: s.error_code, started_at: s.started_at, finished_at: s.finished_at, runner_metadata: meta },
          label: { outcome: s.outcome, route_count: Array.isArray(s.page_paths) ? s.page_paths.length : 0, has_error: Boolean(s.error_code) },
          label_status: "verified",
          training_status: routeCheck && ["passed", "failed"].includes(s.outcome) ? "approved" : "excluded",
          provenance: { source_table: "synthetic_sessions", source_id: s.id, experiment_id: s.experiment_id, synthetic: true, label_origin: "deterministic_http_route_check" },
        }, { onConflict: "source_kind,source_id,task_type" });
        if (error) throw error;
        examplesUpserted++;
      }
      for (const r of rr.data ?? []) {
        const response = record(r.response_json) ? r.response_json : {};
        const decisions = Array.isArray(response.decisions) ? response.decisions : [];
        const citations = Array.isArray(response.citations) ? response.citations : [];
        const { error } = await db.from("pfie_learning_examples").upsert({
          source_kind: "synthetic_research", source_id: r.id, experiment_id: r.experiment_id,
          fixture_key: r.fixture_key, task_type: "forecast_evaluation",
          payload: { fixture_context: record(response.fixture_context) ? response.fixture_context : {}, provider: r.provider, decisions, citations, source_domains: response.source_domains ?? [], source_urls: r.source_urls ?? [], decision_id: response.decision_id ?? null },
          label: null, label_status: "pending_verification", training_status: "quarantined",
          provenance: { source_table: "synthetic_research", source_id: r.id, experiment_id: r.experiment_id, provider: r.provider, source_urls: r.source_urls ?? [], synthetic: true, label_origin: "awaiting_independent_pfie_result_corroboration" },
        }, { onConflict: "source_kind,source_id,task_type" });
        if (error) throw error;
        examplesUpserted++;
      }
      const { error } = await db.from("pfie_learning_ingest_runs").update({ finished_at: new Date().toISOString(), sessions_seen: sessionsSeen, research_seen: researchSeen, examples_inserted: examplesUpserted }).eq("id", run.id);
      if (error) throw error;
      return Response.json({ ok: true, ingest_run_id: run.id, sessions_seen: sessionsSeen, research_seen: researchSeen, examples_upserted: examplesUpserted, forecast_examples_quarantined: researchSeen });
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 500) : "unknown_learning_ingest_error";
      await db.from("pfie_learning_ingest_runs").update({ finished_at: new Date().toISOString(), sessions_seen: sessionsSeen, research_seen: researchSeen, examples_inserted: examplesUpserted, error: message }).eq("id", run.id);
      console.error("pfie-learning-ingest failed", e);
      return Response.json({ ok: false, ingest_run_id: run.id, error: message }, { status: 500 });
    }
  } } },
});
