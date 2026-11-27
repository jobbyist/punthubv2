/**
 * Pre-match reference odds sync (docs/PARALLEL_ARCHITECTURE.md). Each call refreshes the next due competitions that
 * have scheduled fixtures kicking off in the next 72 hours. A competition is due once per refresh window (every
 * 4 hours at most), so two windows a day (07:00 and 14:00 SAST) cost about one search and two page reads per
 * competition each. Nothing is collected after kick-off (pre-match only, no in-play).
 */
import { canonicalUrl, cleanText, domainOf } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, LlmRequest, SearchProvider } from "@/lib/content/types";

import {
  type OddsSource,
  type ReferencePrice,
  type UpcomingFixture,
  isOddsSource,
  ODDS_AFFILIATE_PRIORITY_DOMAINS,
  oddsRequest,
  parsePrices,
  validatePrices,
} from "./reference";

export interface OddsStatus {
  scope: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
}

export interface OddsStore {
  upcoming(fromIso: string, toIso: string): Promise<(UpcomingFixture & { competition: string })[]>;
  statuses(): Promise<OddsStatus[]>;
  authorizedDomains(): Promise<string[]>;
  insert(rows: ReferencePrice[], capturedAt: string): Promise<number>;
  record(
    scope: string,
    ok: boolean,
    error: string | null,
    meta: Record<string, unknown>,
  ): Promise<void>;
}

export interface OddsDeps {
  search: SearchProvider;
  extract: ExtractProvider | null;
  llm: LlmProvider;
  store: OddsStore;
  allowedDomains: readonly string[];
  now?: () => Date;
}

const HOUR = 3_600_000;
export const ODDS_HORIZON_HOURS = 72;
/** Fixtures this close to kick-off are skipped: a price read now could already be stale by the time it is shown. */
const MIN_LEAD_MINUTES = 30;
const REFRESH_EVERY_HOURS = 4;
const MAX_FIXTURES_PER_PROMPT = 12;
const MAX_PAGES = 5;
const MAX_SOURCES = 8;
const MAX_CHARS = 14_000;

/**
 * Due when never tried, or last tried more than 4 h ago. After 3 failures in a row, 20 h: short of 24 h on purpose,
 * so a competition last tried late in a window (07:50) is due again in the same window the next day (07:00) instead
 * of slipping to the afternoon one.
 */
export function oddsDue(status: OddsStatus | undefined, now: Date): boolean {
  if (!status?.lastAttemptAt) return true;
  const since = now.getTime() - Date.parse(status.lastAttemptAt);
  const wait = status.consecutiveFailures >= 3 ? 20 * HOUR : REFRESH_EVERY_HOURS * HOUR;
  return since >= wait;
}

export function oddsQueries(competition: string, fixtures: UpcomingFixture[]): string[] {
  const first = fixtures[0];
  return [
    `${competition} odds`,
    ...(first ? [`${first.home} vs ${first.away} odds`] : []),
    `${competition} betting odds 1X2 over under both teams to score`,
  ];
}

async function gatherSources(
  deps: OddsDeps,
  competition: string,
  fixtures: UpcomingFixture[],
): Promise<OddsSource[]> {
  const list = fixtures
    .slice(0, 6)
    .map((f) => `${f.home} v ${f.away}`)
    .join("; ");
  const hits = await deps.search.search({
    objective:
      `Current pre-match decimal odds (match result 1X2, over/under 2.5 goals, both teams to score) for ` +
      `${competition} matches: ${list}. Pages of South African licensed bookmakers only.`,
    queries: oddsQueries(competition, fixtures),
    maxResults: 20,
  });
  const priorityOf = (domain: string) => {
    const index = ODDS_AFFILIATE_PRIORITY_DOMAINS.findIndex(
      (candidate) => domain === candidate || domain.endsWith(`.${candidate}`),
    );
    return index < 0 ? ODDS_AFFILIATE_PRIORITY_DOMAINS.length : index;
  };
  const licensed = hits
    .filter((h) => isOddsSource(domainOf(h.url), deps.allowedDomains))
    .sort((a, b) => priorityOf(domainOf(a.url)) - priorityOf(domainOf(b.url)));
  const sources: OddsSource[] = [];
  const seen = new Set<string>();
  const add = (url: string, text: string) => {
    const clean = cleanText(text, MAX_CHARS);
    const key = canonicalUrl(url);
    if (clean.length < 120 || seen.has(key)) return;
    seen.add(key);
    sources.push({ index: 0, url, domain: domainOf(url), text: clean });
  };
  // Live page reads only. Search excerpts come from the search index and can be days old (seen 15 Nov: a
  // bookmaker excerpt "last updated" two days earlier), so they are never used as a price source.
  let reads = 0;
  for (const hit of licensed) {
    if (reads >= MAX_PAGES || !deps.extract) break;
    reads++;
    const page = await deps.extract.extract(hit.url).catch(() => null);
    if (page) add(hit.url, page.markdown);
  }
  sources.splice(MAX_SOURCES);
  sources.forEach((s, i) => (s.index = i + 1));
  return sources;
}

