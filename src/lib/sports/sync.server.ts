import { activeCompetitions, type CompetitionKey } from "./competitions";
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
  ): Promise<{
    provider: string;
    providerRef: string;
    competition: string;
    home: string;
    away: string;
    kickoffAt: string;
  }[]>;
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
 * The same window, one competition at a time, writing each competition's fixtures as soon as they are verified.
 * Stops starting new competitions once `budgetMs` has passed, so a serverless time limit can never throw away work
 * that was already done (before 15 Nov a 21-competition run timed out before its single write and published
 * nothing). The caller passes `keys` least-recently-synced first and calls again for the rest.
 */
export async function syncFixturesByCompetition(
  provider: SportsProvider,
  store: FixtureStore,
  keys: CompetitionKey[],
  opts: { now?: Date; budgetMs?: number; clock?: () => number } = {},
): Promise<SyncReport & { done: CompetitionKey[]; remaining: CompetitionKey[] }> {
  const now = opts.now ?? new Date();
  const clock = opts.clock ?? (() => Date.now());
  const started = clock();
  const budget = opts.budgetMs ?? 150_000;
  const from = new Date(now.getTime() - DAY);
  const to = new Date(now.getTime() + 14 * DAY);
  const report = {
    ok: true as const,
    calls: 0,
    upserted: 0,
    skipped: [] as { key: string; reason: string }[],
    done: [] as CompetitionKey[],
    remaining: [] as CompetitionKey[],
  };
  for (const key of keys) {
    if (clock() - started > budget) {
      report.remaining.push(key);
      continue;
    }
    const r = await provider.listFixtures(from, to, { only: [key] });
    report.calls += r.calls;
    report.skipped.push(...r.skipped);
    const finished = await store.finishedRefs(
      provider.name,
      r.fixtures.map((f) => f.providerRef),
    );
    const rows = r.fixtures.filter((f) => !finished.has(f.providerRef));
    if (rows.length) await store.upsert(rows);
    report.upserted += rows.length;
    report.done.push(key);
  }
  return report;
}

/**
 * Fixtures that kicked off in the last seven days and are not final. Old unresolved fixtures stay eligible for
 * another verified-results attempt instead of silently falling out of the sync window.
 */
export async function syncResults(
  provider: SportsProvider,
  store: FixtureStore,
  now = new Date(),
): Promise<SyncReport> {
  const since = new Date(now.getTime() - 7 * DAY);
  const open = await store.openSince(since, now);
  if (open.length === 0) return { ok: true, calls: 0, upserted: 0, skipped: [] };

  const names = new Set(open.map((o) => o.competition));
  const only = activeCompetitions()
    .filter((c) => names.has(c.name))
    .map((c) => c.key) as CompetitionKey[];
  if (only.length === 0)
    return {
      ok: true,
      calls: 0,
      upserted: 0,
      skipped: [{ key: "csv", reason: "open fixtures are not from a provider competition" }],
    };

  // One provider call per competition, each from its own earliest open kick-off, so one stuck match in one
  // competition never slows the checks for another (the PFIE back-off is measured from this time).
  const fixtures: NormalisedFixture[] = [];
  const skipped: { key: string; reason: string }[] = [];
  let calls = 0;
  for (const key of only) {
    const name = activeCompetitions().find((c) => c.key === key)?.name;
    const mine = open
      .filter((o) => o.competition === name)
      .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
    const earliest = new Date(Math.min(...mine.map((o) => Date.parse(o.kickoffAt))));
    const r = await provider.listResults(earliest, now, {
      only: [key],
      fixtures: mine.slice(0, 3).map((fixture) => ({
        home: fixture.home,
        away: fixture.away,
        kickoffAt: fixture.kickoffAt,
      })),
    });
    fixtures.push(...r.fixtures);
    skipped.push(...r.skipped);
    calls += r.calls;
  }
  const openRefs = new Set(
    open.filter((o) => o.provider === provider.name).map((o) => o.providerRef),
  );
  const rows = fixtures.filter((f) => openRefs.has(f.providerRef));
  if (rows.length) await store.upsert(rows);
  return { ok: true, calls, upserted: rows.length, skipped };
}
