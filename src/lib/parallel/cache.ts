/**
 * Response cache keys and lifetimes for Parallel calls (docs/PARALLEL_ARCHITECTURE.md, rule 2: cache before you
 * call). Pure: the storage side is cache.server.ts.
 *
 * The key is a SHA-256 of the endpoint plus the request body serialised with sorted keys, after trimming and
 * lower-casing query text, so the same question asked twice (in any key order or spacing) shares one entry.
 */

export type CachePurpose =
  "fixtures" | "results" | "tables" | "odds" | "news" | "research" | "badges" | "chat" | "stats" | "match-intelligence";

/** Seconds an answer stays fresh, per purpose. Results are short because scores change at full time. */
export const CACHE_TTL_SECONDS: Readonly<Record<CachePurpose, number>> = {
  fixtures: 12 * 3600,
  results: 30 * 60,
  tables: 18 * 3600,
  odds: 6 * 3600,
  news: 6 * 3600,
  research: 24 * 3600,
  badges: 30 * 24 * 3600,
  chat: 3600,
  stats: 30 * 24 * 3600,
  "match-intelligence": 15 * 60,
};

function normalise(value: unknown): unknown {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ").toLowerCase();
  if (Array.isArray(value)) return value.map(normalise);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = normalise(v);
    }
    return out;
  }
  return value;
}

/** Deterministic JSON with sorted keys and normalised strings. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalise(value));
}

/** Web Crypto, so it runs on the Cloudflare-style server build as well as in Node tests. */
export async function cacheKey(endpoint: string, body: unknown): Promise<string> {
  const data = new TextEncoder().encode(`${endpoint}\n${stableStringify(body)}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function expiresAt(purpose: CachePurpose, now = Date.now()): string {
  return new Date(now + CACHE_TTL_SECONDS[purpose] * 1000).toISOString();
}

export function isFresh(expires: string | null | undefined, now = Date.now()): boolean {
  if (!expires) return false;
  const t = Date.parse(expires);
  return Number.isFinite(t) && t > now;
}