async function generate(deps: OddsDeps, request: LlmRequest) {
  // Parallel Chat low is the structured extraction model for odds; Gemini is not called by this pipeline.
  return deps.llm.generate("parallel-low", request);
}

const message = (e: unknown) => e instanceof Error ? e.message.slice(0, 280) : "unexpected error";

export interface OddsReport {
  competitions: {
    competition: string;
    ok: boolean;
    fixtures: number;
    stored: number;
    error?: string;
  }[];
  skipped: number;
}

export async function runOddsSync(
  deps: OddsDeps,
  options: { maxCompetitions?: number; only?: string[] } = {},
): Promise<OddsReport> {
  const now = deps.now ?? (() => new Date());
  const start = now();
  const from = new Date(start.getTime() + MIN_LEAD_MINUTES * 60_000).toISOString();
  const to = new Date(start.getTime() + ODDS_HORIZON_HOURS * HOUR).toISOString();
  const upcoming = await deps.store.upcoming(from, to);
  const byCompetition = new Map<string, UpcomingFixture[]>();
  for (const f of upcoming) {
    const list = byCompetition.get(f.competition) ?? [];
    list.push({ id: f.id, home: f.home, away: f.away, kickoffAt: f.kickoffAt });
    byCompetition.set(f.competition, list);
  }
  const statuses = new Map((await deps.store.statuses()).map((s) => [s.scope, s]));
  const due = [...byCompetition.keys()]
    .filter((c) => !options.only?.length || options.only.includes(c))
    .filter((c) => options.only?.length || oddsDue(statuses.get(c), start))
    // Soonest kick-off first, so the matches members are picking now get prices first.
    .sort((a, b) =>
      byCompetition.get(a)![0]!.kickoffAt.localeCompare(byCompetition.get(b)![0]!.kickoffAt),
    );
  const batch = due.slice(0, options.maxCompetitions ?? 2);
  const report: OddsReport = { competitions: [], skipped: due.length - batch.length };

  for (const competition of batch) {
    const fixtures = byCompetition.get(competition)!.slice(0, MAX_FIXTURES_PER_PROMPT);
    try {
      const sources = await gatherSources(deps, competition, fixtures);
      if (sources.length === 0) throw new Error("no licensed bookmaker page found");
      const answer = await generate(deps, oddsRequest({ competition, fixtures, sources }));
      const raw = parsePrices(answer.text);
      if (!raw) throw new Error("extraction answer was not valid JSON");
      const { prices, rejected } = validatePrices(raw, sources, fixtures, deps.allowedDomains);
      const stored = prices.length ? await deps.store.insert(prices, now().toISOString()) : 0;
      const ok = stored > 0;
      await deps.store.record(competition, ok, ok ? null : "no price passed the checks", {
        fixtures: fixtures.length,
        sources: sources.map((s) => s.domain),
        extracted: raw.length,
        stored,
        rejected: rejected.slice(0, 20),
        model: answer.model,
      });
      report.competitions.push({ competition, ok, fixtures: fixtures.length, stored });
    } catch (error) {
      await deps.store
        .record(competition, false, message(error), { fixtures: fixtures.length })
        .catch(() => {});
      report.competitions.push({
        competition,
        ok: false,
        fixtures: fixtures.length,
        stored: 0,
        error: message(error),
      });
    }
  }
  return report;
}
