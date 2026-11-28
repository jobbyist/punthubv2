/**
 * Daily standings and rolling history sync. Each cron call handles a bounded mix of due jobs, reserving a slot
 * for overdue history so standings refreshes cannot starve it. Standings snapshots replace only their own season;
 * history rows upsert corrected scores; every attempt is recorded in `sync_status` with failure back-off.
 */
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { cleanText, domainOf, isBlockedDomain } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";
import { sastDate } from "@/lib/sast";
import { competitions, seasonFor, type CompetitionKey } from "@/lib/sports/competitions";

import { extractionRequest, parseObservations, validateObservations } from "./extract";
import { ARCHIVE_SOURCES, archiveUrls } from "./archive";
import { archiveJobsDue, runArchiveJob } from "./archive-run";
import { verifyHistory, type HistoryRow } from "./history";
import { isPfieLaunchCompetition } from "./launch-scope";
import { PFIE_SOURCES, tierOf } from "./provider";
import { normaliseTeam } from "./teams";
import { modelQuotaOptions } from "./usage";
import {
  STANDINGS_COMPETITIONS,
  STANDINGS_LAUNCH_KEYS,
  chooseTables,
  independentSourceKey,
  parseStandings,
  parseStandingsMarkdown,
  extractStandingsTableDate,
  normaliseStandingsGroup,
  tableRegression,
  standingsRequest,
  standingsDisagreementHint,
  validateTables,
  type StandingRow,
} from "./standings";
import type { Observation, PfieSource } from "./types";

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

