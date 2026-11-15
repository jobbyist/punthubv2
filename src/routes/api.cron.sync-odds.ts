import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Pre-match reference odds (docs/PARALLEL_ARCHITECTURE.md). Scheduled every 10 minutes from 07:00 to 07:50 and
 * 14:00 to 14:50 SAST; each call refreshes the next two due competitions with fixtures in the next 72 hours.
 * Searches are cached (6 h) and every Parallel and Gemini call claims the quota and the monthly USD budget first.
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
        if (!env["GEMINI_API_KEY"]?.trim() || !env["PARALLEL_API_KEY"]?.trim())
          return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

        const url = new URL(request.url);
        const only = url.searchParams
          .get("only")
          ?.split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const max = Math.min(4, Math.max(1, Number(url.searchParams.get("max")) || 2));

        const { DEFAULT_PFIE_MODELS, parseModelList, readContentEnv } =
          await import("@/lib/content/config");
        const { createGemini, createPageReader, createParallelSearch } =
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
                guardSearch(createParallelSearch(keys.parallelKey!), claim),
                await createCacheStore(),
                "odds",
              ),
              extract: createPageReader(
                { firecrawl: keys.firecrawlKey, parallel: keys.parallelKey },
                (r) => guardExtract(r, claim),
              ),
              llm: guardLlm(createGemini(keys.geminiKey!), claim),
              store: await createOddsStore(),
              allowedDomains: oddsSourceDomains(env["ODDS_SOURCE_DOMAINS"]),
              models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(","))
                .models,
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
