/**
 * Live adapters for the three external services. Server only: the keys come from environment variables and are
 * passed in headers, never in URLs, logs or client code.
 *
 * Request and response shapes follow the providers' public references as read on 13 Nov 2026:
 *   Parallel Search  POST https://api.parallel.ai/v1/search            (header x-api-key)
 *   Firecrawl        POST https://api.firecrawl.dev/v2/scrape          (Authorization: Bearer)
 *   Gemini           POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *                                                                      (header x-goog-api-key)
 * None of these has been called with a real key from this code yet; see docs/CONTENT_ENGINE.md, "Live checks".
 */
import { postJson, ProviderError, type RetryOptions } from "./http";
import type {
  ExtractProvider,
  LlmProvider,
  LlmRequest,
  LlmResult,
  SearchHit,
  SearchProvider,
} from "./types";

type Overrides = Partial<Pick<RetryOptions, "fetchImpl" | "sleep">>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function createParallelSearch(apiKey: string, overrides: Overrides = {}): SearchProvider {
  return {
    name: "parallel",
    async search({ objective, queries, maxResults }) {
      const json = await postJson(
        "https://api.parallel.ai/v1/search",
        { "x-api-key": apiKey },
        { objective, search_queries: queries, mode: "fast" },
        { provider: "parallel", timeoutMs: 15_000, attempts: 2, baseDelayMs: 1_000, ...overrides },
      );
      const results = isRecord(json) && Array.isArray(json["results"]) ? json["results"] : null;
      if (!results) throw new ProviderError("parallel", "bad_response", null, "no results array");
      const hits: SearchHit[] = [];
      for (const r of results) {
        if (!isRecord(r)) continue;
        const url = str(r["url"]);
        if (!/^https:\/\//.test(url)) continue;
        const excerpts = Array.isArray(r["excerpts"]) ? r["excerpts"].map(str).filter(Boolean) : [];
        hits.push({
          url,
          title: str(r["title"]),
          excerpt: excerpts.join("\n\n"),
          publishedAt: str(r["publish_date"]) || null,
        });
      }
      return hits.slice(0, maxResults);
    },
  };
}

export function createFirecrawlExtract(apiKey: string, overrides: Overrides = {}): ExtractProvider {
  return {
    name: "firecrawl",
    async extract(url) {
      const json = await postJson(
        "https://api.firecrawl.dev/v2/scrape",
        { Authorization: `Bearer ${apiKey}` },
        // `proxy: "basic"` keeps a page at one credit: the default may retry with a stealth proxy at five.
        { url, formats: ["markdown"], onlyMainContent: true, proxy: "basic" },
        { provider: "firecrawl", timeoutMs: 20_000, attempts: 2, baseDelayMs: 1_000, ...overrides },
      );
      const data = isRecord(json) && isRecord(json["data"]) ? json["data"] : null;
      const markdown = data ? str(data["markdown"]) : "";
      if (!markdown) return null;
      const meta = data && isRecord(data["metadata"]) ? data["metadata"] : {};
      return { markdown, title: str(meta["title"]) || null };
    },
  };
}

export function createGemini(apiKey: string, overrides: Overrides = {}): LlmProvider {
  return {
    name: "gemini",
    async generate(model: string, request: LlmRequest): Promise<LlmResult> {
      const json = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": apiKey },
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: "application/json",
            responseSchema: request.schema,
          },
        },
        // One attempt per model: the router decides whether to retry or move to the fallback.
        { provider: "gemini", timeoutMs: 30_000, attempts: 1, baseDelayMs: 1_000, ...overrides },
      );
      const candidates =
        isRecord(json) && Array.isArray(json["candidates"]) ? json["candidates"] : [];
      const first = candidates[0];
      const content = isRecord(first) && isRecord(first["content"]) ? first["content"] : null;
      const parts = content && Array.isArray(content["parts"]) ? content["parts"] : [];
      const text = parts
        .map((p) => (isRecord(p) && p["thought"] !== true ? str(p["text"]) : ""))
        .join("")
        .trim();
      if (!text) {
        const reason = isRecord(first) ? str(first["finishReason"]) : "";
        throw new ProviderError(
          "gemini",
          "bad_response",
          null,
          `empty answer${reason ? ` (${reason})` : ""}`,
        );
      }
      return { model, text };
    },
  };
}

/** Parallel's Extract API: the second page reader, used when Firecrawl is out of credits or down. */
export function createParallelExtract(apiKey: string, overrides: Overrides = {}): ExtractProvider {
  return {
    name: "parallel-extract",
    async extract(url) {
      const json = await postJson(
        "https://api.parallel.ai/v1/extract",
        { "x-api-key": apiKey },
        { urls: [url], advanced_settings: { full_content: true } },
        {
          provider: "parallel-extract",
          timeoutMs: 20_000,
          attempts: 2,
          baseDelayMs: 1_000,
          ...overrides,
        },
      );
      const results = isRecord(json) && Array.isArray(json["results"]) ? json["results"] : [];
      const first = results[0];
      if (!isRecord(first)) return null;
      const excerpts = Array.isArray(first["excerpts"])
        ? first["excerpts"].map(str).join("\n\n")
        : "";
      const markdown = str(first["full_content"]) || excerpts;
      return markdown ? { markdown, title: str(first["title"]) || null } : null;
    },
  };
}

/**
 * Tries each page reader in order. A reader that errors (quota, auth, timeout, outage) or returns nothing hands
 * over to the next one. `name` reports the reader that actually answered last, for the usage counters.
 */
export function withExtractFallback(readers: ExtractProvider[]): ExtractProvider | null {
  if (readers.length === 0) return null;
  let last = readers[0]!.name;
  return {
    get name() {
      return last;
    },
    async extract(url) {
      let failure: unknown = null;
      for (const reader of readers) {
        last = reader.name;
        try {
          const page = await reader.extract(url);
          if (page) return page;
        } catch (error) {
          failure = error;
        }
      }
      if (failure) throw failure;
      return null;
    },
  };
}

/**
 * Firecrawl first (free allowance), then Parallel Extract. Either key alone also works. `guard` wraps each reader
 * (quota claims) so a reader whose cap is reached hands over to the next one.
 */
export function createPageReader(
  keys: { firecrawl: string | null; parallel: string | null },
  guard: (reader: ExtractProvider) => ExtractProvider = (r) => r,
): ExtractProvider | null {
  const readers: ExtractProvider[] = [];
  if (keys.firecrawl) readers.push(guard(createFirecrawlExtract(keys.firecrawl)));
  if (keys.parallel) readers.push(guard(createParallelExtract(keys.parallel)));
  return withExtractFallback(readers);
}