const CAF_GROUP_DRAW_URL =
  "https://www.cafonline.com/caf-confederation-cup/news/totalenergies-caf-confederation-cup-202627-group-stage-draw-produces-exciting-encounters/";
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
  const key = (name: string) =>
    name
      .normalize("NFKD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const teams = new Map<string, { group: string; row: Omit<StandingRow, "position"> }>();
  for (const [group, entries] of Object.entries(CAF_GROUPS_2026_27)) {
    for (const entry of entries) {
      const row = {
        group,
        team: entry.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      };
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
      home.row.won += 1;
      home.row.points += 3;
      away.row.lost += 1;
    } else if (result.homeScore < result.awayScore) {
      away.row.won += 1;
      away.row.points += 3;
      home.row.lost += 1;
    } else {
      home.row.drawn += 1;
      away.row.drawn += 1;
      home.row.points += 1;
      away.row.points += 1;
    }
  }
  const output: StandingRow[] = [];
  for (const group of ["A", "B", "C", "D"]) {
    const rows = [...teams.values()]
      .filter((entry) => entry.group === group)
      .map((entry) => entry.row);
    const unique = [...new Map(rows.map((row) => [row.team, row])).values()];
    unique.sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        b.won - a.won ||
        a.team.localeCompare(b.team),
    );
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
const MAX_SEASON_SOURCES = 3;
const THREE_SEASON_HISTORY_KEYS = new Set<CompetitionKey>(["ucl", "uecl", "caf-cc"]);
// Parallel Responses has a 20,000-character combined input/instructions ceiling. Keep three extracted sources below it.
const MAX_CHARS = 4_500;
const HISTORY_DAYS = 42;
/** Season backfill reads results in windows this long (about one matchday), so a search lands on the right dates. */
const SEASON_WINDOW_DAYS = 7;
/** A window that has failed this many times in a row is left alone (nothing to find, or no source has it). */
const SEASON_GIVE_UP = 6;
/** Detect whether an extracted page contains final-score evidence worth one bounded history retry. */
export function hasHistoryResultEvidence(text: string): boolean {
  const clean = text.replace(/\\/g, "").replace(/&nbsp;/gi, " ");
  return (
    /\b(?:FT|full[- ]?time|final|finished)\b/i.test(clean) ||
    /\b\d{1,2}\s*[–-]\s*\d{1,2}\b/.test(clean)
  );
}

function historySourceDiagnostics(sources: PfieSource[]): Record<string, unknown>[] {
  return sources.map((source) => {
    const text = source.text ?? "";
    const marker = /\b(?:FT|full[- ]?time|final|finished)\b|\b\d{1,2}\s*[–-]\s*\d{1,2}\b/i.exec(text);
    const center = marker?.index ?? 0;
    return {
      domain: source.domain,
      url: source.url,
      length: text.length,
      scoreEvidence: hasHistoryResultEvidence(text),
      excerpt: text.slice(Math.max(0, center - 250), Math.min(text.length, center + 750)),
    };
  });
}


/** An empty extraction is not proof that a date window had no matches. */
export function isConfirmedNoMatchesInWindow(result: {
  parsedSources: number;
  parseFailures: number;
  extracted: number;
  reasons: Record<string, number>;
}): boolean {
  return (
    result.parsedSources > 0 &&
    result.parseFailures === 0 &&
    result.extracted > 0 &&
    result.reasons["outside_date_range"] === result.extracted &&
    Object.keys(result.reasons).every((reason) => reason === "outside_date_range")
  );
}

/**
 * Season backfill windows (window start dates, YYYY-MM-DD) for a July-start league. The three launch cup
 * competitions (UCL, UECL and CAF CC) retain three seasons of history; other non-archive competitions retain
 * two. Windows are newest first and each is an idempotent `season` / `<key>:<start>` job.
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
    const official =
      seasonStart === 2026
        ? ["https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-league-phase-fixtures-and-results/"]
        : seasonStart === 2025
          ? ["https://www.uefa.com/uefachampionsleague/news/029c-1e9a2f63fe2d-ebf9ad643892-1000--2025-26-champions-league-all-the-results/"]
          : [];
    return [
      ...official,
      "https://www.bbc.com/sport/football/champions-league/scores-fixtures",
      "https://www.skysports.com/champions-league-scores-fixtures",
      "https://fbref.com/en/comps/8/schedule/Champions-League-Scores-and-Fixtures",
    ];
  }
  if (name === "UEFA Conference League") {
    const official =
      seasonStart === 2026
        ? ["https://www.uefa.com/uefaconferenceleague/news/02a8-2174cb200f25-b94693ddff4e-1000--2026-27-conference-league-all-the-league-phase-fixtures-a/"]
        : seasonStart === 2025
          ? ["https://www.uefa.com/uefaconferenceleague/news/029c-1e9ad66c8169-aaecb38941a7-1000--2025-26-conference-league-all-the-league-phase-results/"]
          : [];
    return [
      ...official,
      "https://www.bbc.com/sport/football/europa-conference-league/scores-fixtures",
      "https://www.espn.com/soccer/scoreboard/_/league/uefa.europa.conf",
    ];
  }
  if (name === "CAF Confederation Cup") {
    const official =
      start === "2026-10-16"
        ? [
            "https://www.cafonline.com/caf-confederation-cup/news/surprise-results-shake-up-totalenergies-caf-confederation-cup-group-stage-race/",
          ]
        : start === "2026-10-23"
          ? [
              "https://www.cafonline.com/caf-confederation-cup/news/red-arrows-stun-kaizer-chiefs-on-penalties-to-reach-totalenergies-caf-confederation-cup-group-stage/",
              "https://www.cafonline.com/caf-confederation-cup/news/azam-fc-and-real-bamako-advance-to-totalenergies-caf-confederation-cup-group-stage-after-decisive-return-legs/",
            ]
          : start === "2026-09-04"
            ? [
                "https://www.cafonline.com/caf-confederation-cup/news/es-zarzis-mark-continental-return-with-3-1-win-as-totalenergies-caf-confederation-cup-preliminary-round-begins/",
              ]
            : [];
    return [
      ...official,
      "https://www.vavel.com/en-us/data/caf-confederation-cup/results",
      "https://foot-africa.com/en/leagues/international/caf-confederations-cup/",
    ];
  }
  const competition = competitions.find((item) => item.name === name);
  const archiveSource = competition && isPfieLaunchCompetition(competition.key)
    ? ARCHIVE_SOURCES[competition.key]
    : undefined;
  if (archiveSource) {
    const month = Number(start.slice(5, 7));
    const seasonStart = Number(start.slice(0, 4)) - (month < 7 ? 1 : 0);
    const urls = archiveUrls(archiveSource, seasonStart);
    const skyResults: Partial<Record<CompetitionKey, string>> = {
      epl: "https://www.skysports.com/premier-league-scores-fixtures",
      championship: "https://www.skysports.com/championship-scores-fixtures",
      laliga: "https://www.skysports.com/la-liga-scores-fixtures",
      seriea: "https://www.skysports.com/serie-a-scores-fixtures",
      bundesliga: "https://www.skysports.com/bundesliga-scores-fixtures",
      ligue1: "https://www.skysports.com/ligue-1-scores-fixtures",
    };
    return [
      urls.fbref,
      ...(skyResults[competition.key] ? [skyResults[competition.key]!] : []),
      urls.wikipedia,
    ];
  }
  return [];
}
/** If the competition's own results page is available, use it alone rather than mixing in conflicting secondary score feeds. */
export function preferAuthoritativeSources<T extends { url: string }>(
  hits: T[],
  official: string[],
  allowSecondary = false,
): T[] {
  if (allowSecondary) return hits;
  const authoritative = hits.filter((hit) => tierOf(domainOf(hit.url), official) === "official");
  return authoritative.length > 0 ? authoritative : hits;
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
      "site:uefa.com/uefachampionsleague/news/ " +
        seasonLabel +
        " Champions League all results matchday scores " +
        months,
      "site:uefa.com/uefachampionsleague/news/ Champions League " +
        seasonLabel +
        " results " +
        longDate(start) +
        " " +
        longDate(end),
      'site:uefa.com/uefachampionsleague/news/ "2026/27 Champions League: All the league phase fixtures and results"',
      "https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-league-phase-fixtures-and-results/",
      "https://www.uefa.com/uefachampionsleague/news/029c-1e9a2f63fe2d-ebf9ad643892-1000--2025-26-champions-league-all-the-results/",
      `site:bbc.com/sport/football/champions-league/scores-fixtures ${longDate(start)} ${seasonLabel}`,
      `site:fbref.com/en/comps/8/schedule/Champions-League-Scores-and-Fixtures ${seasonLabel} results`,
    );
  } else if (name === "UEFA Conference League") {
    out.push(
      "site:uefa.com/uefaconferenceleague/news/ " +
        seasonLabel +
        " Conference League all results matchday scores " +
        months,
      "site:uefa.com/uefaconferenceleague/news/ Conference League " +
        seasonLabel +
        " results " +
        longDate(start) +
        " " +
        longDate(end),
      'site:uefa.com/uefaconferenceleague/news/ "2026/27 Conference League: All the league phase fixtures and results"',
      "https://www.uefa.com/uefaconferenceleague/news/02a8-2174cb200f25-b94693ddff4e-1000--2026-27-conference-league-all-the-league-phase-fixtures-a/",
      "https://www.uefa.com/uefaconferenceleague/news/029c-1e9ad66c8169-aaecb38941a7-1000--2025-26-conference-league-all-the-league-phase-results/",
      `site:bbc.com/sport/football/europa-conference-league/scores-fixtures ${longDate(start)} ${seasonLabel}`,
      `site:espn.com/soccer/scoreboard/_/league/uefa.europa.conf ${longDate(start)} ${seasonLabel}`,
    );
  } else if (name === "CAF Confederation Cup") {
    out.push(
      "site:cafonline.com/caf-confederation-cup/news/ " +
        seasonLabel +
        " Confederation Cup results matchday scores " +
        months,
      "site:cafonline.com/caf-confederation-cup/news/ Confederation Cup results " +
        longDate(start) +
        " " +
        longDate(end),
      'site:cafonline.com/caf-confederation-cup/news/ "Surprise results shake up TotalEnergies CAF Confederation Cup Group Stage race"',
      'site:cafonline.com/caf-confederation-cup/news/ "Full results of first-leg of First Preliminary stage"',
      "https://www.cafonline.com/caf-confederation-cup/news/surprise-results-shake-up-totalenergies-caf-confederation-cup-group-stage-race/",
      "https://www.cafonline.com/caf-confederation-cup/news/red-arrows-stun-kaizer-chiefs-on-penalties-to-reach-totalenergies-caf-confederation-cup-group-stage/",
      "https://www.cafonline.com/caf-confederation-cup/news/azam-fc-and-real-bamako-advance-to-totalenergies-caf-confederation-cup-group-stage-after-decisive-return-legs/",
      "https://www.cafonline.com/caf-confederation-cup/news/es-zarzis-mark-continental-return-with-3-1-win-as-totalenergies-caf-confederation-cup-preliminary-round-begins/",
      "https://www.cafonline.com/caf-confederation-cup/news/full-results-of-first-leg-of-first-preliminary-stage-of-202526-totalenergies-caf-confederation-cup/",
      "https://www.cafonline.com/caf-confederation-cup/news/fixtures-and-results-of-the-second-leg-of-first-preliminary-round-of-202526-totalenergies-caf-confederation-cup/",
      "https://www.cafonline.com/caf-confederation-cup/news/belouizdad-cruise-al-masry-edge-chiefs-in-totalenergies-caf-confederation-cup-group-stage-openers/",
      `site:vavel.com/en-us/data/caf-confederation-cup/results ${months}`,
      `site:foot-africa.com/en/leagues/international/caf-confederations-cup ${months}`,
      `site:english.ahram.org.eg CAF Confederation Cup results ${months}`,
    );
  }
  return out;
}

