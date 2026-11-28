/** PFIE is Parallel-only: Parallel Search discovers sources, Parallel Extract reads them, and Parallel Responses validates structured observations. */
import { withLlmCache } from "@/lib/parallel/cached";
import type { SportsProvider } from "./provider";

export async function createSportsProvider(
  env: Record<string, string | undefined> = process.env,
): Promise<SportsProvider | null> {
  const wanted = env["SPORTS_PROVIDER"]?.trim().toLowerCase();
  const parallelKey = env["PARALLEL_API_KEY"]?.trim();
  if (wanted === "pfie" && parallelKey) {
    const { createParallelExtract, createParallelResponses, createParallelSearch } =
      await import("@/lib/content/providers.server");
    const { createPfieProvider } = await import("@/lib/pfie/provider");
    const { createPfieStore } = await import("@/lib/pfie/store.server");
    const { createCacheStore } = await import("@/lib/parallel/cache.server");
    const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
      await import("@/lib/quota.server");
    let usageContext: { competition?: string; jobRunId?: string } = {};
    const claim = await createQuotaClaim("pfie:fixtures-results", () => usageContext);
    const cache = await createCacheStore().catch((error: unknown) => {
      console.warn("pfie: Parallel cache unavailable; using in-process request deduplication only", error);
      return null;
    });
    const cachedLlm = withLlmCache(
      createParallelResponses(parallelKey, {}, { effort: "low" }),
      cache,
      "results",
      (event) => console.info("pfie-cache", JSON.stringify({
        competition: usageContext.competition ?? null,
        job: "fixtures-results",
        ...event,
      })),
    );
    return createPfieProvider({
      search: guardSearch(createParallelSearch(parallelKey), claim),
      extract: guardExtract(createParallelExtract(parallelKey), claim),
      llm: guardLlm(cachedLlm, claim),
      store: createPfieStore(),
      cache,
      setUsageContext: (context) => {
        usageContext = context;
      },
      models: ["parallel-low"],
    });
  }
  if (wanted === "pfie") return null;
  const { createProvider } = await import("./apisports.server");
  return createProvider();
}
