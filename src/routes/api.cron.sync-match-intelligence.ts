import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/** One fixture per request: bounded Parallel reads and one Gemini model stay inside the cron execution budget. */
export const Route = createFileRoute("/api/cron/sync-match-intelligence")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const env = process.env;
        if (!env["GEMINI_API_KEY"]?.trim() || !env["PARALLEL_API_KEY"]?.trim())
          return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

        const {
          DEFAULT_PFIE_MODELS,
          parseModelList,
          readContentEnv,
        } = await import("@/lib/content/config");
        const { createGemini, createParallelExtract, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const { withSearchCache } = await import("@/lib/parallel/cached");
        const { createCacheStore } = await import("@/lib/parallel/cache.server");
        const { runMatchIntelligenceSync } = await import("@/lib/pfie/match-intelligence");
        const { createMatchIntelligenceStore } = await import("@/lib/pfie/match-intelligence-store.server");
        const { createPfieStore } = await import("@/lib/pfie/store.server");

        try {
          const claim = await createQuotaClaim();
          const keys = readContentEnv(env);
          const pfieStore = createPfieStore();
          const report = await runMatchIntelligenceSync({
            search: withSearchCache(
              guardSearch(createParallelSearch(keys.parallelKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
              await createCacheStore(),
              "match-intelligence",
            ),
            extract: guardExtract(
              createParallelExtract(
                keys.parallelKey!,
                { timeoutMs: 20_000, attempts: 1 },
                { maxAgeSeconds: 900 },
              ),
              claim,
            ),
            llm: guardLlm(createGemini(keys.geminiKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
            store: await createMatchIntelligenceStore(),
            // One model per bounded cron request; the next scheduled retry provides resilience without exceeding pg_net's timeout.
            models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(",")).models.slice(0, 1),
            usageToday: () => pfieStore.usageToday(),
          }, { maxJobs: 1 });
          console.info("sync-match-intelligence", JSON.stringify(report));
          return Response.json({ ok: true, ...report });
        } catch (error) {
          console.error("sync-match-intelligence failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
