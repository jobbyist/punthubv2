/**
 * Read-through cache around Parallel calls. The store is injected so this stays pure and testable;
 * cache.server.ts supplies the Supabase-backed store.
 *
 * Store failures never block a provider call. Empty or failed answers are not cached. Concurrent identical
 * requests in one server process share a single in-flight provider call even when the persistent cache misses.
 */
import { type CachePurpose, cacheKey, expiresAt, isFresh } from "./cache";
import type { ExtractProvider, SearchProvider } from "@/lib/content/types";
import { costUsd } from "./pricing";

export interface CacheStore {
  get(key: string): Promise<{ response: unknown; expiresAt: string } | null>;
  put(entry: {
    key: string;
    endpoint: string;
    purpose: CachePurpose;
    response: unknown;
    expiresAt: string;
  }): Promise<void>;
}

export type CacheEvent = {
  endpoint: string;
  purpose: CachePurpose;
  outcome: "hit" | "miss" | "deduplicated" | "read_error" | "write_error";
  estimatedCostAvoidedUsd?: number;
};
export type CacheEventHandler = (event: CacheEvent) => void;

// Per-instance request coalescing. Vercel instances are ephemeral, so persistent reuse remains in parallel_cache.
const inFlight = new Map<string, Promise<unknown>>();

function notify(handler: CacheEventHandler | undefined, event: CacheEvent) {
  try {
    handler?.(event);
  } catch {
    // Metrics must never break ingestion.
  }
}

export async function cachedCall<T>(
  store: CacheStore | null,
  input: {
    endpoint: string;
    body: unknown;
    purpose: CachePurpose;
    now?: number;
    onEvent?: CacheEventHandler;
  },
  fetcher: () => Promise<T>,
  keep: (value: T) => boolean = (v) => v !== null && v !== undefined,
): Promise<{ value: T; cached: boolean; deduplicated?: boolean }> {
  const now = input.now ?? Date.now();
  const key = await cacheKey(input.endpoint, input.body);
  const estimatedCostAvoidedUsd = input.endpoint.startsWith("search:")
    ? costUsd("parallel") ?? undefined
    : input.endpoint.startsWith("extract:")
      ? costUsd("parallel-extract") ?? undefined
      : undefined;
  if (store) {
    try {
      const hit = await store.get(key);
      if (hit && isFresh(hit.expiresAt, now)) {
        notify(input.onEvent, { endpoint: input.endpoint, purpose: input.purpose, outcome: "hit", ...(estimatedCostAvoidedUsd !== undefined ? { estimatedCostAvoidedUsd } : {}) });
        return { value: hit.response as T, cached: true };
      }
    } catch (error) {
      notify(input.onEvent, { endpoint: input.endpoint, purpose: input.purpose, outcome: "read_error" });
      console.error("parallel-cache: read failed, calling the provider", (error as Error).message);
    }
  }

  const pending = inFlight.get(key);
  if (pending) {
    notify(input.onEvent, { endpoint: input.endpoint, purpose: input.purpose, outcome: "deduplicated", ...(estimatedCostAvoidedUsd !== undefined ? { estimatedCostAvoidedUsd } : {}) });
    return { value: (await pending) as T, cached: true, deduplicated: true };
  }

  notify(input.onEvent, { endpoint: input.endpoint, purpose: input.purpose, outcome: "miss" });
  const request = (async () => {
    const value = await fetcher();
    if (store && keep(value)) {
      try {
        await store.put({
          key,
          endpoint: input.endpoint,
          purpose: input.purpose,
          response: value,
          expiresAt: expiresAt(input.purpose, now),
        });
      } catch (error) {
        notify(input.onEvent, { endpoint: input.endpoint, purpose: input.purpose, outcome: "write_error" });
        console.error("parallel-cache: write failed", (error as Error).message);
      }
    }
    return value;
  })();
  inFlight.set(key, request);
  try {
    return { value: await request, cached: false };
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}

/**
 * Wrap a quota-guarded SearchProvider so a cache hit does not claim quota.
 * The cache wrapper must remain outside guardSearch().
 */
export function withSearchCache(
  inner: SearchProvider,
  store: CacheStore | null,
  purpose: CachePurpose,
  onEvent?: CacheEventHandler,
): SearchProvider {
  return {
    name: inner.name,
    async search(input) {
      const { value } = await cachedCall(
        store,
        { endpoint: `search:${inner.name}`, body: input, purpose, onEvent },
        () => inner.search(input),
        (hits) => hits.length > 0,
      );
      return value;
    },
  };
}

/** Cache full-page reads by canonical URL; cache wrapper stays outside guardExtract(). */
export function withExtractCache(
  inner: ExtractProvider | null,
  store: CacheStore | null,
  purpose: CachePurpose,
  onEvent?: CacheEventHandler,
): ExtractProvider | null {
  if (!inner) return null;
  return {
    name: inner.name,
    async extract(url) {
      const { value } = await cachedCall(
        store,
        { endpoint: `extract:${inner.name}`, body: { url }, purpose, onEvent },
        () => inner.extract(url),
        (page) => Boolean(page?.markdown),
      );
      return value;
    },
  };
}
