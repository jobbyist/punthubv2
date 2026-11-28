import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * League standings refresh and one-time form history backfill (PFIE). Parallel-only: Search, Extract and Responses. Scheduled every five minutes in two daily windows (04:10-05:55 and 16:10-17:55 SAST); production cron processes one due competition per request to stay within the HTTP timeout. `?only=epl,psl`, `?job=standings|history` and
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
        if (!env["PARALLEL_API_KEY"]?.trim())
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

        const { createParallelExtract, createParallelResponses, createParallelSearch } =
          await import("@/lib/content/providers.server");
        const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
          await import("@/lib/quota.server");
        const { runTablesSync } = await import("@/lib/pfie/tables");
        const { createTablesStore } = await import("@/lib/pfie/tables-store.server");
        const { createPfieStore } = await import("@/lib/pfie/store.server");
        try {
          const claim = await createQuotaClaim("pfie:standings");
          const parallelKey = env["PARALLEL_API_KEY"]!.trim();
          const pfieStore = createPfieStore();
          const report = await runTablesSync(
            {
              search: guardSearch(createParallelSearch(parallelKey), claim),
              // Every PFIE page read uses Parallel Extract; no Firecrawl fallback is permitted.
              extract: guardExtract(
                createParallelExtract(
                  parallelKey,
                  {
                    timeoutMs: job === "archive" ? 45_000 : 30_000,
                    // One bounded attempt per publisher keeps batches inside the cron HTTP timeout.
                    attempts: 1,
                  },
                  { maxAgeSeconds: job === "archive" ? undefined : 900 },
                ),
                claim,
              ),
              llm: guardLlm(createParallelResponses(parallelKey, {}, { effort: "low" }), claim),
              store: createTablesStore(),
              models: ["parallel-low"],
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
