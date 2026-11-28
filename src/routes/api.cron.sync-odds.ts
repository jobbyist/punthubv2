import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Pre-match reference odds (docs/PARALLEL_ARCHITECTURE.md). Scheduled every 10 minutes from 07:00 to 07:50 and
 * 14:00 to 14:50 SAST; each call refreshes the next two due competitions with fixtures in the next 72 hours.
 * Parallel Search and Extract are used for discovery/page reads; Parallel Chat low performs structured extraction.
 * Searches are cached (6 h) and every provider call claims the quota and monthly USD budget first.
 * `?only=Premier League` and `?max=N` (1-4) are for manual runs.
 */
export const Route = createFileRoute("/api/cron/sync-odds")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const env = process.env;
        // Automated odds remain disabled until written data rights are approved in the source registry
        // and an operator explicitly enables the feature flag.
        if (env["ODDS_AUTOMATION_ENABLED"] !== "true") {
          return Response.json({
            ok: true,
            disabled: true,
            reason: "awaiting_written_bookmaker_data_rights",
          });
        }
        if (!env["PARALLEL_API_KEY"]?.trim()) {
          return Response.json({ ok: false, error: "parallel_not_configured" }, { status: 503 });
        }

        const url = new URL(request.url);
        const only = url.searchParams
          .get("only")
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const max = Math.min(4, Math.max(1, Number(url.searchParams.get("max")) || 2));

        const { readContentEnv } = await import("@/lib/content/config");
        const { createParallelExtract, createParallelResponses, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const { withSearchCache } = await import("@/lib/parallel/cached");
        const { createCacheStore } = await import("@/lib/parallel/cache.server");
        const { runOddsSync } = await import("@/lib/odds/sync");
        const { createOddsStore } = await import("@/lib/odds/store.server");
        try {
          const keys = readContentEnv(env);
          const store = await createOddsStore();
          const allowedDomains = await store.authorizedDomains();
          if (allowedDomains.length === 0) {
            return Response.json({
              ok: true,
              disabled: true,
              reason: "no_bookmaker_has_verified_licence_and_written_data_rights",
            });
          }
          const claim = await createQuotaClaim("pfie:odds");
          const report = await runOddsSync(
            {
              // Cache outside the guard: a cache hit claims no quota and costs nothing.
              search: withSearchCache(
                guardSearch(createParallelSearch(keys.parallelKey!), claim),
                await createCacheStore(),
                "odds",
              ),
              // Read permitted bookmaker pages with Parallel Extract only; refuse cached copies older than 15 minutes.
              extract: guardExtract(
                createParallelExtract(keys.parallelKey!, {}, { maxAgeSeconds: 900 }),
                claim,
              ),
              // Structured odds extraction uses Parallel Chat low, not Gemini.
              llm: guardLlm(
                createParallelResponses(keys.parallelKey!, {}, { effort: "low" }),
                claim,
              ),
              store,
              allowedDomains,
            },
            { maxCompetitions: max, ...(only?.length ? { only } : {}) },
          );
          console.info("sync-odds", JSON.stringify(report));
          return Response.json({ ok: true, ...report });
        } catch (error) {
          console.error("sync-odds failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
