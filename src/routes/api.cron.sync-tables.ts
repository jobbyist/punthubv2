import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * League standings refresh and one-time form history backfill (PFIE). Scheduled in two daily 10-minute windows (04:10-05:50 and 16:10-17:50 SAST); each call handles the next two due jobs. `?only=epl,psl`, `?job=standings|history` and
 * `?max=N` (1-4) are for manual runs.
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
        const max = Math.min(4, Math.max(1, Number(url.searchParams.get("max")) || 2));

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
              search: guardSearch(createParallelSearch(keys.parallelKey!), claim),
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
                          { timeoutMs: 45_000 },
                          { maxAgeSeconds: 900 },
                        ),
                        claim,
                      ),
              llm: guardLlm(createGemini(keys.geminiKey!), claim),
              store: createTablesStore(),
              models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? DEFAULT_PFIE_MODELS.join(","))
                .models,
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