export function seasonWindows(now: Date, key?: CompetitionKey): { start: string; end: string }[] {
  const year = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const seasonsBack = key && THREE_SEASON_HISTORY_KEYS.has(key) ? 2 : 1;
  const first = Date.UTC(year - seasonsBack, 7, 1); // 1 August of the oldest retained season
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
  force = false,
): boolean {
  if (force) return true;
  if (!retryDue(s, now)) return false;
  if (!s?.lastSuccessAt) return true;
  const last = Date.parse(s.lastSuccessAt);
  if (latestFinishedMs !== undefined && latestFinishedMs > last) return true;
  return now.getTime() - last >= refreshHours * HOUR;
}

/** History gets a rolling refresh every 72 hours; failures retain the existing back-off. */
export function historyRefreshDue(
  s: SyncStatusRow | undefined,
  now: Date,
  refreshHours = 72,
): boolean {
  if (!retryDue(s, now)) return false;
  if (!s?.lastSuccessAt) return true;
  return now.getTime() - Date.parse(s.lastSuccessAt) >= refreshHours * HOUR;
}

/** A stale persisted table is not a valid regression baseline for a newly verified season snapshot. */
export function isStandingsBaselineFresh(
  lastSuccessAt: string | null | undefined,
  now: Date,
  maxAgeHours = 72,
): boolean {
  if (!lastSuccessAt) return false;
  const age = now.getTime() - Date.parse(lastSuccessAt);
  return Number.isFinite(age) && age >= 0 && age <= maxAgeHours * HOUR;
}

export async function runTablesSync(
  deps: TablesDeps,
  opts: { maxJobs?: number; only?: CompetitionKey[]; job?: TableJob; force?: boolean } = {},
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
      standingsDue(
        status("standings", key),
        finished.get(c.name),
        now(),
        STANDINGS_COMPETITIONS[key]!.refreshHours,
        opts.force,
      )
    )
      due.push({ job: "standings", key });
  }
  for (const key of keys) {
    if (opts.job === "standings") continue;
    const s = status("history", key);
    const isDue = opts.job === "history" && opts.force ? retryDue(s, now()) : historyRefreshDue(s, now());
    if (isDue) due.push({ job: "history", key });
  }

  // Season backfill only fills slots the daily jobs leave free, or runs on its own with ?job=season.
  const season: { key: CompetitionKey; start: string; end: string }[] = [];
  if (!opts.job || opts.job === "season") {
    const windows = keys
      .filter((key) => !ARCHIVE_SOURCES[key])
      .flatMap((key) => seasonWindows(now(), key).map((window) => ({ key, ...window })))
      .sort((a, b) => b.start.localeCompare(a.start));
    for (const window of windows) {
      const s = status("season", `${window.key}:${window.start}`);
      if (s?.lastSuccessAt || (s?.consecutiveFailures ?? 0) >= SEASON_GIVE_UP) continue;
      if (retryDue(s, now())) season.push(window);
    }
  }

  const report: { job: TableJob; key: string; ok: boolean; detail: string }[] = [];
  const standingsDueJobs = due.filter((item) => item.job === "standings");
  const historyDueJobs = due
    .filter((item) => item.job === "history")
    .sort((a, b) => {
      const last = (key: CompetitionKey) => status("history", key)?.lastSuccessAt ?? "";
      return last(a.key).localeCompare(last(b.key));
    });
  let daily: { job: TableJob; key: CompetitionKey }[] = [];
  if (opts.job === "history") {
    daily = historyDueJobs.slice(0, maxJobs);
  } else if (opts.job === "standings") {
    daily = standingsDueJobs.slice(0, maxJobs);
  } else if (opts.job !== "season") {
    // Reserve one slot for the oldest-due rolling history job so standings refreshes cannot starve it.
    if (standingsDueJobs.length) daily.push(standingsDueJobs.shift()!);
    if (historyDueJobs.length && daily.length < maxJobs) daily.push(historyDueJobs.shift()!);
    while (daily.length < maxJobs && (standingsDueJobs.length || historyDueJobs.length)) {
      if (standingsDueJobs.length) daily.push(standingsDueJobs.shift()!);
      else if (historyDueJobs.length) daily.push(historyDueJobs.shift()!);
    }
  }
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


/** Prefer result-specific archive URLs over configured standings pages for rolling history and season backfills. */
export function rankSyncSourceCandidates<T extends { url: string }>(
  preferSearchResults: boolean,
  preferredPages: T[],
  hits: T[],
  configuredPages: T[],
  official: string[],
): T[] {
  const order = { official: 0, trusted: 1, other: 2 } as const;
  const preferredUrls = new Set(preferredPages.map((page) => page.url));
  const candidates = preferSearchResults
    ? [...preferredPages, ...hits]
    : [...configuredPages, ...hits];
  return candidates.sort((a, b) => {
    if (preferSearchResults) {
      const aPreferred = preferredUrls.has(a.url);
      const bPreferred = preferredUrls.has(b.url);
      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
    }
    return order[tierOf(domainOf(a.url), official)] - order[tierOf(domainOf(b.url), official)];
  });
}

