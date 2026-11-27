import { createHmac } from "node:crypto";
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
      .insert({ metadata: { runner: "vercel_cron", scope: "all_experiments_and_consented_user_activity" } })
      .select("id").single();
    if (startError || !run) return Response.json({ ok: false, error: "could_not_start_learning_ingest" }, { status: 500 });

    let sessionsSeen = 0, researchSeen = 0, activitySeen = 0, realExamples = 0, syntheticExamples = 0;
    try {
      const [sr, rr, previous] = await Promise.all([
        db.from("synthetic_sessions").select("id,experiment_id,persona_key,session_type,started_at,finished_at,outcome,page_paths,error_code,metadata").not("finished_at", "is", null).order("finished_at", { ascending: false }).limit(1000),
        db.from("synthetic_research").select("id,experiment_id,fixture_key,provider,response_json,source_urls,created_at").order("created_at", { ascending: false }).limit(1000),
        db.from("pfie_learning_ingest_runs").select("metadata").not("finished_at", "is", null).neq("id", run.id).order("finished_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (sr.error) throw sr.error;
      if (rr.error) throw rr.error;
      if (previous.error) throw previous.error;
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
        }, { onConflict: "source_kind,source_id,task_type", ignoreDuplicates: true });
        if (error) throw error;
        syntheticExamples++;
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
        }, { onConflict: "source_kind,source_id,task_type", ignoreDuplicates: true });
        if (error) throw error;
        syntheticExamples++;
      }

      // Cursor makes this incremental: a busy launch day is processed over multiple daily batches.
      const cursor = record(previous.data?.metadata) ? previous.data.metadata : {};
      const cursorAt = typeof cursor.user_activity_cursor_at === "string" ? cursor.user_activity_cursor_at : null;
      const cursorId = typeof cursor.user_activity_cursor_id === "string" ? cursor.user_activity_cursor_id : null;
      let activityQuery = db.from("pfie_user_activity_events")
        .select("id,user_id,event_type,fixture_id,event_data,source,created_at")
        .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(1000);
      if (cursorAt && cursorId) {
        activityQuery = activityQuery.or(`created_at.gt.${cursorAt},and(created_at.eq.${cursorAt},id.gt.${cursorId})`);
      }
      const activityResult = await activityQuery;
      if (activityResult.error) throw activityResult.error;
      const activities = activityResult.data ?? [];
      activitySeen = activities.length;

      if (activities.length > 0) {
        const userIds = [...new Set(activities.map(a => a.user_id))];
        const [consents, mappings] = await Promise.all([
          db.from("current_consents").select("user_id,granted").eq("purpose", "pfie_learning").in("user_id", userIds),
          db.from("pfie_learning_subject_map").select("user_id,subject_key").in("user_id", userIds),
        ]);
        if (consents.error) throw consents.error;
        if (mappings.error) throw mappings.error;
        const optedIn = new Set((consents.data ?? []).filter(c => c.granted === true).map(c => c.user_id));
        const subjectByUser = new Map((mappings.data ?? []).map(m => [m.user_id, m.subject_key]));
        const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!secret) throw new Error("missing_service_role_key_for_subject_pseudonymisation");
        const newMappings = userIds.filter(id => optedIn.has(id) && !subjectByUser.has(id)).map(user_id => ({
          user_id,
          subject_key: createHmac("sha256", secret).update(user_id).digest("hex"),
        }));
        if (newMappings.length) {
          const { data, error } = await db.from("pfie_learning_subject_map").upsert(newMappings, { onConflict: "user_id" }).select("user_id,subject_key");
          if (error) throw error;
          for (const m of data ?? []) subjectByUser.set(m.user_id, m.subject_key);
        }

        const rows = activities.filter(a => optedIn.has(a.user_id) && subjectByUser.has(a.user_id)).map(a => ({
          source_kind: "real_activity_event",
          source_id: a.id,
          subject_key: subjectByUser.get(a.user_id),
          fixture_key: a.fixture_id,
          task_type: "behavioral_preference",
          payload: { event_type: a.event_type, event_data: record(a.event_data) ? a.event_data : {}, fixture_id: a.fixture_id, source: a.source },
          label: { action_observed: true, event_type: a.event_type },
          label_status: "verified",
          training_status: "approved",
          provenance: { source_table: "pfie_user_activity_events", source_id: a.id, subject_key: subjectByUser.get(a.user_id), synthetic: false, consent_purpose: "pfie_learning", label_origin: "consented_first_party_activity", observed_at: a.created_at },
        }));
        if (rows.length) {
          const { error } = await db.from("pfie_learning_examples").upsert(rows, { onConflict: "source_kind,source_id,task_type", ignoreDuplicates: true });
          if (error) throw error;
          realExamples = rows.length;
        }

        // Close the consent-withdrawal race: if consent was withdrawn while this batch was running,
        // purge the just-derived examples as well as the raw rows.
        const { data: consentAfter, error: consentAfterError } = await db.from("current_consents")
          .select("user_id,granted").eq("purpose", "pfie_learning").in("user_id", userIds);
        if (consentAfterError) throw consentAfterError;
        const stillOptedIn = new Set((consentAfter ?? []).filter(c => c.granted === true).map(c => c.user_id));
        for (const id of userIds.filter(id => !stillOptedIn.has(id))) {
          const subjectKey = subjectByUser.get(id);
          if (subjectKey) {
            const { error } = await db.from("pfie_learning_examples").delete().eq("subject_key", subjectKey);
            if (error) throw error;
            await db.from("pfie_learning_subject_map").delete().eq("user_id", id);
          }
          await db.from("pfie_user_activity_events").delete().eq("user_id", id);
        }
      }

      const lastActivity = activities.at(-1);
      const previousCursorAt = cursorAt;
      const previousCursorId = cursorId;
      const metadata = {
        runner: "vercel_cron",
        scope: "all_experiments_and_consented_user_activity",
        user_activity_cursor_at: lastActivity?.created_at ?? previousCursorAt,
        user_activity_cursor_id: lastActivity?.id ?? previousCursorId,
        real_activity_batch_size: activitySeen,
      };
      const { error } = await db.from("pfie_learning_ingest_runs").update({
        finished_at: new Date().toISOString(), sessions_seen: sessionsSeen, research_seen: researchSeen,
        examples_inserted: syntheticExamples + realExamples, metadata,
      }).eq("id", run.id);
      if (error) throw error;

      return Response.json({
        ok: true, ingest_run_id: run.id,
        real_activity_events_seen: activitySeen, real_learning_examples_upserted: realExamples,
        synthetic_sessions_seen: sessionsSeen, synthetic_research_seen: researchSeen,
        synthetic_learning_examples_upserted: syntheticExamples,
        real_activity_is_primary: true,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message.slice(0, 500) : "unknown_learning_ingest_error";
      await db.from("pfie_learning_ingest_runs").update({
        finished_at: new Date().toISOString(), sessions_seen: sessionsSeen, research_seen: researchSeen,
        examples_inserted: syntheticExamples + realExamples, error: message,
      }).eq("id", run.id);
      console.error("pfie-learning-ingest failed", e);
      return Response.json({ ok: false, ingest_run_id: run.id, error: message }, { status: 500 });
    }
  } } },
});
