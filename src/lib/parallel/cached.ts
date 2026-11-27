/**
 * Read-through cache around any Parallel call. The store is injected so this stays pure and testable;
 * cache.server.ts supplies the Supabase-backed store.
 *
 * A store failure never blocks the call (the answer is fetched and simply not cached), and an empty or failed
 * answer is never cached, so a bad moment at the provider does not stick for hours.
 */
import { type CachePurpose, cacheKey, expiresAt, isFresh } from "./cache";
import type { ExtractProvider, SearchProvider } from "@/lib/content/types";

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

export async function cachedCall<T>(
  store: CacheStore | null,
  input: { endpoint: string; body: unknown; purpose: CachePurpose; now?: number },
  fetcher: () => Promise<T>,
  keep: (value: T) => boolean = (v) => v !== null && v !== undefined,
): Promise<{ value: T; cached: boolean }> {
  const now = input.now ?? Date.now();
  const key = await cacheKey(input.endpoint, input.body);
  if (store) {
    try {
      const hit = await store.get(key);
      if (hit && isFresh(hit.expiresAt, now)) return { value: hit.response as T, cached: true };
    } catch (error) {
      console.error("parallel-cache: read failed, calling the provider", (error as Error).message);
    }
  }
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
      console.error("parallel-cache: write failed", (error as Error).message);
    }
  }
  return { value, cached: false };
}

/**
 * Wraps a SearchProvider so a repeated search inside its TTL costs nothing. Put it OUTSIDE the quota guard
 * (`withSearchCache(guardSearch(...))`) so a cache hit does not claim quota either.
 */
export function withSearchCache(
  inner: SearchProvider,
  store: CacheStore | null,
  purpose: CachePurpose,
): SearchProvider {
  return {
    name: inner.name,
    async search(input) {
      const { value } = await cachedCall(
        store,
        { endpoint: `search:${inner.name}`, body: input, purpose },
        () => inner.search(input),
        (hits) => hits.length > 0,
      );
      return value;
    },
  };
}


/** Cache full-page reads by canonical URL so the three daily newsroom slots share extracted source text. */
export function withExtractCache(
  inner: ExtractProvider | null,
  store: CacheStore | null,
  purpose: CachePurpose,
): ExtractProvider | null {
  if (!inner) return null;
  return {
    name: inner.name,
    async extract(url) {
      const { value } = await cachedCall(
        store,
        { endpoint: `extract:${inner.name}`, body: { url }, purpose },
        () => inner.extract(url),
        (page) => Boolean(page?.markdown),
      );
      return value;
    },
  };
}