async function gatherSources(
  deps: TablesDeps,
  key: CompetitionKey,
  objective: string,
  queries: string[],
  preferSearchResults = false,
  preferredUrls: string[] = [],
  allowSecondary = false,
  maxSources = MAX_SOURCES,
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
  // History and season backfills must not consume a slot on a configured standings-only page.
  // Keep explicit results/archive URLs ahead of discovery hits; standings sync retains official-page priority.
  const ranked = rankSyncSourceCandidates(
    preferSearchResults,
    preferredPages,
    hits,
    configuredPages,
    official,
  );
  // An official competition results page is authoritative. Mixing in secondary pages can introduce stale or
  // differently scoped scorelines that make otherwise verified official results look contradictory.
  const sourcePool = preferAuthoritativeSources(ranked, official, allowSecondary);
  const sources: PfieSource[] = [];
  const seenDomains = new Set<string>();
  const candidates = [] as typeof ranked;
  const extract = deps.extract;
  if (!extract) return [];
  // Search is discovery only. Current tables require a freshly extracted full page from each independent domain.
  for (const hit of sourcePool) {
    const domain = domainOf(hit.url);
    const sourceKey = independentSourceKey(domain);
    const tier = tierOf(domain, official);
    if (
      tier === "other" ||
      isBlockedDomain(domain) ||
      seenDomains.has(sourceKey)
    )
      continue;
    seenDomains.add(sourceKey);
    candidates.push(hit);
    // History pages vary in quality (some extractors return a cookie wall or a standings-only page).
    // Read two bounded fallbacks, then keep only pages that visibly contain result evidence.
    const candidateLimit = preferSearchResults ? Math.min(8, maxSources + 2) : maxSources;
    if (candidates.length >= candidateLimit) break;
  }
  // Parallelise the small, bounded set of full-page reads to stay inside the serverless request window.
  const fetched = await Promise.all(
    candidates.map(async (hit) => ({
      hit,
      page: await extract.extract(hit.url).catch(() => null),
    })),
  );
  for (const { hit, page } of fetched) {
    if (!page?.markdown) continue;
    const domain = domainOf(hit.url);
    const clean = cleanText(page.markdown, MAX_CHARS);
    if (clean.length < 300) continue;
    if (preferSearchResults && !hasHistoryResultEvidence(clean)) continue;
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
    if (sources.length >= maxSources) break;
  }
  return sources;
}

async function generate(
  deps: TablesDeps,
  request: Parameters<LlmProvider["generate"]>[1],
  modelOverride?: string[],
) {
  const models = modelOverride ?? deps.models ?? ["parallel-low"];
  const usage = (await deps.usageToday?.().catch(() => ({}))) ?? {};
  const quota = modelQuotaOptions(models, usage as Record<string, number>);
  return createModelRouter(deps.llm, { models, ...quota }).generate(request);
}

const message = (e: unknown) =>
  e instanceof AllModelsFailed || e instanceof Error ? e.message.slice(0, 280) : "unexpected error";

/** Secondary publishers are enabled only for the ten pre-launch standings competitions. */
export function shouldIncludeSecondaryStandingsSources(key: CompetitionKey): boolean {
  return STANDINGS_LAUNCH_KEYS.some((launchKey) => launchKey === key);
}

