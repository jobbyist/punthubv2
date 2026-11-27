import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

const EXPERIMENT_SLUG = "puntr-30-day-synthetic-2026-11-27";
const ALLOWED_PATHS = new Set(["/", "/founding", "/predictions", "/fixtures", "/results", "/newsroom", "/roadmap"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const Route = createFileRoute("/api/cron/synthetic-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as SupabaseClient;
        const { data: experiment, error: experimentError } = await db
          .from("synthetic_experiments")
          .select("id,status,starts_at,ends_at")
          .eq("slug", EXPERIMENT_SLUG)
          .maybeSingle();

        if (experimentError || !experiment) {
          return Response.json({ ok: true, skipped: true, reason: "experiment_not_configured" });
        }
        if (experiment.status !== "active") {
          return Response.json({ ok: true, skipped: true, reason: `experiment_${experiment.status}` });
        }

        const now = new Date();
        if (now.getTime() < Date.parse(experiment.starts_at) || now.getTime() > Date.parse(experiment.ends_at)) {
          return Response.json({ ok: true, skipped: true, reason: "outside_experiment_window" });
        }

        // A recent started row is a short lease. It prevents duplicate Vercel cron deliveries
        // from running the same persona concurrently; stale leases expire after 15 minutes.
        const leaseCutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
        const { data: leases, error: leaseError } = await db
          .from("synthetic_sessions")
          .select("persona_key")
          .eq("experiment_id", experiment.id)
          .eq("session_type", "read_only_route_check")
          .eq("outcome", "started")
          .gte("started_at", leaseCutoff);
        if (leaseError) return Response.json({ ok: false, error: "could_not_check_runner_lease" }, { status: 500 });
        const busy = new Set((leases ?? []).map((row) => row.persona_key));

        const { data: personas, error: personaError } = await db
          .from("synthetic_personas")
          .select("persona_key,persona")
          .eq("experiment_id", experiment.id)
          .eq("active", true)
          .order("last_run_at", { ascending: true, nullsFirst: true })
          .order("persona_key", { ascending: true })
          .limit(50);
        if (personaError) return Response.json({ ok: false, error: "could_not_load_personas" }, { status: 500 });

        const persona = (personas ?? []).find((row) => !busy.has(row.persona_key));
        if (!persona) {
          return Response.json({ ok: true, skipped: true, reason: "no_persona_due_or_all_leased" });
        }

        const profile = isRecord(persona.persona) ? persona.persona : {};
        const requestedPaths = Array.isArray(profile["journey_paths"])
          ? profile["journey_paths"].filter((value): value is string => typeof value === "string")
          : [];
        const journey = requestedPaths.length ? requestedPaths : ["/"];
        if (journey.some((path) => !ALLOWED_PATHS.has(path))) {
          return Response.json({ ok: false, error: "persona_contains_non_allowlisted_path" }, { status: 400 });
        }

        const startedAt = new Date().toISOString();
        const { data: session, error: sessionError } = await db
          .from("synthetic_sessions")
          .insert({
            experiment_id: experiment.id,
            persona_key: persona.persona_key,
            session_type: "read_only_route_check",
            started_at: startedAt,
            outcome: "started",
            metadata: { marker: "synthetic_qa", runner: "vercel_cron", account_mode: "guest_read_only" },
          })
          .select("id")
          .single();
        if (sessionError || !session) {
          return Response.json({ ok: false, error: "could_not_start_synthetic_session" }, { status: 500 });
        }

        const visited: string[] = [];
        let outcome: "passed" | "failed" = "passed";
        let errorCode: string | null = null;
        const origin = new URL(request.url).origin;

        try {
          for (const path of journey) {
            const target = new URL(path, origin);
            const response = await fetch(target, {
              method: "GET",
              redirect: "follow",
              cache: "no-store",
              headers: {
                "x-puntr-synthetic-test": "true",
                "x-puntr-experiment": EXPERIMENT_SLUG,
                "cookie": "puntr_synthetic_qa=1",
                "user-agent": "PuntrSyntheticQA/1.0 (+read-only route check)",
              },
              signal: AbortSignal.timeout(4_500),
            });
            const finalUrl = new URL(response.url || target.href);
            const contentType = response.headers.get("content-type") ?? "";
            if (finalUrl.origin !== origin) throw new Error(`${path}: redirected outside Puntr origin`);
            if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
            if (!contentType.includes("text/html")) throw new Error(`${path}: expected HTML, received ${contentType || "unknown content type"}`);
            const html = await response.text();
            if (!html.trim() || !/<html[\s>]/i.test(html)) throw new Error(`${path}: empty or invalid HTML response`);
            visited.push(path);
          }
        } catch (error) {
          outcome = "failed";
          errorCode = error instanceof Error ? error.message.slice(0, 240) : "unknown_route_check_error";
        }

        const finishedAt = new Date().toISOString();
        const { error: finishError } = await db
          .from("synthetic_sessions")
          .update({
            finished_at: finishedAt,
            outcome,
            page_paths: visited,
            error_code: errorCode,
            metadata: {
              marker: "synthetic_qa",
              runner: "vercel_cron",
              account_mode: "guest_read_only",
              check_type: "server_side_http_html",
            },
          })
          .eq("id", session.id);
        const { error: personaUpdateError } = await db
          .from("synthetic_personas")
          .update({ last_run_at: finishedAt })
          .eq("experiment_id", experiment.id)
          .eq("persona_key", persona.persona_key);

        if (finishError || personaUpdateError) {
          return Response.json({ ok: false, error: "could_not_persist_synthetic_session" }, { status: 500 });
        }

        // Research is attempted only after the public route checks pass. The daily allocator
        // is idempotent per persona/SAST day and independently enforces the provider budget.
        let research: Record<string, unknown> = { skipped: true, reason: "route_check_failed" };
        if (outcome === "passed") {
          const secret = process.env["CRON_SECRET"];
          if (!secret) return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });
          const endpoint = new URL("/api/cron/synthetic-decisions-daily", origin);
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
            body: "{}",
            signal: AbortSignal.timeout(60_000),
          });
          research = await response.json() as Record<string, unknown>;
          if (!response.ok) {
            return Response.json({ ok: false, persona: persona.persona_key, route_outcome: outcome, research }, { status: 502 });
          }
        }

        return Response.json({
          ok: outcome === "passed",
          runner: "vercel_cron",
          check_type: "server_side_http_html",
          persona: persona.persona_key,
          paths_checked: visited,
          route_outcome: outcome,
          error: errorCode,
          research,
        }, { status: outcome === "passed" ? 200 : 502 });
      },
    },
  },
});
