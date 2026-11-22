import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Pre-match reference odds (docs/PARALLEL_ARCHITECTURE.md). Scheduled every 5 minutes from 07:00 to 07:55 and
 * 14:00 to 14:55 SAST; each bounded call refreshes one due competition with fixtures in the next 72 hours.
 * Searches are cached (6 h); every Parallel and Gemini call claims quota and the monthly USD budget first.
 * A single ?only=Premier League parameter is available for manual runs.
 */
export const Route = createFileRoute("/api/cron/sync-odds")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const env = process.env;
        if (!env["GEMINI_API_KEY"]?.trim() || !env["PARALLEL_API_KEY"]?.trim())
          return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

        const url = new URL(request.url);
        const only = url.searchParams
          .get("only")
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const max = 1;

        const { DEFAULT_PFIE_MODELS, parseModelList, readContentEnv } =
          await import("@/lib/content/config");
        const { createGemini, createParallelExtract, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const { withSearchCache } = await import("@/lib/parallel/cached");
        const { createCacheStore } = await import("@/lib/parallel/cache.server");
        const { oddsSourceDomains } = await import("@/lib/odds/reference");
        const { runOddsSync } = await import("@/lib/odds/sync");
        const { createOddsStore } = await import("@/lib/odds/store.server");
        const { createPfieStore } = await import("@/lib/pfie/store.server");
        try {
          const claim = await createQuotaClaim();
          const keys = readContentEnv(env);
          const pfieStore = createPfieStore();
          const report = await runOddsSync(
            {
              // Cache outside the guard: a cache hit claims no quota and costs nothing.
              search: withSearchCache(
                guardSearch(createParallelSearch(keys.parallelKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
                await createCacheStore(),
                "odds",
              ),
              // Prices go stale in hours: live page reads only (Parallel copies older than 15 minutes refused).
              extract: guardExtract(
                createParallelExtract(
                  keys.parallelKey!,
                  { timeoutMs: 20_000, attempts: 1 },
                  { maxAgeSeconds: 900 },
                ),
                claim,
              ),
              llm: guardLlm(createGemini(keys.geminiKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
              store: await createOddsStore(),
              allowedDomains: oddsSourceDomains(env["ODDS_SOURCE_DOMAINS"]),
              models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(","))
                .models.slice(0, 1),
              usageToday: () => pfieStore.usageToday(),
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