async function syncStandings(deps: TablesDeps, key: CompetitionKey, now: () => Date) {
  const c = competitions.find((x) => x.key === key)!;
  const cfg = STANDINGS_COMPETITIONS[key]!;
  const season = String(seasonFor(c.seasonRule, now()));
  let sources: PfieSource[] = [];
  const modelsUsed = new Set<string>();
  const sourceFailures: string[] = [];
  let sourceDiagnostics: Array<Record<string, unknown>> = [];
  let usedSecondaryFallback = false;
  let primarySources: PfieSource[] = [];
  const sourceLabel = (index: number) => {
    const source = sources.find((item) => item.index === index);
    return source ? `${index}@${source.domain}` : String(index);
  };
  try {
    const today = sastDate(now());
    const objective = `${c.name} current ${season} league standings table as of ${today}, updated after the latest completed matchday. Return the full table for every team, including played, won, drawn, lost, goals for, goals against and points. Prefer official competition data, then independent established sports data providers. Exclude historical season archives and Wikipedia.`;
    const queries = [
      `${c.name} current standings table ${today}`,
      `${c.name} league table after latest matchday ${today}`,
      ...cfg.queries,
    ].slice(0, 5);
    // Only the ten launch competitions may expand source discovery to trusted independent publishers.
    // Deferred competitions (including Saudi Pro League and Liga Portugal) remain untouched until post-launch.
    // Existing validation still requires official authority or independent-source consensus before persistence.
    sources = await gatherSources(
      deps,
      key,
      objective,
      queries,
      false,
      [],
      shouldIncludeSecondaryStandingsSources(key),
    );
    primarySources = [...sources];
    if (sources.length === 0) throw new Error("no usable source");
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const stampPageDate = (
      rows: NonNullable<ReturnType<typeof parseStandings>> | null,
      source: PfieSource,
    ) => {
      if (!rows) return rows;
      const pageDate = extractStandingsTableDate(source.text, now());
      return rows.map((row) => ({
        ...row,
        group: normaliseStandingsGroup(row.group, c.name, Boolean(c.groupNames?.length)),
        ...(pageDate ? { tableDate: pageDate.date, tableDateQuote: pageDate.quote } : {}),
      }));
    };
    let raw = [] as NonNullable<ReturnType<typeof parseStandings>>;
    // Run the bounded first-pass Parallel Responses calls concurrently. If a source fails deterministic validation,
    // retry only that source in a second concurrent wave; this keeps one competition inside the cron timeout.
    const initial = await Promise.all(
      sources.map(async (source) => {
        const deterministic =
          !cfg.groups?.length && source.via === "extract"
            ? stampPageDate(parseStandingsMarkdown(source.text, source.index), source)
            : null;
        if (deterministic) {
          const validation = validateTables(
            deterministic,
            [source],
            cfg.teams,
            known,
            now(),
            key === "ucl",
            cfg.groups,
            cfg.teamsPerGroup ?? cfg.teams,
            cfg.groupTeamRanges,
          );
          if (validation.tables.length > 0) return { source, parsed: deterministic, validation };
        }
        const answer = await generate(
          deps,
          standingsRequest({
            competition: c.name,
            season,
            sources: [source],
            ...(cfg.groups ? { groups: cfg.groups } : {}),
            ...(cfg.groupNotes ? { groupNotes: cfg.groupNotes } : {}),
          }),
        );
        modelsUsed.add(answer.model);
        const parsed = stampPageDate(parseStandings(answer.text) ?? deterministic, source);
        const validation = parsed
          ? validateTables(
              parsed,
              [source],
              cfg.teams,
              known,
              now(),
              key === "ucl",
              cfg.groups,
              cfg.teamsPerGroup ?? cfg.teams,
              cfg.groupTeamRanges,
            )
          : {
              ...validateTables(
                [],
                [source],
                cfg.teams,
                known,
                now(),
                key === "ucl",
                cfg.groups,
                cfg.teamsPerGroup ?? cfg.teams,
                cfg.groupTeamRanges,
              ),
              rejected: [{ source: source.index, reason: "invalid_json" }],
            };
        return { source, parsed, validation };
      }),
    );
    const retryCandidates = initial.filter((result) => result.validation.tables.length === 0);
    const retried = await Promise.all(
      retryCandidates.map(async (result) => {
        const hint =
          result.validation.rejected.map((r) => r.reason).join(", ") || "incomplete_table";
        // Championship is the only launch table still failing structured extraction after two low-effort passes.
        // Use a bounded Medium-first retry for that one source pass, then fall back to Low if Medium is quota-blocked.
        const retryModels =
          key === "championship" ? ["parallel-medium", "parallel-low"] : undefined;
        const answer = await generate(
          deps,
          standingsRequest({
            competition: c.name,
            season,
            sources: [result.source],
            retryHint: hint,
            ...(cfg.groups ? { groups: cfg.groups } : {}),
            ...(cfg.groupNotes ? { groupNotes: cfg.groupNotes } : {}),
          }),
          retryModels,
        );
        modelsUsed.add(answer.model);
        // Preserve the deterministic page parse through the retry path. A failed model response must
        // never erase an already parsed source table; retaining it also exposes the real validation reason
        // (team count, arithmetic, identity or freshness) instead of mislabelling it as invalid JSON.
        const deterministicRetry =
          !cfg.groups?.length && result.source.via === "extract"
            ? stampPageDate(parseStandingsMarkdown(result.source.text, result.source.index), result.source)
            : null;
        const parsed =
          stampPageDate(parseStandings(answer.text), result.source) ?? deterministicRetry;
        const validation = parsed
          ? validateTables(
              parsed,
              [result.source],
              cfg.teams,
              known,
              now(),
              key === "ucl",
              cfg.groups,
              cfg.teamsPerGroup ?? cfg.teams,
              cfg.groupTeamRanges,
            )
          : {
              ...validateTables(
                [],
                [result.source],
                cfg.teams,
                known,
                now(),
                key === "ucl",
                cfg.groups,
                cfg.teamsPerGroup ?? cfg.teams,
                cfg.groupTeamRanges,
              ),
              rejected: [{ source: result.source.index, reason: "invalid_json_on_retry" }],
            };
        return { source: result.source, parsed, validation };
      }),
    );
    const retryByIndex = new Map(retried.map((result) => [result.source.index, result]));
    for (const firstPass of initial) {
      const result = retryByIndex.get(firstPass.source.index) ?? firstPass;
      if (result.parsed && result.validation.tables.length > 0) raw.push(...result.parsed);
      else {
        const reason =
          result.validation.rejected.map((r) => r.reason).join(";") || "incomplete_source_table";
        sourceFailures.push(`${sourceLabel(result.source.index)}:${reason}`);
      }
    }
    let validation = validateTables(
      raw,
      sources,
      cfg.teams,
      known,
      now(),
      key === "ucl",
      cfg.groups,
      cfg.teamsPerGroup ?? cfg.teams,
      cfg.groupTeamRanges,
    );
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
          [...new Set(validation.tables.map((table) => table.source.index))].map(
            async (sourceIndex) => {
              const source = sources.find((candidate) => candidate.index === sourceIndex);
              if (!source) return null;
              const answer = await generate(
                deps,
                standingsRequest({
                  competition: c.name,
                  season,
                  sources: [source],
                  retryHint: hint,
                  ...(cfg.groups ? { groups: cfg.groups } : {}),
                  ...(cfg.groupNotes ? { groupNotes: cfg.groupNotes } : {}),
                }),
              );
              modelsUsed.add(answer.model);
              const parsed = stampPageDate(parseStandings(answer.text), source);
              const result = parsed
                ? validateTables(
                    parsed,
                    [source],
                    cfg.teams,
                    known,
                    now(),
                    key === "ucl",
                    cfg.groups,
                    cfg.teamsPerGroup ?? cfg.teams,
                    cfg.groupTeamRanges,
                  )
                : {
                    ...validateTables(
                      [],
                      [source],
                      cfg.teams,
                      known,
                      now(),
                      key === "ucl",
                      cfg.groups,
                      cfg.teamsPerGroup ?? cfg.teams,
                      cfg.groupTeamRanges,
                    ),
                    rejected: [{ source: source.index, reason: "invalid_json_on_consensus_retry" }],
                  };
              return { source, parsed, result };
            },
          ),
        );
        const bySource = new Map<number, NonNullable<ReturnType<typeof parseStandings>>>();
        for (const row of raw) bySource.set(row.source, [...(bySource.get(row.source) ?? []), row]);
        for (const retry of consensusRetries) {
          if (!retry) continue;
          if (retry.parsed && retry.result.tables.length > 0) {
            bySource.set(
              retry.source.index,
              retry.parsed.filter((row) => row.source === retry.source.index),
            );
          } else {
            const reason =
              retry.result.rejected.map((item) => item.reason).join(";") ||
              "consensus_retry_incomplete";
            sourceFailures.push(
              "consensus_retry_" + sourceLabel(retry.source.index) + ":" + reason,
            );
          }
        }
        raw = [...bySource.values()].flat();
        validation = validateTables(
          raw,
          sources,
          cfg.teams,
          known,
          now(),
          key === "ucl",
          cfg.groups,
          cfg.teamsPerGroup ?? cfg.teams,
          cfg.groupTeamRanges,
        );
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
    if (!chosenTables && sources.some((source) => source.tier === "official")) {
      const secondary = (
        await gatherSources(deps, key, objective, queries, false, [], true, MAX_SOURCES)
      ).filter((source) => source.tier !== "official");
      const secondaryDomains = new Set(secondary.map((source) => source.domain));
      if (secondaryDomains.size >= 2) {
        usedSecondaryFallback = true;
        sources = secondary;
        const secondaryInitial = await Promise.all(
          sources.map(async (source) => {
            const answer = await generate(
              deps,
              standingsRequest({
                competition: c.name,
                season,
                sources: [source],
                ...(cfg.groups ? { groups: cfg.groups } : {}),
                ...(cfg.groupNotes ? { groupNotes: cfg.groupNotes } : {}),
              }),
            );
            modelsUsed.add(answer.model);
            const parsed = stampPageDate(parseStandings(answer.text), source);
            const result = parsed
              ? validateTables(
                  parsed,
                  [source],
                  cfg.teams,
                  known,
                  now(),
                  key === "ucl",
                  cfg.groups,
                  cfg.teamsPerGroup ?? cfg.teams,
                  cfg.groupTeamRanges,
                )
              : {
                  ...validateTables(
                    [],
                    [source],
                    cfg.teams,
                    known,
                    now(),
                    key === "ucl",
                    cfg.groups,
                    cfg.teamsPerGroup ?? cfg.teams,
                    cfg.groupTeamRanges,
                  ),
                  rejected: [{ source: source.index, reason: "invalid_json_secondary" }],
                };
            return { source, parsed, result };
          }),
        );
        const secondaryRetryCandidates = secondaryInitial.filter(
          (result) => result.result.tables.length === 0,
        );
        const secondaryRetries = await Promise.all(
          secondaryRetryCandidates.map(async (result) => {
            const hint =
              result.result.rejected.map((item) => item.reason).join(", ") ||
              "incomplete_secondary_table";
            const answer = await generate(
              deps,
              standingsRequest({
                competition: c.name,
                season,
                sources: [result.source],
                retryHint: hint,
                ...(cfg.groups ? { groups: cfg.groups } : {}),
                ...(cfg.groupNotes ? { groupNotes: cfg.groupNotes } : {}),
              }),
            );
            modelsUsed.add(answer.model);
            const parsed = stampPageDate(parseStandings(answer.text), result.source);
            const validation = parsed
              ? validateTables(
                  parsed,
                  [result.source],
                  cfg.teams,
                  known,
                  now(),
                  key === "ucl",
                  cfg.groups,
                  cfg.teamsPerGroup ?? cfg.teams,
                  cfg.groupTeamRanges,
                )
              : {
                  ...validateTables(
                    [],
                    [result.source],
                    cfg.teams,
                    known,
                    now(),
                    key === "ucl",
                    cfg.groups,
                    cfg.teamsPerGroup ?? cfg.teams,
                    cfg.groupTeamRanges,
                  ),
                  rejected: [
                    { source: result.source.index, reason: "invalid_json_secondary_retry" },
                  ],
                };
            return { source: result.source, parsed, validation };
          }),
        );
        const secondaryRetryByIndex = new Map(
          secondaryRetries.map((result) => [result.source.index, result]),
        );
        raw = [];
        for (const firstPass of secondaryInitial) {
          const retry = secondaryRetryByIndex.get(firstPass.source.index);
          const parsed = retry?.parsed ?? firstPass.parsed;
          const result = retry?.validation ?? firstPass.result;
          if (parsed && result.tables.length > 0) raw.push(...parsed);
          else {
            const reason =
              result.rejected.map((item) => item.reason).join(";") || "incomplete_secondary_table";
            sourceFailures.push(
              `secondary:${firstPass.source.index}@${firstPass.source.domain}:${reason}`,
            );
          }
        }
        validation = validateTables(
          raw,
          sources,
          cfg.teams,
          known,
          now(),
          key === "ucl",
          cfg.groups,
          cfg.teamsPerGroup ?? cfg.teams,
          cfg.groupTeamRanges,
        );
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
      } else {
        sourceFailures.push("secondary_fallback_insufficient_independent_domains");
      }
    }
    if (!chosenTables && key === "caf-cc") {
      const groupResults = (await deps.store.cafGroupStageResults?.()) ?? [];
      if (groupResults.length > 0) {
        const derivedRows = buildCafGroupStandings(groupResults);
        const standingsStatuses = await deps.store.statuses();
        const previousStatus = standingsStatuses.find((row) => row.job === "standings" && row.scope === key);
        const previousDerived = isStandingsBaselineFresh(previousStatus?.lastSuccessAt, now())
          ? await deps.store.currentStandings(key, season)
          : [];
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
            fallbackFromOfficial: usedSecondaryFallback,
            source: "verified_completed_matches",
            sourceUrl: CAF_GROUP_DRAW_URL,
            groupCount: 4,
            confirmedTeams: count,
            pendingGroupCQualifier: true,
            verifiedMatchesUsed: groupResults.length,
            latestMatch:
              groupResults
                .map((item) => item.kickoffAt)
                .sort()
                .at(-1) ?? null,
          });
          return {
            ok: true,
            detail:
              count +
              " teams across 4 provisional groups calculated from " +
              groupResults.length +
              " verified group-stage results",
          };
        }
      }
    }
    if (!chosenTables) {
      const domains = validation.tables.map((table) => table.source.domain).join(", ");
      const why =
        [
          ...sourceFailures,
          ...validation.rejected.map((r) => sourceLabel(r.source) + ":" + r.reason),
        ].join(", ") ||
        String(validation.tables.length) +
          " unconfirmed tables" +
          (domains ? " from " + domains : "");
      const disagreement = standingsDisagreementHint(validation.tables);
      throw new Error(
        "no verified table (" + why + (disagreement ? "; " + disagreement : "") + ")",
      );
    }
    const standingsStatuses = await deps.store.statuses();
    const previousStatus = standingsStatuses.find((row) => row.job === "standings" && row.scope === key);
    const previous = isStandingsBaselineFresh(previousStatus?.lastSuccessAt, now())
      ? await deps.store.currentStandings(key, season)
      : [];
    const candidateRows = chosenTables.flatMap((selection) => selection.table.rows);
    const supportingDomains = [
      ...new Set(chosenTables.flatMap((selection) => selection.supportingDomains)),
    ].sort();
    const twoSourceCorroborated = chosenTables.every(
      (selection) => selection.verdict === "two_sources" && selection.supportingDomains.length >= 2,
    );
    const allowVerifiedGoalCorrections = twoSourceCorroborated;
    const allowVerifiedRecordCorrections =
      cfg.allowVerifiedRecordCorrections === true && twoSourceCorroborated;
    const goalCorrections = previous.flatMap((old) => {
      const next = candidateRows.find(
        (row) =>
          (row.group ?? "") === (old.group ?? "") &&
          normaliseTeam(row.team) === normaliseTeam(old.team),
      );
      if (
        !next ||
        next.played !== old.played ||
        next.won !== old.won ||
        next.drawn !== old.drawn ||
        next.lost !== old.lost ||
        next.points !== old.points ||
        (next.goalsFor === old.goalsFor && next.goalsAgainst === old.goalsAgainst)
      )
        return [];
      return [
        {
          team: next.team,
          previousGoalsFor: old.goalsFor,
          currentGoalsFor: next.goalsFor,
          previousGoalsAgainst: old.goalsAgainst,
          currentGoalsAgainst: next.goalsAgainst,
        },
      ];
    });
    const playedCorrections = previous.flatMap((old) => {
      const next = candidateRows.find(
        (row) =>
          (row.group ?? "") === (old.group ?? "") &&
          normaliseTeam(row.team) === normaliseTeam(old.team),
      );
      if (
        !next ||
        old.played - next.played !== 1 ||
        !cfg.allowVerifiedPlayedCorrections?.some(
          (name) => normaliseTeam(name) === normaliseTeam(old.team),
        )
      )
        return [];
      return [
        {
          team: next.team,
          previousPlayed: old.played,
          currentPlayed: next.played,
          previousRecord: `${old.won}-${old.drawn}-${old.lost}`,
          currentRecord: `${next.won}-${next.drawn}-${next.lost}`,
          previousGoals: `${old.goalsFor}-${old.goalsAgainst}`,
          currentGoals: `${next.goalsFor}-${next.goalsAgainst}`,
          previousPoints: old.points,
          currentPoints: next.points,
        },
      ];
    });
    const regression = tableRegression(
      candidateRows,
      previous,
      allowVerifiedGoalCorrections,
      cfg.allowVerifiedPlayedCorrections,
      cfg.allowTeamCountIncrease,
      allowVerifiedRecordCorrections,
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
      fallbackFromOfficial: usedSecondaryFallback,
      primarySources: primarySources.map((source) => ({ domain: source.domain, url: source.url })),
      groups: chosenTables.map((selection) => selection.table.group ?? null),
      primarySource: chosenTables[0]!.table.source.url,
      tableDate: chosenTables[0]!.table.tableDate ?? null,
      teams: n,
      models: [...modelsUsed],
      goalCorrectionPolicy: allowVerifiedGoalCorrections ? "two-source-corroborated" : "strict",
      recordCorrectionPolicy: allowVerifiedRecordCorrections ? "two-source-corroborated" : "strict",
      playedCorrectionPolicy: cfg.allowVerifiedPlayedCorrections ?? [],
      playedCorrections,
      teamCountExpansionPolicy: cfg.allowTeamCountIncrease
        ? "one-new-team-when-group-range-allows"
        : "strict",
      goalCorrections,
    });
    return {
      ok: true,
      detail: `${n} teams across ${chosenTables.length} table(s) verified by ${supportingDomains.length} sources (${supportingDomains.join(", ")})`,
    };
  } catch (e) {
    await deps.store
      .record("standings", key, false, message(e), {
        sources: sources.map((source) => ({
          index: source.index,
          domain: source.domain,
          url: source.url,
          via: source.via,
          retrievedAt: source.retrievedAt,
        })),
        sourceFailures,
        sourceDiagnostics,
        ...(key === "championship"
          ? {
              sourceTextDiagnostics: sources.map((source) => {
                const text = source.text ?? "";
                const marker = /middlesbrough|wolverhampton|\bgoals\b|\bpts\b/i.exec(text);
                const center = marker?.index ?? 0;
                const parsed = !cfg.groups?.length
                  ? parseStandingsMarkdown(text, source.index)
                  : null;
                return {
                  domain: source.domain,
                  length: text.length,
                  format: /^\s*</.test(text) ? "html" : text.includes("|") ? "markdown-or-pipes" : "plain-text",
                  deterministicRows: parsed?.length ?? 0,
                  firstTeam: parsed?.[0]?.team ?? null,
                  lastTeam: parsed?.at(-1)?.team ?? null,
                  excerpt: text.slice(Math.max(0, center - 350), Math.min(text.length, center + 1_200)),
                };
              }),
            }
          : {}),
        fallbackFromOfficial: usedSecondaryFallback,
        primarySources: primarySources.map((source) => ({
          domain: source.domain,
          url: source.url,
        })),
        models: [...modelsUsed],
      })
      .catch(() => undefined);
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
    const queries = seasonQueries(c.name, start, end, known);
    const preferredUrls = seasonArchiveUrls(c.name, start);
    const objective =
      `${c.name} results with final scores for every match played from ${start} to ${end}. ` +
      `Prefer the official competition site and established sports news sites.`;
    const request = (list: PfieSource[]) =>
      extractionRequest({
        competition: c.name,
        from: start,
        to: end,
        today: sastDate(now()),
        sources: list,
      });
    const extractAndVerify = async (list: PfieSource[]) => {
      const accepted: Observation[] = [];
      const reasons: Record<string, number> = {};
      const models = new Set<string>();
      let extracted = 0;
      let parsedSources = 0;
      let parseFailures = 0;
      for (const source of list) {
        // Extract each publisher independently. A single multi-source prompt often attributes every row to
        // one source, which defeats the two-domain verification rule for non-official publishers.
        const isolated = { ...source, index: 1 };
        const sourceRequest = (items: PfieSource[]) =>
          extractionRequest({
            competition: c.name,
            from: start,
            to: end,
            today: sastDate(now()),
            sources: items,
          });
        let answer = await generate(deps, sourceRequest([isolated]));
        let raw = parseObservations(answer.text);
        if (!raw) {
          answer = await generate(
            deps,
            sourceRequest([{ ...isolated, text: isolated.text.slice(0, 8_000) }]),
          );
          raw = parseObservations(answer.text);
        }
        models.add(answer.model);
        if (!raw) {
          parseFailures += 1;
          continue;
        }
        parsedSources += 1;
        extracted += raw.length;
        const validation = validateObservations(raw, [isolated], {
          from,
          to,
          now: now(),
          knownTeams: known,
        });
        accepted.push(...validation.accepted);
        for (const item of validation.rejected)
          reasons[item.reason] = (reasons[item.reason] ?? 0) + 1;
      }
      const { rows, unverified } = verifyHistory(accepted, key, known);
      return {
        extracted,
        parsedSources,
        parseFailures,
        accepted,
        rows,
        unverified,
        reasons,
        model: [...models].join(", "),
      };
    };

    // First use the competition's own official result archive. If it cannot provide usable observations for
    // this particular window, retry with trusted independent publishers; history verification still requires
    // two matching domains whenever an official scoreline is not present.
    let sources = await gatherSources(
      deps,
      key,
      objective,
      queries,
      true,
      preferredUrls,
      false,
      MAX_SEASON_SOURCES,
    );
    if (sources.length === 0) throw new Error("no usable source");
    let result = await extractAndVerify(sources);
    const onlyOutOfWindow = (value: typeof result) =>
      value.extracted > 0 &&
      value.reasons["outside_date_range"] === value.extracted &&
      Object.keys(value.reasons).every((reason) => reason === "outside_date_range");
    if (
      result.rows.length === 0 &&
      !onlyOutOfWindow(result) &&
      sources.some((source) => source.tier === "official")
    ) {
      const secondary = await gatherSources(
        deps,
        key,
        objective,
        queries,
        true,
        preferredUrls,
        true,
        MAX_SEASON_SOURCES,
      );
      if (secondary.some((source) => source.tier !== "official")) {
        const fallback = await extractAndVerify(secondary);
        if (
          fallback.rows.length > 0 ||
          fallback.extracted > result.extracted ||
          fallback.parsedSources > result.parsedSources
        ) {
          sources = secondary;
          result = fallback;
        }
      }
    }
    const inserted = result.rows.length
      ? await deps.store.insertHistory(result.rows.map((r) => ({ ...r, competition: c.name })))
      : 0;
    const meta = {
      verified: result.rows.length,
      inserted,
      unverified: result.unverified,
      extracted: result.extracted,
      parsedSources: result.parsedSources,
      parseFailures: result.parseFailures,
      accepted: result.accepted.length,
      rejected: result.reasons,
      sources: sources.map((s) => s.domain),
      model: result.model,
    };
    const noMatchesInWindow = isConfirmedNoMatchesInWindow(result);
    if (result.rows.length === 0) {
      if (noMatchesInWindow) {
        await deps.store.record("season", scope, true, null, { ...meta, noMatchesInWindow: true });
        return {
          ok: true,
          detail: "no matches in this date window; verified source extraction was empty",
        };
      }
      await deps.store.record("season", scope, false, "no verified results on the sources", meta);
      return {
        ok: false,
        detail: `no verified results (${result.extracted} extracted, ${result.accepted.length} accepted, ${result.unverified} single-source)`,
      };
    }
    await deps.store.record("season", scope, true, null, meta);
    return {
      ok: true,
      detail: `${inserted} new results (${result.rows.length} verified, ${result.unverified} unconfirmed)`,
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
    // Refresh a rolling 42-day window on a recurring cadence. A one-time backfill is not enough:
    // source corrections and newly published results must flow into the history table.
    const known = await deps.store.knownTeams(c.name).catch(() => []);
    const sources = await gatherSources(
      deps,
      key,
      c.name + " results with final scores for every match played from " + sastDate(from) + " to " + sastDate(to) + ". " +
        "Prefer the official competition site and established sports news sites.",
      [c.name + " results", c.name + " scores last matchdays"],
      true,
      seasonArchiveUrls(c.name, sastDate(from)),
      true,
      MAX_SEASON_SOURCES,
    );
    if (sources.length === 0) throw new Error("no usable source");
    let answer = await generate(
      deps,
      extractionRequest({
        competition: c.name,
        from: sastDate(from),
        to: sastDate(to),
        today: sastDate(to),
        sources,
      }),
    );
    let raw = parseObservations(answer.text);
    let accepted: Observation[] = [];
    let rejectedReasons: string[] = [];
    let rows: HistoryRow[] = [];
    let unverified = 0;
    const validate = (observations: NonNullable<typeof raw>) => {
      const result = validateObservations(observations, sources, {
        from,
        to,
        now: to,
        knownTeams: known,
      });
      const history = verifyHistory(result.accepted, key, known);
      accepted = result.accepted;
      rejectedReasons = result.rejected.map((item) => item.reason);
      rows = history.rows;
      unverified = history.unverified;
    };
    if (raw) validate(raw);

    // A first pass can return valid JSON with an empty matches array even when the extracted pages visibly
    // contain scorelines. Retry once, with an explicit instruction to inspect each source independently.
    const hasPageScoreEvidence = sources.some((source) => hasHistoryResultEvidence(source.text));
    let retryUsed = false;
    if (rows.length === 0 && hasPageScoreEvidence) {
      retryUsed = true;
      const retryHint = !raw
        ? "The first response was not valid JSON. Re-read every source independently and return its completed matches with explicit final scores as compact valid JSON."
        : "The first response produced " + raw.length + " observations but zero independently verified finished results. " +
          "Re-scan each source independently for completed matches in the requested date window. Do not omit score rows. " +
          "Keep source indices exact. Prior validation rejections: " +
          ([...new Set(rejectedReasons)].slice(0, 8).join(", ") || "none") + ".";
      const retryAnswer = await generate(
        deps,
        extractionRequest({
          competition: c.name,
          from: sastDate(from),
          to: sastDate(to),
          today: sastDate(to),
          sources,
          retryHint,
        }),
      );
      const retryRaw = parseObservations(retryAnswer.text);
      if (retryRaw) {
        raw = [...(raw ?? []), ...retryRaw];
        answer = retryAnswer;
        validate(raw);
      } else if (!raw) {
        raw = null;
      }
    }

    if (!raw) {
      await deps.store.record("history", key, false, "extraction answer was not valid JSON", {
        extracted: 0,
        accepted: 0,
        unverified,
        sourceCount: sources.length,
        sourceDomains: sources.map((source) => source.domain),
        retryUsed,
        model: answer.model,
        sourceDiagnostics: historySourceDiagnostics(sources),
      });
      return { ok: false, detail: "extraction answer was not valid JSON; not marked successful" };
    }
    if (rows.length === 0) {
      await deps.store.record("history", key, false, "no independently verified results in rolling window", {
        extracted: raw.length,
        accepted: accepted.length,
        unverified,
        rejectedReasons: [...new Set(rejectedReasons)].slice(0, 12),
        sourceCount: sources.length,
        sourceDomains: sources.map((source) => source.domain),
        retryUsed,
        model: answer.model,
        sourceDiagnostics: historySourceDiagnostics(sources),
      });
      return { ok: false, detail: "no independently verified results in rolling window; not marked successful" };
    }
    // insert_team_results performs a natural-key upsert, so corrected scores replace stale values.
    const inserted = await deps.store.insertHistory(rows.map((r) => ({ ...r, competition: c.name })));
    const dates = rows.map((row) => row.matchDate).sort();
    await deps.store.record("history", key, true, null, {
      verified: rows.length,
      insertedOrUpdated: inserted,
      unverified,
      sourceCount: sources.length,
      sourceDomains: sources.map((source) => source.domain),
      oldestVerifiedMatch: dates[0] ?? null,
      newestVerifiedMatch: dates.at(-1) ?? null,
      retryUsed,
      model: answer.model,
    });
    return {
      ok: true,
      detail: inserted + " new results (" + rows.length + " verified, " + unverified + " unconfirmed)",
    };
  } catch (e) {
    await deps.store.record("history", key, false, message(e), {}).catch(() => undefined);
    return { ok: false, detail: message(e) };
  }
}

