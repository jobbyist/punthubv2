/**
 * Daily standings and history sync. Each cron call handles at most `maxJobs` due jobs (standings first, then a
 * one-time history backfill), so a run stays inside the function time limit and the API quotas. Jobs are
 * idempotent: a table replaces the previous one atomically, history rows skip duplicates, and every attempt is
 * recorded in `sync_status` (failures back off and stop after three tries a day).
 */
import { DEFAULT_PFIE_MODELS, parseModelList } from "@/lib/content/config";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { cleanText, domainOf, isBlockedDomain } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";
import { sastDate } from "@/lib/sast";
import { competitions, seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import { extractionRequest, parseObservations, validateObservations } from "./extract";
import { ARCHIVE_SOURCES } from "./archive";
import { archiveJobsDue, runArchiveJob } from "./archive-run";
import { verifyHistory, needsBackfill, type HistoryRow } from "./history";
import { PFIE_SOURCES, tierOf } from "./provider";
import { normaliseTeam } from "./teams";
import {
  STANDINGS_COMPETITIONS,
  STANDINGS_LAUNCH_KEYS,
  chooseTables,
  independentSourceKey,
  parseStandings,
  tableRegression,
  standingsRequest,
  standingsDisagreementHint,
  validateTables,
  type StandingRow,
} from "./standings";
import type { PfieSource } from "./types";

export type TableJob = "standings" | "history" | "season" | "archive";

export interface SyncStatusRow {
  job: TableJob;
  scope: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}

export interface CafGroupStageResult {
  home: string;
  away: string;
  kickoffAt: string;
  homeScore: number;
  awayScore: number;
}

export interface TablesStore {
  /** Verified group-stage results only; preliminary rounds are excluded. */
  cafGroupStageResults?(): Promise<CafGroupStageResult[]>;
  statuses(): Promise<SyncStatusRow[]>;
  /** Latest kick-off (ms) of a finished match per competition name, for matches since `since`. */
  latestFinished(since: Date): Promise<Map<string, number>>;
  knownTeams(competition: string): Promise<string[]>;
  completedCounts(competition: string): Promise<Map<string, number>>;
  currentStandings(key: CompetitionKey, season: string): Promise<StandingRow[]>;
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

const CAF_GROUP_DRAW_URL = "https://www.cafonline.com/caf-confederation-cup/news/totalenergies-caf-confederation-cup-202627-group-stage-draw-produces-exciting-encounters/";
const CAF_GROUPS_2026_27 = {
  A: [
    { name: "Al Ahly", aliases: ["Al Ahly"] },
    { name: "Raja Casablanca", aliases: ["Raja Casablanca"] },
    { name: "ASKO Kara", aliases: ["ASKO Kara", "ASC Kara"] },
    { name: "Primeiro de Agosto", aliases: ["Primeiro de Agosto", "1º de Agosto", "1 de Agosto"] },
  ],
  B: [
    { name: "Royal Armed Forces", aliases: ["Royal Armed Forces", "AS FAR", "FAR Rabat"] },
    { name: "Azam FC", aliases: ["Azam", "Azam FC"] },
    { name: "Al Ahly Tripoli", aliases: ["Al Ahly Tripoli", "Al Ahli Tripoli", "Ahli Tripoli"] },
    { name: "Durban City", aliases: ["Durban City"] },
  ],
  // CAF confirms three clubs; the fourth Group C place is still pending the postponed qualifier.
  C: [
    { name: "Maniema Union", aliases: ["Maniema Union", "AS Maniema Union"] },
    { name: "Singida Black Stars", aliases: ["Singida Black Stars", "Black Stars"] },
    { name: "Red Arrows", aliases: ["Red Arrows"] },
  ],
  D: [
    { name: "USM Alger", aliases: ["USM Alger"] },
    { name: "CS Sfaxien", aliases: ["CS Sfaxien"] },
    { name: "Black Bulls", aliases: ["Black Bulls"] },
    { name: "Real Bamako", aliases: ["Real Bamako", "Réal Bamako", "AS Real de Bamako"] },
  ],
} as const;

export function buildCafGroupStandings(results: CafGroupStageResult[]): StandingRow[] {
  const key = (name: string) => name.normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const teams = new Map<string, { group: string; row: Omit<StandingRow, "position"> }>();
  for (const [group, entries] of Object.entries(CAF_GROUPS_2026_27)) {
    for (const entry of entries) {
      const row = { group, team: entry.name, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      for (const alias of entry.aliases) teams.set(key(alias), { group, row });
    }
  }
  for (const result of results) {
    const home = teams.get(key(result.home));
    const away = teams.get(key(result.away));
    if (!home || !away || home.group !== away.group) continue;
    home.row.played += 1;
    away.row.played += 1;
    home.row.goalsFor += result.homeScore;
    home.row.goalsAgainst += result.awayScore;
    away.row.goalsFor += result.awayScore;
    away.row.goalsAgainst += result.homeScore;
    if (result.homeScore > result.awayScore) {
      home.row.won += 1; home.row.points += 3; away.row.lost += 1;
    } else if (result.homeScore < result.awayScore) {
      away.row.won += 1; away.row.points += 3; home.row.lost += 1;
    } else {
      home.row.drawn += 1; away.row.drawn += 1; home.row.points += 1; away.row.points += 1;
    }
  }
  const output: StandingRow[] = [];
  for (const group of ["A", "B", "C", "D"]) {
    const rows = [...teams.values()].filter((entry) => entry.group === group).map((entry) => entry.row);
    const unique = [...new Map(rows.map((row) => [row.team, row])).values()];
    unique.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || b.won - a.won || a.team.localeCompare(b.team));
    unique.forEach((row, index) => output.push({ ...row, position: index + 1 }));
  }
  return output;
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
const MAX_CHARS = 10_000;
const HISTORY_DAYS = 42;
/** Season backfill reads results in windows this long (about one matchday), so a search lands on the right dates. */
const SEASON_WINDOW_DAYS = 7;
/** A window that has failed this many times in a row is left alone (nothing to find, or no source has it). */
const SEASON_GIVE_UP = 6;

/**
 * Season backfill windows (window start dates, YYYY-MM-DD) for a July-start league: from the start of the previous
 * season up to where the form backfill begins (today - 42 days). Newest first, so the current season fills before
 * last season. Each window is one idempotent job, recorded in sync_status as `season` / `<key>:<start>`.
 */
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const longDate = (iso: string) =>
  `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

/**
 * Search phrasings for a past window. Exact dates, a month name, "weekend round-up" and a few club names steer
 * the search to round-up and archive pages for those days instead of this week's fixtures.
 */
export function seasonArchiveUrls(name: string, start: string): string[] {
  const month = Number(start.slice(5, 7));
  const seasonStart = Number(start.slice(0, 4)) - (month < 7 ? 1 : 0);
  if (name === "UEFA Champions League") {
    return seasonStart === 2026
      ? ["https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-league-phase-fixtures-and-results/"]
      : seasonStart === 2025
        ? ["https://www.uefa.com/uefachampionsleague/news/029c-1e9a2f63fe2d-ebf9ad643892-1000--2025-26-champions-league-all-the-results/"]
        : [];
  }
  if (name === "UEFA Conference League") {
    return seasonStart === 2026
      ? ["https://www.uefa.com/uefaconferenceleague/news/02a8-2174cb200f25-b94693ddff4e-1000--2026-27-conference-league-all-the-league-phase-fixtures-a/"]
      : seasonStart === 2025
        ? ["https://www.uefa.com/uefaconferenceleague/news/029c-1e9ad66c8169-aaecb38941a7-1000--2025-26-conference-league-all-the-league-phase-results/"]
        : [];
  }
  if (name === "CAF Confederation Cup") {
    if (start === "2026-10-16") return ["https://www.cafonline.com/caf-confederation-cup/news/surprise-results-shake-up-totalenergies-caf-confederation-cup-group-stage-race/"];
    if (start === "2026-10-23") return [
      "https://www.cafonline.com/caf-confederation-cup/news/red-arrows-stun-kaizer-chiefs-on-penalties-to-reach-totalenergies-caf-confederation-cup-group-stage/",
      "https://www.cafonline.com/caf-confederation-cup/news/azam-fc-and-real-bamako-advance-to-totalenergies-caf-confederation-cup-group-stage-after-decisive-return-legs/",
    ];
    if (start === "2026-09-04") return ["https://www.cafonline.com/caf-confederation-cup/news/es-zarzis-mark-continental-return-with-3-1-win-as-totalenergies-caf-confederation-cup-preliminary-round-begins/"];
  }
  return [];
}
export function seasonQueries(
  name: string,
  start: string,
  end: string,
  teams: string[] = [],
): string[] {
  const m1 = Number(start.slice(5, 7)) - 1;
  const m2 = Number(end.slice(5, 7)) - 1;
  const y1 = start.slice(0, 4);
  const y2 = end.slice(0, 4);
  const months = m1 === m2 ? `${MONTHS[m1]} ${y1}` : `${MONTHS[m1]} ${y1} ${MONTHS[m2]} ${y2}`;
  const out = [
    `${name} results ${longDate(start)} to ${longDate(end)}`,
    `${name} weekend round-up scores ${months}`,
    `${name} matchday results final scores ${months}`,
  ];
  const clubs = teams.slice(0, 4).join(" ");
  if (clubs) out.push(`${clubs} results ${months}`);

  // UEFA and CAF competitions do not have double-round-robin season matrices.
  // Their official matchday/result articles are the historical source of record.
  const month = Number(start.slice(5, 7));
  const seasonStart = Number(start.slice(0, 4)) - (month < 7 ? 1 : 0);
  const seasonLabel = `${seasonStart}/${String(seasonStart + 1).slice(-2)}`;
  if (name === "UEFA Champions League") {
    out.push(
      "site:uefa.com/uefachampionsleague/news/ " + seasonLabel + " Champions League all results matchday scores " + months,
      "site:uefa.com/uefachampionsleague/news/ Champions League " + seasonLabel + " results " + longDate(start) + " " + longDate(end),
      'site:uefa.com/uefachampionsleague/news/ "2026/27 Champions League: All the league phase fixtures and results"',
      "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-league-phase-fixtures-and-results/",
      "https://www.uefa.com/uefachampionsleague/news/029c-1e9a2f63fe2d-ebf9ad643892-1000--2025-26-champions-league-all-the-results/",
    );
  } else if (name === "UEFA Conference League") {
    out.push(
      "site:uefa.com/uefaconferenceleague/news/ " + seasonLabel + " Conference League all results matchday scores " + months,
      "site:uefa.com/uefaconferenceleague/news/ Conference League " + seasonLabel + " results " + longDate(start) + " " + longDate(end),
      'site:uefa.com/uefaconferenceleague/news/ "2026/27 Conference League: All the league phase fixtures and results"',
      "https://www.uefa.com/uefaconferenceleague/news/02a8-2174cb200f25-b94693ddff4e-1000--2026-27-conference-league-all-the-league-phase-fixtures-a/",
      "https://www.uefa.com/uefaconferenceleague/news/029c-1e9ad66c8169-aaecb38941a7-1000--2025-26-conference-league-all-the-league-phase-results/",
    );
  } else if (name === "CAF Confederation Cup") {
    out.push(
      "site:cafonline.com/caf-confederation-cup/news/ " + seasonLabel + " Confederation Cup results matchday scores " + months,
      "site:cafonline.com/caf-confederation-cup/news/ Confederation Cup results " + longDate(start) + " " + longDate(end),
      'site:cafonline.com/caf-confederation-cup/news/ "Surprise results shake up TotalEnergies CAF Confederation Cup Group Stage race"',
      'site:cafonline.com/caf-confederation-cup/news/ "Full results of first-leg of First Preliminary stage"',
      "https://www.cafonline.com/caf-confederation-cup/news/surprise-results-shake-up-totalenergies-caf-confederation-cup-group-stage-race/",
      "https://www.cafonline.com/caf-confederation-cup/news/red-arrows-stun-kaizer-chiefs-on-penalties-to-reach-totalenergies-caf-confederation-cup-group-stage/",
      "https://www.cafonline.com/caf-confederation-cup/news/azam-fc-and-real-bamako-advance-to-totalenergies-caf-confederation-cup-group-stage-after-decisive-return-legs/",
      "https://www.cafonline.com/caf-confederation-cup/news/es-zarzis-mark-continental-return-with-3-1-win-as-totalenergies-caf-confederation-cup-preliminary-round-begins/",
      "https://www.cafonline.com/caf-confederation-cup/news/full-results-of-first-leg-of-first-preliminary-stage-of-202526-totalenergies-caf-confederation-cup/",
      "https://www.cafonline.com/caf-confederation-cup/news/fixtures-and-results-of-the-second-leg-of-first-preliminary-round-of-202526-totalenergies-caf-confederation-cup/",
      "https://www.cafonline.com/caf-confederation-cup/news/belouizdad-cruise-al-masry-edge-chiefs-in-totalenergies-caf-confederation-cup-group-stage-openers/",
    );
  }
  return out;
}

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
 * Standings refresh on a 12-hour cadence for priority leagues and 24-hour cadence for other configured leagues.
 * A newly confirmed match result can trigger an earlier refresh; the matchday trigger applies that result immediately.
 */
export function standingsDue(
  s: SyncStatusRow | undefined,
  latestFinishedMs: number | undefined,
  now: Date,
  refreshHours = 24,
): boolean {
  if (!retryDue(s, now)) return false;
  if (!s?.lastSuccessAt) return true;
  const last = Date.parse(s.lastSuccessAt);
  if (latestFinishedMs !== undefined && latestFinishedMs > last) return true;
  return now.getTime() - last >= refreshHours * HOUR;
}

export async function runTablesSync(
  deps: TablesDeps,
  opts: { maxJobs?: number; only?: CompetitionKey[]; job?: TableJob } = {},
) {
  const now = deps.now ?? (() => new Date());
  const maxJobs = opts.maxJobs ?? 2;
  const statuses = await deps.store.statuses();
  if (opts.job === "archive") {
    const jobs = archiveJobsDue(deps, statuses, opts.only).slice(0, maxJobs);
    const ran: { job: TableJob; key: string; ok: boolean; detail: string }[] = [];
    for (const j of jobs)
      ran.push({
        job: "archive",
        key: `${j.key}:${j.year}`,
        ...(await runArchiveJob(deps, j.key, j.year)),
      });
    return { due: jobs.length, seasonDue: 0, ran };
  }
  const status = (job: TableJob, scope: string) =>
    statuses.find((s) => s.job === job && s.scope === scope);
  const keys = STANDINGS_LAUNCH_KEYS.filter(
    (k) => STANDINGS_COMPETITIONS[k] && PFIE_SOURCES[k] && (!opts.only || opts.only.includes(k)),
  ) as CompetitionKey[];
  const finished = await deps.store.latestFinished(new Date(now().getTime() - 8 * DAY));

  const due: { job: TableJob; key: CompetitionKey }[] = [];
  for (const key of keys) {
    const c = competitions.find((x) => x.key === key)!;
    if (
      opts.job !== "history" &&
      standingsDue(status("standings", key), finished.get(c.name), now(), STANDINGS_COMPETITIONS[key]!.refreshHours)
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
        // Leagues covered by the archive import no longer need the search-based backfill.
        if (ARCHIVE_SOURCES[key]) continue;
        const s = status("season", `${key}:${w.start}`);
        if (s?.lastSuccessAt || (s?.consecutiveFailures ?? 0) >= SEASON_GIVE_UP) continue;
        if (retryDue(s, now())) season.push({ key, ...w });
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
  preferSearchResults = false,
  preferredUrls: string[] = [],
): Promise<PfieSource[]> {
  const official = PFIE_SOURCES[key]?.official ?? [];
  const hits = await deps.search.search({ objective, queries, maxResults: 20 });
  const configuredPages = (STANDINGS_COMPETITIONS[key]?.pages ?? []).map((url) => ({
    url,
    title: "Configured official standings page",
    excerpt: "",
    publishedAt: null,
  }));
  const preferredPages = preferredUrls.map((url) => ({
    url,
    title: "Preferred official historical results archive",
    excerpt: "",
    publishedAt: null,
  }));
  const preferredUrlSet = new Set(preferredUrls);
  const order = { official: 0, trusted: 1, other: 2 } as const;
  // Historical result queries must win over the configured standings URL for the same official domain.
  // Otherwise domain deduplication keeps the table page and discards the match-results archive page.
  const ranked = (preferSearchResults ? [...preferredPages, ...hits, ...configuredPages] : [...configuredPages, ...hits]).sort(
    (a, b) => order[tierOf(domainOf(a.url), official)] - order[tierOf(domainOf(b.url), official)],
  );
  const sources: PfieSource[] = [];
  const seenDomains = new Set<string>();
  const candidates = [] as typeof ranked;
  const extract = deps.extract;
  if (!extract) return [];
  // Search is discovery only. Current tables require a freshly extracted full page from each independent domain.
  for (const hit of ranked) {
    const domain = domainOf(hit.url);
    const sourceKey = independentSourceKey(domain);
    const tier = tierOf(domain, official);
    if (tier === "other" || isBlockedDomain(domain) || (seenDomains.has(sourceKey) && !preferredUrlSet.has(hit.url))) continue;
    seenDomains.add(sourceKey);
    candidates.push(hit);
    if (candidates.length >= MAX_SOURCES) break;
  }
  // Parallelise the small, bounded set of full-page reads to stay inside the serverless request window.
  const fetched = await Promise.all(
    candidates.map(async (hit) => ({ hit, page: await extract.extract(hit.url).catch(() => null) })),
  );
  for (const { hit, page } of fetched) {
    if (!page?.markdown) continue;
    const domain = domainOf(hit.url);
    const clean = cleanText(page.markdown, MAX_CHARS);
    if (clean.length < 300) continue;
    sources.push({
      index: sources.length + 1,
      url: hit.url,
      domain,
      tier: tierOf(domain, official),
      text: clean,
      publishedAt: hit.publishedAt,
      retrievedAt: new Date().toISOString(),
      via: "extract",
    });
  }
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
  let sources: PfieSource[] = [];
  const modelsUsed = new Set<string>();
  const sourceFailures: string[] = [];
  let sourceDiagnostics: Array<Record<string, unknown>> = [];
  const sourceLabel = (index: number) => {
    const source = sources.find((item) => item.index === index);
    return source ? `${index}@${source.domain}` : String(index);
  };
  try {
    const today = sastDate(now());
    sources = await gatherSources(
      deps,
      key,
      `${c.name} current ${season} league standings table as of ${today}, updated after the latest completed matchday. Return the full table for every team, including played, won, drawn, lost, goals for, goals against and points. Prefer official competition data, then independent established sports data providers. Exclude historical season archives and Wikipedia.`,
      [`${c.name} current standings table ${today}`, `${c.name} league table after latest matchday ${today}`, ...cfg.queries].slice(0, 5),
    );
    if (sources.length === 0) throw new Error("no usable source");
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    let raw = [] as NonNullable<ReturnType<typeof parseStandings>>;
    // Run the bounded first-pass Gemini calls concurrently. If a source fails deterministic validation,
    // retry only that source in a second concurrent wave; this keeps one competition inside the cron timeout.
    const initial = await Promise.all(
      sources.map(async (source) => {
        const answer = await generate(deps, standingsRequest({ competition: c.name, season, sources: [source], groups: cfg.groups, groupNotes: cfg.groupNotes }));
        modelsUsed.add(answer.model);
        const parsed = parseStandings(answer.text);
        const validation = parsed
          ? validateTables(parsed, [source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges)
          : { ...validateTables([], [source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges), rejected: [{ source: source.index, reason: "invalid_json" }] };
        return { source, parsed, validation };
      }),
    );
    const retryCandidates = initial.filter((result) => result.validation.tables.length === 0);
    const retried = await Promise.all(
      retryCandidates.map(async (result) => {
        const hint = result.validation.rejected.map((r) => r.reason).join(", ") || "incomplete_table";
        const answer = await generate(
          deps,
          standingsRequest({ competition: c.name, season, sources: [result.source], retryHint: hint, groups: cfg.groups, groupNotes: cfg.groupNotes }),
        );
        modelsUsed.add(answer.model);
        const parsed = parseStandings(answer.text);
        const validation = parsed
          ? validateTables(parsed, [result.source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges)
          : { ...validateTables([], [result.source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges), rejected: [{ source: result.source.index, reason: "invalid_json_on_retry" }] };
        return { source: result.source, parsed, validation };
      }),
    );
    const retryByIndex = new Map(retried.map((result) => [result.source.index, result]));
    for (const firstPass of initial) {
      const result = retryByIndex.get(firstPass.source.index) ?? firstPass;
      if (result.parsed && result.validation.tables.length > 0) raw.push(...result.parsed);
      else {
        const reason = result.validation.rejected.map((r) => r.reason).join(";") || "incomplete_source_table";
        sourceFailures.push(`${sourceLabel(result.source.index)}:${reason}`);
      }
    }    if (raw.length === 0) throw new Error(`no source returned a validated table (${sourceFailures.join(", ")})`);
    let validation = validateTables(raw, sources, cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges);
    sourceDiagnostics = validation.tables.map((table) => ({
      domain: table.source.domain,
      url: table.source.url,
      group: table.group ?? null,
      tableDate: table.tableDate ?? null,
      rowCount: table.rows.length,
      rows: table.rows.map((row) => ({
        position: row.position,
        team: row.team,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        points: row.points,
      })),
    }));
    let chosenTables = chooseTables(validation.tables, cfg.groups);
    if (!chosenTables && validation.tables.length >= 2) {
      const hint = standingsDisagreementHint(validation.tables);
      if (hint) {
        // Re-read each valid source independently once when full tables disagree; never share peer values.
        const consensusRetries = await Promise.all(
          [...new Set(validation.tables.map((table) => table.source.index))].map(async (sourceIndex) => {
            const source = sources.find((candidate) => candidate.index === sourceIndex);
            if (!source) return null;
            const answer = await generate(deps, standingsRequest({ competition: c.name, season, sources: [source], retryHint: hint, groups: cfg.groups, groupNotes: cfg.groupNotes }));
            modelsUsed.add(answer.model);
            const parsed = parseStandings(answer.text);
            const result = parsed
              ? validateTables(parsed, [source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges)
              : { ...validateTables([], [source], cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges), rejected: [{ source: source.index, reason: "invalid_json_on_consensus_retry" }] };
            return { source, parsed, result };
          }),
        );
        const bySource = new Map<number, NonNullable<ReturnType<typeof parseStandings>>>();
        for (const row of raw) bySource.set(row.source, [...(bySource.get(row.source) ?? []), row]);
        for (const retry of consensusRetries) {
          if (!retry) continue;
          if (retry.parsed && retry.result.tables.length > 0) {
            bySource.set(retry.source.index, retry.parsed.filter((row) => row.source === retry.source.index));
          } else {
            const reason = retry.result.rejected.map((item) => item.reason).join(";") || "consensus_retry_incomplete";
            sourceFailures.push("consensus_retry_" + sourceLabel(retry.source.index) + ":" + reason);
          }
        }
        raw = [...bySource.values()].flat();
        validation = validateTables(raw, sources, cfg.teams, known, now(), key === "ucl", cfg.groups, cfg.teamsPerGroup ?? cfg.teams, cfg.groupTeamRanges);
        sourceDiagnostics = validation.tables.map((table) => ({
      domain: table.source.domain,
      url: table.source.url,
      group: table.group ?? null,
      tableDate: table.tableDate ?? null,
      rowCount: table.rows.length,
      rows: table.rows.map((row) => ({
        position: row.position,
        team: row.team,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        points: row.points,
      })),
    }));
        chosenTables = chooseTables(validation.tables, cfg.groups);
      }
    }
    if (!chosenTables && key === "caf-cc") {
      const groupResults = await deps.store.cafGroupStageResults?.() ?? [];
      if (groupResults.length > 0) {
        const derivedRows = buildCafGroupStandings(groupResults);
        const previousDerived = await deps.store.currentStandings(key, season);
        const regression = tableRegression(derivedRows, previousDerived, false, undefined, true);
        if (!regression && derivedRows.length === 15) {
          const count = await deps.store.replaceStandings({
            key,
            competition: c.name,
            season,
            rows: derivedRows,
            domain: "derived:verified-group-stage-results",
            url: CAF_GROUP_DRAW_URL,
          });
          await deps.store.record("standings", key, true, null, {
            verdict: "derived_verified_group_stage_results",
            provisional: true,
            source: "verified_completed_matches",
            sourceUrl: CAF_GROUP_DRAW_URL,
            groupCount: 4,
            confirmedTeams: count,
            pendingGroupCQualifier: true,
            verifiedMatchesUsed: groupResults.length,
            latestMatch: groupResults.map((item) => item.kickoffAt).sort().at(-1) ?? null,
          });
          return { ok: true, detail: count + " teams across 4 provisional groups calculated from " + groupResults.length + " verified group-stage results" };
        }
      }
    }
    if (!chosenTables) {
      const domains = validation.tables.map((table) => table.source.domain).join(", ");
      const why = [...sourceFailures, ...validation.rejected.map((r) => sourceLabel(r.source) + ":" + r.reason)].join(", ") ||
        String(validation.tables.length) + " unconfirmed tables" + (domains ? " from " + domains : "");
      const disagreement = standingsDisagreementHint(validation.tables);
      throw new Error("no verified table (" + why + (disagreement ? "; " + disagreement : "") + ")");
    }
    const previous = await deps.store.currentStandings(key, season);
    const candidateRows = chosenTables.flatMap((selection) => selection.table.rows);
    const supportingDomains = [...new Set(chosenTables.flatMap((selection) => selection.supportingDomains))].sort();
    const allowVerifiedGoalCorrections = chosenTables.every(
      (selection) => selection.verdict === "two_sources" && selection.supportingDomains.length >= 2,
    );
    const goalCorrections = previous.flatMap((old) => {
      const next = candidateRows.find(
        (row) => (row.group ?? "") === (old.group ?? "") && normaliseTeam(row.team) === normaliseTeam(old.team),
      );
      if (
        !next ||
        next.played !== old.played ||
        next.won !== old.won ||
        next.drawn !== old.drawn ||
        next.lost !== old.lost ||
        next.points !== old.points ||
        (next.goalsFor === old.goalsFor && next.goalsAgainst === old.goalsAgainst)
      ) return [];
      return [{
        team: next.team,
        previousGoalsFor: old.goalsFor,
        currentGoalsFor: next.goalsFor,
        previousGoalsAgainst: old.goalsAgainst,
        currentGoalsAgainst: next.goalsAgainst,
      }];
    });
    const playedCorrections = previous.flatMap((old) => {
      const next = candidateRows.find(
        (row) => (row.group ?? "") === (old.group ?? "") && normaliseTeam(row.team) === normaliseTeam(old.team),
      );
      if (
        !next ||
        old.played - next.played !== 1 ||
        !cfg.allowVerifiedPlayedCorrections?.some((name) => normaliseTeam(name) === normaliseTeam(old.team))
      ) return [];
      return [{
        team: next.team,
        previousPlayed: old.played,
        currentPlayed: next.played,
        previousRecord: `${old.won}-${old.drawn}-${old.lost}`,
        currentRecord: `${next.won}-${next.drawn}-${next.lost}`,
        previousGoals: `${old.goalsFor}-${old.goalsAgainst}`,
        currentGoals: `${next.goalsFor}-${next.goalsAgainst}`,
        previousPoints: old.points,
        currentPoints: next.points,
      }];
    });
    const regression = tableRegression(
      candidateRows,
      previous,
      allowVerifiedGoalCorrections,
      cfg.allowVerifiedPlayedCorrections,
      cfg.allowTeamCountIncrease,
    );
    if (regression) throw new Error(`stale or regressive table rejected (${regression})`);
    const n = await deps.store.replaceStandings({
      key,
      competition: c.name,
      season,
      rows: candidateRows,
      domain: supportingDomains.join(" + "),
      url: chosenTables[0]!.table.source.url,
    });
    await deps.store.record("standings", key, true, null, {
      verdict: "two_sources",
      domain: supportingDomains.join(" + "),
      sourceCount: supportingDomains.length,
      sources: supportingDomains,
      sourceFailures,
      groups: chosenTables.map((selection) => selection.table.group ?? null),
      primarySource: chosenTables[0]!.table.source.url,
      tableDate: chosenTables[0]!.table.tableDate ?? null,
      teams: n,
      models: [...modelsUsed],
      goalCorrectionPolicy: allowVerifiedGoalCorrections ? "two-source-corroborated-goals-only" : "strict",
      playedCorrectionPolicy: cfg.allowVerifiedPlayedCorrections ?? [],
      playedCorrections,
      teamCountExpansionPolicy: cfg.allowTeamCountIncrease ? "one-new-team-when-group-range-allows" : "strict",
      goalCorrections,
    });
    return {
      ok: true,
      detail: `${n} teams across ${chosenTables.length} table(s) verified by ${supportingDomains.length} sources (${supportingDomains.join(", ")})`,
    };
  } catch (e) {
    await deps.store.record("standings", key, false, message(e), {
      sources: sources.map((source) => ({ index: source.index, domain: source.domain, url: source.url, via: source.via, retrievedAt: source.retrievedAt })),
      sourceFailures,
      sourceDiagnostics,
      models: [...modelsUsed],
    }).catch(() => undefined);
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
    let sources = await gatherSources(
      deps,
      key,
      `${c.name} results with final scores for every match played from ${start} to ${end}. ` +
        `Prefer the official competition site and established sports news sites.`,
      seasonQueries(c.name, start, end, known),
      true,
      seasonArchiveUrls(c.name, start),
    );
    if (sources.length === 0) throw new Error("no usable source");
    const request = (list: PfieSource[]) =>
      extractionRequest({
        competition: c.name,
        from: start,
        to: end,
        today: sastDate(now()),
        sources: list,
      });
    let answer = await generate(deps, request(sources));
    let raw = parseObservations(answer.text);
    if (!raw) {
      // Usually a long answer cut off at the output limit: retry once with the three best sources, shorter.
      sources = sources.slice(0, 3).map((x) => ({ ...x, text: x.text.slice(0, 8_000) }));
      answer = await generate(deps, request(sources));
      raw = parseObservations(answer.text);
    }
    if (!raw) throw new Error("extraction answer was not valid JSON");
    const { accepted, rejected } = validateObservations(raw, sources, { from, to, now: now() });
    const { rows, unverified } = verifyHistory(accepted, key, known);
    const inserted = rows.length
      ? await deps.store.insertHistory(rows.map((r) => ({ ...r, competition: c.name })))
      : 0;
    const reasons: Record<string, number> = {};
    for (const r of rejected) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    const meta = {
      verified: rows.length,
      inserted,
      unverified,
      extracted: raw.length,
      accepted: accepted.length,
      rejected: reasons,
      sources: sources.map((s) => s.domain),
      model: answer.model,
    };
    // No verified result is a miss, not a finished window: it is retried (20 min, 40 min, then daily), because a
    // later search can find the second source a single-source score needs.
    if (rows.length === 0) {
      await deps.store.record("season", scope, false, "no verified results on the sources", meta);
      return {
        ok: false,
        detail: `no verified results (${raw.length} extracted, ${accepted.length} accepted, ${unverified} single-source)`,
      };
    }
    await deps.store.record("season", scope, true, null, meta);
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
      true,
      seasonArchiveUrls(c.name, start),
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
