import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

const MARKET_OPTIONS: Record<string, Record<string, string>> = {
  "1X2": {
    home: "The home team wins in regulation time.",
    draw: "The match ends in a draw after regulation time.",
    away: "The away team wins in regulation time.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast.",
  },
  OU25: {
    over: "The match has at least three total goals.",
    under: "The match has zero, one, or two total goals.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast.",
  },
  BTTS: {
    yes: "Both teams score at least one goal.",
    no: "At least one team does not score.",
    no_pick: "Evidence is insufficient, stale, contradictory, or the fixture is not eligible for a pre-match forecast.",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const Route = createFileRoute("/api/cron/synthetic-decisions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const raw = await request.text();
        if (raw.length > 100_000) return Response.json({ ok: false, error: "request_too_large" }, { status: 413 });
        let body: Record<string, unknown>;
        try {
          body = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
        }

        const fixture = body["fixture"];
        const slug = typeof body["experiment_slug"] === "string"
          ? body["experiment_slug"]
          : "puntr-30-day-synthetic-2026-11-23";
        const requestedIds = Array.isArray(body["persona_ids"])
          ? body["persona_ids"].filter((value): value is string => typeof value === "string")
          : null;
        if (!isRecord(fixture) || !fixture["fixture_id"] || !fixture["home_team"] || !fixture["away_team"] || !fixture["competition"] || !fixture["kickoff_utc"]) {
          return Response.json({ ok: false, error: "fixture_context_incomplete" }, { status: 400 });
        }
        if (requestedIds && (requestedIds.length < 1 || requestedIds.length > 100 || requestedIds.some(id => id.length > 64))) {
          return Response.json({ ok: false, error: "persona_ids_must_contain_1_to_100_ids" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as unknown as SupabaseClient;
        const { data: experiment, error: experimentError } = await db
          .from("synthetic_experiments")
          .select("id,status,starts_at,ends_at")
          .eq("slug", slug)
          .maybeSingle();
        if (experimentError || !experiment) return Response.json({ ok: false, error: "experiment_not_found" }, { status: 404 });
        if (experiment.status !== "active") return Response.json({ ok: false, error: "experiment_not_active" }, { status: 409 });
        const now = Date.now();
        if (now < Date.parse(experiment.starts_at) || now > Date.parse(experiment.ends_at)) {
          return Response.json({ ok: false, error: "experiment_outside_active_window" }, { status: 409 });
        }

        let personaQuery = db
          .from("synthetic_personas")
          .select("persona_key,persona")
          .eq("experiment_id", experiment.id)
          .eq("active", true);
        if (requestedIds) personaQuery = personaQuery.in("persona_key", requestedIds);
        const { data: personaRows, error: personaError } = await personaQuery.limit(100);
        if (personaError || !personaRows?.length) return Response.json({ ok: false, error: "no_active_personas" }, { status: 404 });

        const questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }> = {};
        const personaMarkets = new Map<string, string[]>();
        for (const row of personaRows) {
          const persona = row.persona as Record<string, unknown>;
          const interests = Array.isArray(persona["market_interests"]) ? persona["market_interests"] : [];
          const markets = interests.filter((market): market is string => typeof market === "string" && Boolean(MARKET_OPTIONS[market])).slice(0, 2);
          const competitions = Array.isArray(persona["competitions"]) ? persona["competitions"].join(", ") : "football";
          const style = typeof persona["research_style"] === "string" ? persona["research_style"] : "recent form";
          personaMarkets.set(row.persona_key, markets);
          for (const market of markets) {
            const questionKey = `${row.persona_key}__${market}`;
            questions[questionKey] = {
              type: "choice",
              instructions: [
                `Evaluate the pre-match ${market} forecast for ${String(fixture["home_team"])} vs ${String(fixture["away_team"])}.`,
                `Use this analytical lens: ${style}.`,
                `The persona follows ${competitions} and prefers ${markets.join(", ")}.`,
                "Use current, credible, independent web evidence. Do not invent team news, lineups, statistics or results.",
                "Choose no_pick if the fixture has started, finished, been postponed, evidence is insufficient, or sources materially disagree.",
                "This is an informational forecast for QA and accuracy evaluation, not advice to place a bet.",
              ].join(" "),
              criteria: MARKET_OPTIONS[market],
            };
          }
        }
        if (!Object.keys(questions).length || Object.keys(questions).length > 100) {
          return Response.json({ ok: false, error: "synthetic_batch_must_contain_1_to_100_questions" }, { status: 400 });
        }

        const requestBody = {
          mode: "fast" as const,
          state: {
            fixture,
            rule: "Pre-match only. Never use post-kickoff information. Do not recommend stakes, bookmakers or wagering actions.",
          },
          questions,
        };

        const { createCacheStore } = await import("@/lib/parallel/cache.server");
        const { cachedCall } = await import("@/lib/parallel/cached");
        const { cacheKey } = await import("@/lib/parallel/cache");
        const { createQuotaClaim, recordQuotaError } = await import("@/lib/quota.server");
        const store = await createCacheStore();
        const claim = await createQuotaClaim();
        const apiKey = process.env["PARALLEL_API_KEY"] || "";
        if (!apiKey) return Response.json({ ok: false, error: "parallel_not_configured" }, { status: 503 });
        const { createParallelDecisions } = await import("@/lib/parallel/decisions");

        let requestKey = "";
        let providerAttempted = false;
        let budgetReserved = false;
        try {
          const { value, cached } = await cachedCall(
            store,
            { endpoint: "decisions:synthetic", body: requestBody, purpose: "research" },
            async () => {
              const retryWindow = new Date().toISOString().slice(0, 13);
              requestKey = await cacheKey("decisions:synthetic-budget", { requestBody, retryWindow });
              const { data: reserved, error: reserveError } = await db.rpc("reserve_synthetic_budget", {
                p_experiment_id: experiment.id,
                p_request_key: requestKey,
                p_provider: "parallel-decisions",
                p_operation: "persona_fixture_decisions",
                p_estimated_usd: 0.001,
              });
              if (reserveError || reserved !== true) throw new Error("Synthetic experiment budget reservation denied");
              budgetReserved = true;

              if (!(await claim("parallel"))) {
                const { error: releaseError } = await db.rpc("settle_synthetic_budget", {
                  p_request_key: requestKey,
                  p_settled_usd: 0,
                  p_provider_request_id: null,
                  p_failed: true,
                });
                if (!releaseError) budgetReserved = false;
                throw new Error("Puntr's existing Parallel quota or monthly budget guard refused this request");
              }

              providerAttempted = true;
              const provider = createParallelDecisions(apiKey);
              const rawResult = await provider.decide(requestBody);
              providerAttempted = false;
              const citations = Array.isArray(rawResult["citations"]) ? rawResult["citations"] as Record<string, unknown>[] : [];
              const domains = [...new Set(citations.map(item => {
                try {
                  return new URL(String(item["url"])).hostname.replace(/^www\./, "");
                } catch {
                  return "";
                }
              }).filter(Boolean))];
              const enoughSources = domains.length >= 2;
              const answers = isRecord(rawResult["answers"]) ? rawResult["answers"] : {};
              const decisions = personaRows.flatMap(row => (personaMarkets.get(row.persona_key) || []).map(market => {
                const questionKey = `${row.persona_key}__${market}`;
                const answer = answers[questionKey];
                if (!enoughSources || !isRecord(answer) || answer["type"] !== "choice") {
                  return {
                    persona_id: row.persona_key,
                    question_key: questionKey,
                    market,
                    selection: "no_pick",
                    status: enoughSources ? "refused_or_missing" : "insufficient_sources",
                    probabilities: isRecord(answer) && isRecord(answer["probabilities"]) ? answer["probabilities"] : {},
                    selected_probability: null,
                    confidence: "none",
                  };
                }
                const selection = String(answer["choice"] || "");
                const probabilityMap = isRecord(answer["probabilities"]) ? answer["probabilities"] : {};
                const selectedProbability = typeof probabilityMap[selection] === "number" ? probabilityMap[selection] as number : null;
                const valid = Boolean(MARKET_OPTIONS[market]?.[selection]);
                const confidence = selectedProbability === null ? "none" : selectedProbability >= 0.7 ? "high" : selectedProbability >= 0.55 ? "medium" : "low";
                return {
                  persona_id: row.persona_key,
                  question_key: questionKey,
                  market,
                  selection: valid ? selection : "no_pick",
                  status: valid ? "evaluated" : "invalid_choice",
                  probabilities: probabilityMap,
                  selected_probability: selectedProbability,
                  confidence,
                };
              }));
              const result = {
                fixture: String(fixture["fixture_id"]),
                fixture_context: fixture,
                provider: "parallel-decisions",
                decision_id: rawResult["decision_id"] ?? null,
                persona_count: personaRows.length,
                decision_count: decisions.length,
                source_domains: domains,
                citations,
                decisions,
              };
              const { error: settleError } = await db.rpc("settle_synthetic_budget", {
                p_request_key: requestKey,
                p_settled_usd: null,
                p_provider_request_id: typeof rawResult["decision_id"] === "string" ? rawResult["decision_id"] : null,
                p_failed: false,
              });
              if (settleError) throw new Error("Could not settle synthetic experiment budget reservation");
              budgetReserved = false;
              return result;
            },
            (result) => result !== null && result !== undefined,
          );

          const sourceUrls = Array.isArray(value["citations"])
            ? (value["citations"] as Record<string, unknown>[]).map(item => String(item["url"] || "")).filter(Boolean)
            : [];
          const { error: saveError } = await db.from("synthetic_research").upsert({
            experiment_id: experiment.id,
            fixture_key: String(fixture["fixture_id"]),
            provider: "parallel-decisions",
            response_json: value,
            source_urls: sourceUrls,
          }, { onConflict: "experiment_id,fixture_key,provider" });
          if (saveError) throw new Error("Could not persist synthetic research output");
          return Response.json({ ok: true, cached, result: value });
        } catch (error) {
          if (providerAttempted) await recordQuotaError("parallel").catch(() => {});
          if (budgetReserved && requestKey) {
            try {
              await db.rpc("settle_synthetic_budget", {
                p_request_key: requestKey,
                p_settled_usd: null,
                p_provider_request_id: null,
                p_failed: true,
              });
            } catch {
              // Leave the reservation visible for reconciliation rather than hiding the original failure.
            }
          }
          console.error("synthetic-decisions failed", error);
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "synthetic_decisions_failed" }, { status: 500 });
        }
      },
    },
  },
});
