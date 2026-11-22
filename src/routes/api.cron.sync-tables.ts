import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * League standings refresh and one-time form history backfill (PFIE). Scheduled every five minutes in two daily windows; one due competition per request. Search is capped at 10s, live Extract at 20s and Gemini at 10s to stay within the 55s pg_net timeout. `?only=epl,psl` and `?job=standings|history` are for manual runs.
 */
export const Route = createFileRoute("/api/cron/sync-tables")({
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
        const only = url.searchParams.get("only")?.split(",").filter(Boolean);
        const jobParam = url.searchParams.get("job");
        const job =
          jobParam === "standings" ||
          jobParam === "history" ||
          jobParam === "season" ||
          jobParam === "archive"
            ? jobParam
            : undefined;
        const max = 1;

        const { DEFAULT_PFIE_MODELS, parseModelList, readContentEnv } =
          await import("@/lib/content/config");
        const { createGemini, createPageReader, createParallelExtract, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const { runTablesSync } = await import("@/lib/pfie/tables");
        const { createTablesStore } = await import("@/lib/pfie/tables-store.server");
        const { createPfieStore } = await import("@/lib/pfie/store.server");
        try {
          const claim = await createQuotaClaim();
          const keys = readContentEnv(env);
          const pfieStore = createPfieStore();
          const report = await runTablesSync(
            {
              search: guardSearch(createParallelSearch(keys.parallelKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
              // Archive pages are long and stable: Parallel Extract only (cached copies are fine, Firecrawl's free
              // tier is kept for live pages), with a longer timeout.
              extract:
                job === "archive"
                  ? guardExtract(
                      createParallelExtract(keys.parallelKey!, { timeoutMs: 45_000 }),
                      claim,
                    )
                  : job === "history" || job === "season"
                    ? createPageReader(
                        { firecrawl: keys.firecrawlKey, parallel: keys.parallelKey },
                        (r) => guardExtract(r, claim),
                      )
                    : guardExtract(
                        createParallelExtract(
                          keys.parallelKey!,
                          // Five independent full-page reads run concurrently. Use one bounded attempt per
                          // publisher; a slow source is skipped rather than retried inside the pg_net 55s window.
                          { timeoutMs: 20_000, attempts: 1 },
                          { maxAgeSeconds: 900 },
                        ),
                        claim,
                      ),
              llm: guardLlm(createGemini(keys.geminiKey!, { timeoutMs: 10_000, attempts: 1 }), claim),
              store: createTablesStore(),
              models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(","))
                .models.slice(0, 1),
              usageToday: () => pfieStore.usageToday(),
            },
            {
              maxJobs: max,
              ...(only?.length ? { only: only as never } : {}),
              ...(job ? { job } : {}),
            },
          );
          console.info("sync-tables", JSON.stringify(report));
          return Response.json({ ok: true, ...report });
        } catch (error) {
          console.error("sync-tables failed", error);
          return Response.json({ ok: false, error: "sync_failed" }, { status: 500 });
        }
      },
    },
  },
});
