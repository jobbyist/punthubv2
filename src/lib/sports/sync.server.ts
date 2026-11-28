import { activeCompetitions, type CompetitionKey } from "./competitions";
import { normaliseTeam } from "../pfie/teams";
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
  ): Promise<
    {
      provider: string;
      providerRef: string;
      competition: string;
      home: string;
      away: string;
      kickoffAt: string;
    }[]
  >;
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

/** Unresolved fixtures remain eligible for a verified result update for 30 days after kick-off. */
export const RESULTS_LOOKBACK_DAYS = 30;
/** Pass a wider batch of unresolved fixtures into one PFIE result lookup without adding provider calls. */
export const RESULTS_TARGET_FIXTURE_LIMIT = 12;
export async function syncResults(
  provider: SportsProvider,
  store: FixtureStore,
  now = new Date(),
  options: { force?: boolean; only?: CompetitionKey[] } = {},
): Promise<SyncReport> {
  const since = new Date(now.getTime() - RESULTS_LOOKBACK_DAYS * DAY);
  const open = await store.openSince(since, now);
  if (open.length === 0) return { ok: true, calls: 0, upserted: 0, skipped: [] };

  const names = new Set(open.map((o) => o.competition));
  const only = activeCompetitions()
    .filter((c) => names.has(c.name) && (!options.only || options.only.includes(c.key)))
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
      fixtures: mine.slice(0, RESULTS_TARGET_FIXTURE_LIMIT).map((fixture) => ({
        home: fixture.home,
        away: fixture.away,
        kickoffAt: fixture.kickoffAt,
      })),
      ...(options.force ? { force: true } : {}),
    });
    fixtures.push(...r.fixtures);
    skipped.push(...r.skipped);
    calls += r.calls;
  }
  const providerOpen = open.filter((o) => o.provider === provider.name);
  const openByTeams = new Map<string, typeof providerOpen>();
  const teamKey = (competition: string, home: string, away: string) =>
    `${competition.trim().toLowerCase()}|${normaliseTeam(home)}|${normaliseTeam(away)}`;
  for (const fixture of providerOpen) {
    const key = teamKey(fixture.competition, fixture.home, fixture.away);
    const bucket = openByTeams.get(key) ?? [];
    bucket.push(fixture);
    openByTeams.set(key, bucket);
  }

  // Provider result pages often use official short names (AGF/Aarhus, FC Iberia/Iberia Tbilisi)
  // that differ from the original fixture label. Match only the same competition, canonical home/away
  // pairing and a kick-off within 15 minutes. If duplicate aliases represent the same fixture, update
  // each stored provider_ref so no duplicate row remains indefinitely scheduled.
  const rowsByRef = new Map<string, NormalisedFixture>();
  for (const result of fixtures) {
    const candidates = openByTeams.get(teamKey(result.competition, result.home, result.away)) ?? [];
    const resultKickoff = Date.parse(result.kickoffAt);
    let matchedExisting = false;
    for (const candidate of candidates) {
      const candidateKickoff = Date.parse(candidate.kickoffAt);
      if (
        !Number.isFinite(resultKickoff) ||
        !Number.isFinite(candidateKickoff) ||
        Math.abs(resultKickoff - candidateKickoff) > 15 * 60 * 1000
      )
        continue;
      matchedExisting = true;
      rowsByRef.set(candidate.providerRef, {
        ...result,
        provider: candidate.provider,
        providerRef: candidate.providerRef,
        competition: candidate.competition,
        home: candidate.home,
        away: candidate.away,
        kickoffAt: candidate.kickoffAt,
      });
    }

    // PFIE can verify a result for a match missing from (or mislabelled in) the fixture schedule. The provider
    // only returns publishable decisions; persist a verified terminal result under its own canonical provider_ref
    // instead of silently dropping it because no unresolved row has the same teams and kick-off.
    if (
      !matchedExisting &&
      result.provider === provider.name &&
      result.status !== "scheduled" &&
      result.status !== "live"
    ) {
      rowsByRef.set(result.providerRef, result);
    }
  }
  const rows = [...rowsByRef.values()];
  if (rows.length) await store.upsert(rows);
  return { ok: true, calls, upserted: rows.length, skipped };
}
