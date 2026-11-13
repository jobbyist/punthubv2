/**
 * Chooses the fixtures provider. `SPORTS_PROVIDER=pfie` switches on PFIE (Parallel Search + Gemini, no
 * subscription); it needs GEMINI_API_KEY and PARALLEL_API_KEY and returns null without them. Anything else keeps
 * the API-Sports adapter. The switch is explicit so that adding the content-engine keys never starts writing
 * fixtures to the live site by itself.
 */
import type { SportsProvider } from "./provider";

export async function createSportsProvider(
  env: Record<string, string | undefined> = process.env,
): Promise<SportsProvider | null> {
  const wanted = env["SPORTS_PROVIDER"]?.trim().toLowerCase();
  const pfieReady = Boolean(env["GEMINI_API_KEY"]?.trim() && env["PARALLEL_API_KEY"]?.trim());

  if (wanted === "pfie" && pfieReady) {
    const { parseDailyCaps, parseModelList, readContentEnv } = await import("@/lib/content/config");
    const { createGemini, createPageReader, createParallelSearch } =
      await import("@/lib/content/providers.server");
    const { createPfieProvider } = await import("@/lib/pfie/provider");
    const { createPfieStore } = await import("@/lib/pfie/store.server");
    const keys = readContentEnv(env);
    return createPfieProvider({
      search: createParallelSearch(keys.parallelKey!),
      extract: createPageReader({ firecrawl: keys.firecrawlKey, parallel: keys.parallelKey }),
      llm: createGemini(keys.geminiKey!),
      store: createPfieStore(),
      models: parseModelList(env["PFIE_GEMINI_MODELS"] ?? "gemini-3.1-flash-lite,gemini-3.8-flash")
        .models,
      dailyCap: parseDailyCaps(env["CONTENT_GEMINI_RPD"]),
    });
  }
  if (wanted === "pfie") return null;
  const { createProvider } = await import("./apisports.server");
  return createProvider();
}
