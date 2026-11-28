/** PFIE is Parallel-only: Parallel Search discovers sources, Parallel Extract reads them, and Parallel Responses validates structured observations. */
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
    const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
      await import("@/lib/quota.server");
    const claim = await createQuotaClaim("pfie:fixtures-results");
    return createPfieProvider({
      search: guardSearch(createParallelSearch(parallelKey), claim),
      extract: guardExtract(createParallelExtract(parallelKey), claim),
      llm: guardLlm(createParallelResponses(parallelKey, {}, { effort: "low" }), claim),
      store: createPfieStore(),
      models: ["parallel-low"],
    });
  }
  if (wanted === "pfie") return null;
  const { createProvider } = await import("./apisports.server");
  return createProvider();
}
