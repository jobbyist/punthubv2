/**
 * Daily standings and history sync. Each cron call handles at most `maxJobs` due jobs (standings first, then a
 * one-time history backfill), so a run stays inside the function time limit and the API quotas. Jobs are
 * idempotent: a table replaces the previous one atomically, history rows skip duplicates, and every attempt is
 * recorded in `sync_status` (failures back off and stop after three tries a day).
 */
import { DEFAULT_PFIE_MODELS, parseModelList } from "@/lib/content/config";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { canonicalUrl, cleanText, domainOf, isBlockedDomain } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";
import { sastDate } from "@/lib/sast";
import { competitions, seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import { extractionRequest, parseObservations, validateObservations } from "./extract";
import { verifyHistory, needsBackfill, type HistoryRow } from "./history";
import { PFIE_SOURCES, tierOf } from "./provider";
import {
  STANDINGS_COMPETITIONS,
  chooseTable,
  parseStandings,
  standingsRequest,
  validateTables,
  type StandingRow,
} from "./standings";
import type { PfieSource } from "./types";

export type TableJob = "standings" | "history" | "season";

export interface SyncStatusRow {
  job: TableJob;
  scope: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}

export interface TablesStore {
  statuses(): Promise<SyncStatusRow[]>;
  /** Latest kick-off (ms) of a finished match per competition name, for matches since `since`. */
  latestFinished(since: Date): Promise<Map<string, number>>;
  knownTeams(competition: string): Promise<string[]>;
  completedCounts(competition: string): Promise<Map<string, number>>;
  replaceStandings(input: {
    key: CompetitionKey;
    competition: string;
    season: string;
    rows: StandingRow[];
    domain: string;
    url: string;
  }): Promise<number>;
  insertHistory(rows: (HistoryRow & { competition: string })[]): Promise<number>;
  record(
    job: TableJob,
    scope: string,
    ok: boolean,
    error: string | null,
    meta: Record<string, unknown>,
  ): Promise<void>;
}

export interface TablesDeps {
  search: SearchProvider;
  extract: ExtractProvider | null;
  llm: LlmProvider;
  store: TablesStore;
  models?: string[];
  usageToday?: () => Promise<Record<string, number>>;
  now?: () => Date;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MAX_SOURCES = 5;
const MAX_CHARS = 14_000;
const HISTORY_DAYS = 42;
/** Season backfill reads results in windows this long (about three matchdays). */
const SEASON_WINDOW_DAYS = 21;

/**
 * Season backfill windows (window start dates, YYYY-MM-DD) for a July-start league: from the start of the previous
 * season up to where the form backfill begins (today - 42 days). Newest first, so the current season fills before
 * last season. Each window is one idempotent job, recorded in sync_status as `season` / `<key>:<start>`.
 */
export function seasonWindows(now: Date): { start: string; end: string }[] {
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const first = Date.UTC(year - 1, 7, 1); // 1 August of the previous season
  const stop = now.getTime() - HISTORY_DAYS * DAY;
  const out: { start: string; end: string }[] = [];
  for (let t = first; t < stop; t += SEASON_WINDOW_DAYS * DAY) {
    const end = Math.min(t + (SEASON_WINDOW_DAYS - 1) * DAY, stop);
    out.push({
      start: new Date(t).toISOString().slice(0, 10),
      end: new Date(end).toISOString().slice(0, 10),
    });
  }
  // Skip the close season (June and July) when there is usually nothing to read.
  return out
    .filter((w) => {
      const m = Number(w.start.slice(5, 7));
      const mEnd = Number(w.end.slice(5, 7));
      return !(m >= 6 && m <= 7 && mEnd >= 6 && mEnd <= 7);
    })
    .reverse();
}

/** Failures wait 20 min, 40 min, then stop until the next day. */
export function retryDue(s: SyncStatusRow | undefined, now: Date): boolean {
  if (!s || !s.lastAttemptAt || s.consecutiveFailures === 0) return true;
  if (s.consecutiveFailures >= 3) {
    return now.getTime() - Date.parse(s.lastAttemptAt) > 20 * HOUR;
  }
  return now.getTime() - Date.parse(s.lastAttemptAt) >= s.consecutiveFailures * 20 * 60_000;
}

/**
 * Standings are refreshed when there is no table yet, when a league match has finished since the last refresh
 * (the matchday trigger keeps it current in between, the refresh restores official tie-breaks), or weekly.
 */
export function standingsDue(
  s: SyncStatusRow | undefined,
  latestFinishedMs: number | undefined,
  now: Date,
): boolean {
  if (!retryDue(s, now)) return false;
  if (!s?.lastSuccessAt) return true;
  const last = Date.parse(s.lastSuccessAt);
  const age = now.getTime() - last;
  if (age < 18 * HOUR) return false;
  return (latestFinishedMs !== undefined && latestFinishedMs > last) || age > 7 * DAY;
}

export async function runTablesSync(
  deps: TablesDeps,
  opts: { maxJobs?: number; only?: CompetitionKey[]; job?: TableJob } = {},
) {
  const now = deps.now ?? (() => new Date());
  const maxJobs = opts.maxJobs ?? 2;
  const statuses = await deps.store.statuses();
  const status = (job: TableJob, scope: string) =>
    statuses.find((s) => s.job === job && s.scope === scope);
  const keys = (Object.keys(STANDINGS_COMPETITIONS) as CompetitionKey[]).filter(
    (k) => PFIE_SOURCES[k] && (!opts.only || opts.only.includes(k)),
  );
  const finished = await deps.store.latestFinished(new Date(now().getTime() - 8 * DAY));

  const due: { job: TableJob; key: CompetitionKey }[] = [];
  for (const key of keys) {
    const c = competitions.find((x) => x.key === key)!;
    if (
      opts.job !== "history" &&
      standingsDue(status("standings", key), finished.get(c.name), now())
    )
      due.push({ job: "standings", key });
  }
  for (const key of keys) {
    if (opts.job === "standings") continue;
    const s = status("history", key);
    if (s?.lastSuccessAt && opts.job !== "history") continue; // one-time backfill
    if (retryDue(s, now())) due.push({ job: "history", key });
  }

  // Season backfill only fills slots the daily jobs leave free, or runs on its own with ?job=season.
  const season: { key: CompetitionKey; start: string; end: string }[] = [];
  if (!opts.job || opts.job === "season") {
    for (const w of seasonWindows(now())) {
      for (const key of keys) {
        const s = status("season", `${key}:${w.start}`);
        if (!s?.lastSuccessAt && retryDue(s, now())) season.push({ key, ...w });
      }
    }
  }

  const report: { job: TableJob; key: string; ok: boolean; detail: string }[] = [];
  const daily = opts.job === "season" ? [] : due.slice(0, maxJobs);
  for (const { job, key } of daily) {
    const r =
      job === "standings" ? await syncStandings(deps, key, now) : await syncHistory(deps, key, now);
    report.push({ job, key, ...r });
  }
  for (const w of season.slice(0, Math.max(0, maxJobs - daily.length))) {
    const r = await syncSeasonWindow(deps, w.key, w.start, w.end, now);
    report.push({ job: "season", key: `${w.key}:${w.start}`, ...r });
  }
  return { due: due.length, seasonDue: season.length, ran: report };
}

async function gatherSources(
  deps: TablesDeps,
  key: CompetitionKey,
  objective: string,
  queries: string[],
): Promise<PfieSource[]> {
  const official = PFIE_SOURCES[key]?.official ?? [];
  const hits = await deps.search.search({ objective, queries, maxResults: 10 });
  const sources: PfieSource[] = [];
  const seen = new Set<string>();
  const add = (url: string, text: string) => {
    const domain = domainOf(url);
    const clean = cleanText(text, MAX_CHARS);
    if (clean.length < 300 || isBlockedDomain(domain) || seen.has(canonicalUrl(url))) return false;
    seen.add(canonicalUrl(url));
    sources.push({ index: 0, url, domain, tier: tierOf(domain, official), text: clean });
    return true;
  };
  // Tables and result lists rarely fit in a search excerpt: read the two best pages in full.
  const order = { official: 0, trusted: 1, other: 2 } as const;
  const ranked = [...hits].sort(
    (a, b) => order[tierOf(domainOf(a.url), official)] - order[tierOf(domainOf(b.url), official)],
  );
  let reads = 0;
  for (const hit of ranked) {
    if (reads >= 2 || !deps.extract) break;
    if (tierOf(domainOf(hit.url), official) === "other") continue;
    reads++;
    const page = await deps.extract.extract(hit.url).catch(() => null);
    if (page) add(hit.url, page.markdown);
  }
  for (const hit of ranked) add(hit.url, hit.excerpt);
  sources.sort((a, b) => order[a.tier] - order[b.tier]);
  sources.splice(MAX_SOURCES);
  sources.forEach((s, i) => (s.index = i + 1));
  return sources;
}

async function generate(deps: TablesDeps, request: Parameters<LlmProvider["generate"]>[1]) {
  const models = deps.models ?? parseModelList(DEFAULT_PFIE_MODELS.join(",")).models;
  const usage = (await deps.usageToday?.().catch(() => ({}))) ?? {};
  const usedToday: Record<string, number> = {};
  for (const m of models) usedToday[m] = (usage as Record<string, number>)[`gemini:${m}`] ?? 0;
  return createModelRouter(deps.llm, { models, usedToday }).generate(request);
}

const message = (e: unknown) =>
  e instanceof AllModelsFailed || e instanceof Error ? e.message.slice(0, 280) : "unexpected error";

async function syncStandings(deps: TablesDeps, key: CompetitionKey, now: () => Date) {
  const c = competitions.find((x) => x.key === key)!;
  const cfg = STANDINGS_COMPETITIONS[key]!;
  const season = String(seasonFor(c.seasonRule, now()));
  try {
    const sources = await gatherSources(
      deps,
      key,
      `${c.name} current league table for the ${season} season with played, won, drawn, lost, goals for, goals ` +
        `against and points for every team. Prefer the official competition site.`,
      cfg.queries,
    );
    if (sources.length === 0) throw new Error("no usable source");
    const answer = await generate(deps, standingsRequest({ competition: c.name, season, sources }));
    const raw = parseStandings(answer.text);
    if (!raw) throw new Error("extraction answer was not valid JSON");
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const { tables, rejected } = validateTables(raw, sources, cfg.teams, known);
    const chosen = chooseTable(tables);
    if (!chosen) {
      const why =
        rejected.map((r) => `${r.source}:${r.reason}`).join(", ") ||
        `${tables.length} unconfirmed tables`;
      throw new Error(`no verified table (${why})`);
    }
    const n = await deps.store.replaceStandings({
      key,
      competition: c.name,
      season,
      rows: chosen.table.rows,
      domain: chosen.table.source.domain,
      url: chosen.table.source.url,
    });
    await deps.store.record("standings", key, true, null, {
      verdict: chosen.verdict,
      domain: chosen.table.source.domain,
      teams: n,
      model: answer.model,
    });
    return {
      ok: true,
      detail: `${n} teams from ${chosen.table.source.domain} (${chosen.verdict})`,
    };
  } catch (e) {
    await deps.store.record("standings", key, false, message(e), {}).catch(() => undefined);
    return { ok: false, detail: message(e) };
  }
}

async function syncSeasonWindow(
  deps: TablesDeps,
  key: CompetitionKey,
  start: string,
  end: string,
  now: () => Date,
) {
  const c = competitions.find((x) => x.key === key)!;
  const scope = `${key}:${start}`;
  const from = new Date(`${start}T00:00:00+02:00`);
  const to = new Date(`${end}T23:59:59+02:00`);
  try {
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const sources = await gatherSources(
      deps,
      key,
      `${c.name} results with final scores for every match played from ${start} to ${end}. ` +
        `Prefer the official competition site and established sports news sites.`,
      [`${c.name} results ${start} to ${end}`, `${c.name} scores ${start.slice(0, 7)}`],
    );
    if (sources.length === 0) throw new Error("no usable source");
    const answer = await generate(
      deps,
      extractionRequest({
        competition: c.name,
        from: start,
        to: end,
        today: sastDate(now()),
        sources,
      }),
    );
    const raw = parseObservations(answer.text);
    if (!raw) throw new Error("extraction answer was not valid JSON");
    const { accepted } = validateObservations(raw, sources, { from, to, now: now() });
    const { rows, unverified } = verifyHistory(accepted, key, known);
    const inserted = rows.length
      ? await deps.store.insertHistory(rows.map((r) => ({ ...r, competition: c.name })))
      : 0;
    await deps.store.record("season", scope, true, null, {
      verified: rows.length,
      inserted,
      unverified,
      model: answer.model,
    });
    return {
      ok: true,
      detail: `${inserted} new results (${rows.length} verified, ${unverified} unconfirmed)`,
    };
  } catch (e) {
    await deps.store.record("season", scope, false, message(e), {}).catch(() => undefined);
    return { ok: false, detail: message(e) };
  }
}

async function syncHistory(deps: TablesDeps, key: CompetitionKey, now: () => Date) {
  const c = competitions.find((x) => x.key === key)!;
  const to = now();
  const from = new Date(to.getTime() - HISTORY_DAYS * DAY);
  try {
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const counts = await deps.store.completedCounts(c.name).catch(() => new Map<string, number>());
    if (known.length > 0 && !needsBackfill(counts, known)) {
      await deps.store.record("history", key, true, null, { skipped: "enough results recorded" });
      return { ok: true, detail: "enough results already recorded" };
    }
    const sources = await gatherSources(
      deps,
      key,
      `${c.name} results with final scores for every match played from ${sastDate(from)} to ${sastDate(to)}. ` +
        `Prefer the official competition site and established sports news sites.`,
      [`${c.name} results`, `${c.name} scores last matchdays`],
    );
    if (sources.length === 0) throw new Error("no usable source");
    const answer = await generate(
      deps,
      extractionRequest({
        competition: c.name,
        from: sastDate(from),
        to: sastDate(to),
        today: sastDate(to),
        sources,
      }),
    );
    const raw = parseObservations(answer.text);
    if (!raw) throw new Error("extraction answer was not valid JSON");
    const { accepted } = validateObservations(raw, sources, { from, to, now: to });
    const { rows, unverified } = verifyHistory(accepted, key, known);
    const inserted = rows.length
      ? await deps.store.insertHistory(rows.map((r) => ({ ...r, competition: c.name })))
      : 0;
    await deps.store.record("history", key, true, null, {
      verified: rows.length,
      inserted,
      unverified,
      model: answer.model,
    });
    return {
      ok: true,
      detail: `${inserted} new results (${rows.length} verified, ${unverified} unconfirmed)`,
    };
  } catch (e) {
    await deps.store.record("history", key, false, message(e), {}).catch(() => undefined);
    return { ok: false, detail: message(e) };
  }
}
