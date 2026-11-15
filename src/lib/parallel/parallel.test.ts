import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { CACHE_TTL_SECONDS, cacheKey, expiresAt, isFresh, stableStringify } from "./cache";
import { type CacheStore, cachedCall, withSearchCache } from "./cached";
import { PARALLEL_UNIT_PRICES_USD, budgetFamily, costUsd } from "./pricing";
import { createParallelChat, createParallelTask, extractOutputText, parseBasis } from "./task";

function memoryStore(): CacheStore & {
  rows: Map<string, { response: unknown; expiresAt: string }>;
} {
  const rows = new Map<string, { response: unknown; expiresAt: string }>();
  return {
    rows,
    async get(key) {
      return rows.get(key) ?? null;
    },
    async put(e) {
      rows.set(e.key, { response: e.response, expiresAt: e.expiresAt });
    },
  };
}

describe("pricing", () => {
  it("prices calls and refuses unknown providers", () => {
    expect(costUsd("parallel", 1000)).toBe(1);
    expect(costUsd("parallel-task:lite", 3)).toBe(0.015);
    expect(costUsd("parallel-unknown")).toBeNull();
    expect(costUsd("parallel", -1)).toBeNull();
  });

  it("groups provider keys into budget families", () => {
    expect(budgetFamily("parallel")).toBe("parallel");
    expect(budgetFamily("parallel-extract")).toBe("parallel");
    expect(budgetFamily("parallel-task:core")).toBe("parallel");
    expect(budgetFamily("gemini:gemini-3.8-flash")).toBe("gemini");
  });

  it("seeds the same prices in the migration", () => {
    const sql = readFileSync("supabase/migrations/20261115010000_parallel_data_layer.sql", "utf8");
    for (const [provider, price] of Object.entries(PARALLEL_UNIT_PRICES_USD)) {
      const re = new RegExp(
        `\\('${provider.replace(/[:-]/g, (c) => `\\${c}`)}', ${price.toFixed(3)}`,
      );
      expect(sql, provider).toMatch(re);
    }
  });
});

describe("cache keys", () => {
  it("ignores key order, spacing and case", async () => {
    const a = await cacheKey("search", { objective: "PSL  fixtures", queries: ["Chiefs"] });
    const b = await cacheKey("search", { queries: ["chiefs "], objective: "psl fixtures" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await cacheKey("extract", { objective: "psl fixtures" })).not.toBe(a);
  });

  it("drops undefined fields", () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it("computes freshness from the purpose TTL", () => {
    const now = Date.parse("2026-11-15T00:00:00Z");
    const exp = expiresAt("results", now);
    expect(Date.parse(exp) - now).toBe(CACHE_TTL_SECONDS.results * 1000);
    expect(isFresh(exp, now)).toBe(true);
    expect(isFresh(exp, now + CACHE_TTL_SECONDS.results * 1000 + 1)).toBe(false);
    expect(isFresh(null, now)).toBe(false);
  });
});

describe("cachedCall", () => {
  it("serves a fresh hit without calling the provider", async () => {
    const store = memoryStore();
    const fetcher = vi.fn(async () => ({ ok: 1 }));
    const input = { endpoint: "task", body: { q: "x" }, purpose: "research" as const };
    expect((await cachedCall(store, input, fetcher)).cached).toBe(false);
    const second = await cachedCall(store, input, fetcher);
    expect(second).toEqual({ value: { ok: 1 }, cached: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("calls again once the entry has expired", async () => {
    const store = memoryStore();
    const fetcher = vi.fn(async () => 1);
    const base = { endpoint: "s", body: {}, purpose: "results" as const };
    await cachedCall(store, { ...base, now: 0 }, fetcher);
    await cachedCall(store, { ...base, now: (CACHE_TTL_SECONDS.results + 1) * 1000 }, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("still answers when the store fails, and never caches empty answers", async () => {
    const broken: CacheStore = {
      get: async () => {
        throw new Error("down");
      },
      put: async () => {
        throw new Error("down");
      },
    };
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      (await cachedCall(broken, { endpoint: "s", body: {}, purpose: "news" }, async () => 5)).value,
    ).toBe(5);
    err.mockRestore();

    const store = memoryStore();
    const search = vi.fn(async () => []);
    const cached = withSearchCache({ name: "parallel", search }, store, "fixtures");
    await cached.search({ objective: "o", queries: ["q"], maxResults: 5 });
    await cached.search({ objective: "o", queries: ["q"], maxResults: 5 });
    expect(search).toHaveBeenCalledTimes(2);
    expect(store.rows.size).toBe(0);
  });
});

describe("task and chat clients", () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  it("creates a run, waits for the result and parses the basis", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method} ${url}`);
      if (String(url).endsWith("/v1/tasks/runs")) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body["processor"]).toBe("lite");
        expect(body["source_policy"]).toEqual({ include_domains: ["psl.co.za"] });
        return json({ run_id: "trun_1", status: "queued" });
      }
      return json({
        run: { run_id: "trun_1", status: "completed" },
        output: {
          type: "json",
          content: { venue: "FNB Stadium" },
          basis: [
            {
              field: "venue",
              citations: [{ url: "https://psl.co.za/x", excerpts: ["FNB"] }],
              reasoning: "stated",
              confidence: "high",
            },
          ],
        },
      });
    }) as unknown as typeof fetch;
    const res = await createParallelTask("k", fetchImpl).run<{ venue: string }>({
      input: "Where is the Soweto Derby played?",
      processor: "lite",
      outputSchema: { type: "object", properties: { venue: { type: "string" } } },
      includeDomains: ["psl.co.za"],
      waitSeconds: 30,
    });
    expect(res.content.venue).toBe("FNB Stadium");
    expect(res.basis[0]?.citations[0]?.url).toBe("https://psl.co.za/x");
    expect(calls[1]).toContain("/v1/tasks/runs/trun_1/result?timeout=30");
  });

  it("throws on a failed run and maps HTTP errors", async () => {
    const failed = (async (url: string) =>
      String(url).endsWith("/runs")
        ? json({ run_id: "r" })
        : json({ run: { status: "failed" } })) as unknown as typeof fetch;
    await expect(
      createParallelTask("k", failed).run({ input: "x", processor: "lite", outputSchema: {} }),
    ).rejects.toThrow(/failed/);
    const quota = (async () => json({ error: "no credit" }, 402)) as unknown as typeof fetch;
    await expect(createParallelChat("k", quota).ask("hi")).rejects.toMatchObject({ kind: "quota" });
  });

  it("reads chat answers from output_text or message items", async () => {
    expect(extractOutputText({ output_text: " Pirates " })).toBe("Pirates");
    expect(
      extractOutputText({
        output: [
          { type: "web_search_call" },
          { type: "message", content: [{ type: "output_text", text: "Chiefs" }] },
        ],
      }),
    ).toBe("Chiefs");
    expect(parseBasis("nope")).toEqual([]);
  });
});
