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

type Overrides = Partial<Pick<RetryOptions, "fetchImpl" | "sleep" | "timeoutMs" | "attempts">>;

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

/**
 * Parallel Responses API used for editorial drafting and independent review.
 * Structured JSON output is normalised from the Gemini-compatible schema used by the content engine.
 */
function parallelJsonSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!isRecord(value)) return value;
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "type" && typeof child === "string") {
        out[key] = ({ OBJECT: "object", ARRAY: "array", STRING: "string", INTEGER: "integer", NUMBER: "number", BOOLEAN: "boolean" } as Record<string, string>)[child] ?? child;
      } else out[key] = visit(child);
    }
    if (out["type"] === "object") {
      out["additionalProperties"] = false;
      if (isRecord(out["properties"])) out["required"] = Object.keys(out["properties"]);
    }
    return out;
  };
  return visit(schema) as Record<string, unknown>;
}

export function createParallelResponses(apiKey: string, overrides: Overrides = {}): LlmProvider {
  return {
    name: "parallel-responses",
    async generate(_model: string, request: LlmRequest): Promise<LlmResult> {
      const json = await postJson(
        "https://api.parallel.ai/v1/responses",
        { Authorization: `Bearer ${apiKey}` },
        {
          model: "parallel",
          input: [
            { role: "system", content: request.system },
            { role: "user", content: request.prompt },
          ],
          reasoning: { effort: "medium" },
          max_output_tokens: request.maxOutputTokens,
          text: { format: { type: "json_schema", name: "puntr_newsroom_article", strict: true, schema: parallelJsonSchema(request.schema) } },
        },
        { provider: "parallel-chat", timeoutMs: 60_000, attempts: 1, baseDelayMs: 1_000, ...overrides },
      );
      const direct = isRecord(json) ? str(json["output_text"]) : "";
      const items = isRecord(json) && Array.isArray(json["output"]) ? json["output"] : [];
      const nested = items.filter((item) => isRecord(item) && item["type"] === "message")
        .flatMap((item) => isRecord(item) && Array.isArray(item["content"]) ? item["content"] : [])
        .map((part) => isRecord(part) ? str(part["text"]) : "").join("");
      const text = direct || nested;
      if (!text.trim()) throw new ProviderError("parallel-chat", "bad_response", null, "empty response");
      return { model: "parallel-medium", text: text.trim() };
    },
  };
}
/**
 * Parallel's Extract API: the second page reader, used when Firecrawl is out of credits or down. `maxAgeSeconds`
 * forces a live fetch when Parallel's cached copy is older (minimum 600) and refuses stale fallbacks: needed for
 * prices, which go stale in hours.
 */
export function createParallelExtract(
  apiKey: string,
  overrides: Overrides = {},
  options: { maxAgeSeconds?: number } = {},
): ExtractProvider {
  const advanced: Record<string, unknown> = { full_content: true };
  if (options.maxAgeSeconds) {
    advanced["fetch_policy"] = {
      max_age_seconds: Math.max(600, options.maxAgeSeconds),
      timeout_seconds: 30,
      disable_cache_fallback: true,
    };
  }
  return {
    name: "parallel-extract",
    async extract(url) {
      const json = await postJson(
        "https://api.parallel.ai/v1/extract",
        { "x-api-key": apiKey },
        { urls: [url], advanced_settings: advanced },
        {
          provider: "parallel-extract",
          timeoutMs: options.maxAgeSeconds ? 40_000 : 20_000,
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
  options: { maxAgeSeconds?: number } = {},
): ExtractProvider | null {
  const readers: ExtractProvider[] = [];
  // Firecrawl always scrapes live (and renders JavaScript); Parallel can be told how fresh its copy must be.
  if (keys.firecrawl) readers.push(guard(createFirecrawlExtract(keys.firecrawl)));
  if (keys.parallel) readers.push(guard(createParallelExtract(keys.parallel, {}, options)));
  return withExtractFallback(readers);
}
