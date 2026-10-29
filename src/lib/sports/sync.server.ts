import { competitions, type CompetitionKey } from "./competitions";
import type { SportsProvider } from "./provider";
import type { NormalisedFixture } from "./types";

/** The part of the Supabase admin client the sync uses, so it can be faked in tests. */
export interface FixtureStore {
  /** provider_refs that are already finished and must not be overwritten. */
  finishedRefs(provider: string, refs: string[]): Promise<Set<string>>;
  upsert(rows: NormalisedFixture[]): Promise<void>;
  /** Fixtures that kicked off between since and now and have no final status. */
  openSince(
    since: Date,
    now: Date,
  ): Promise<{ provider: string; providerRef: string; competition: string; kickoffAt: string }[]>;
}

export interface SyncReport {
  ok: true;
  calls: number;
  upserted: number;
  skipped: { key: string; reason: string }[];
}

const DAY = 24 * 3600 * 1000;

/** Yesterday to 14 days ahead. One provider call per competition. */
export async function syncFixtures(
  provider: SportsProvider,
  store: FixtureStore,
  now = new Date(),
): Promise<SyncReport> {
  const { fixtures, calls, skipped } = await provider.listFixtures(
    new Date(now.getTime() - DAY),
    new Date(now.getTime() + 14 * DAY),
  );
  const finished = await store.finishedRefs(
    provider.name,
    fixtures.map((f) => f.providerRef),
  );
  // A finished fixture keeps its final score; the provider must not move it back to scheduled or live.
  const rows = fixtures.filter((f) => !finished.has(f.providerRef));
  if (rows.length) await store.upsert(rows);
  return { ok: true, calls, upserted: rows.length, skipped };
}

/**
 * Fixtures that kicked off in the last 36 hours and are not final. Calls the provider only for the competitions
 * that have such fixtures, and not at all when there are none, so the 30-minute schedule spends no quota idle.
 */
export async function syncResults(
  provider: SportsProvider,
  store: FixtureStore,
  now = new Date(),
): Promise<SyncReport> {
  const since = new Date(now.getTime() - 36 * 3600 * 1000);
  const open = await store.openSince(since, now);
  if (open.length === 0) return { ok: true, calls: 0, upserted: 0, skipped: [] };

  const names = new Set(open.map((o) => o.competition));
  const only = competitions.filter((c) => names.has(c.name)).map((c) => c.key) as CompetitionKey[];
  if (only.length === 0)
    return {
      ok: true,
      calls: 0,
      upserted: 0,
      skipped: [{ key: "csv", reason: "open fixtures are not from a provider competition" }],
    };

  const earliest = new Date(Math.min(...open.map((o) => Date.parse(o.kickoffAt))));
  const { fixtures, calls, skipped } = await provider.listResults(earliest, now, { only });
  const openRefs = new Set(
    open.filter((o) => o.provider === provider.name).map((o) => o.providerRef),
  );
  const rows = fixtures.filter((f) => openRefs.has(f.providerRef));
  if (rows.length) await store.upsert(rows);
  return { ok: true, calls, upserted: rows.length, skipped };
}
