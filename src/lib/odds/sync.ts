/**
 * Pre-match reference odds sync (docs/PARALLEL_ARCHITECTURE.md). Each bounded request refreshes one due competition
 * with fixtures kicking off in the next 72 hours. Two daily windows rotate four independent bookmaker sources per
 * competition; nothing is collected after kick-off (pre-match only, no in-play).
 */
import { DEFAULT_PFIE_MODELS, parseModelList } from "@/lib/content/config";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { canonicalUrl, cleanText, domainOf } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, LlmRequest, SearchProvider } from "@/lib/content/types";

import {
  DEFAULT_ODDS_SOURCE_DOMAINS,
  type OddsSource,
  type ReferencePrice,
  type UpcomingFixture,
  isOddsSource,
  oddsBookmakerKey,
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
  models?: string[];
  usageToday?: () => Promise<Record<string, number>>;
  now?: () => Date;
}

const HOUR = 3_600_000;
export const ODDS_HORIZON_HOURS = 72;
/** Fixtures this close to kick-off are skipped: a price read now could already be stale by the time it is shown. */
const MIN_LEAD_MINUTES = 30;
const REFRESH_EVERY_HOURS = 4;
const MAX_FIXTURES_PER_PROMPT = 12;
const MAX_PAGES = 4;
const MAX_SOURCES = 4;
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

export function rotateBookmakerDomains(
  domains: string[],
  competition: string,
  rotationTime: Date,
): string[] {
  if (domains.length === 0) return [];
  const daySlot = Math.floor(rotationTime.getTime() / (24 * HOUR));
  const windowSlot = rotationTime.getUTCHours() >= 9 ? 1 : 0;
  const rotationSlot = daySlot * 2 + windowSlot;
  const competitionSeed = [...competition].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const offset = (rotationSlot * MAX_PAGES + competitionSeed) % domains.length;
  return [...domains.slice(offset), ...domains.slice(0, offset)];
}

export function oddsQueries(
  competition: string,
  fixtures: UpcomingFixture[],
  domains: string[] = DEFAULT_ODDS_SOURCE_DOMAINS,
): string[] {
  const teams = [...new Set(fixtures.flatMap((fixture) => [fixture.home, fixture.away]))].slice(0, 8);
  const teamQuery = teams.join(" ");
  return [
    competition + " odds " + teamQuery,
    ...domains.map((domain) => "site:" + domain + " " + competition + " football odds " + teamQuery),
  ];
}

async function gatherSources(
  deps: OddsDeps,
  competition: string,
  fixtures: UpcomingFixture[],
  rotationTime: Date,
): Promise<OddsSource[]> {
  const list = fixtures
    .slice(0, 6)
    .map((f) => `${f.home} v ${f.away}`)
    .join("; ");
  const hits = await deps.search.search({
    objective:
      `Current pre-match decimal odds (match result 1X2, over/under 2.5 goals, both teams to score) for ` +
      `${competition} matches: ${list}. Pages of South African licensed bookmakers only.`,
    queries: oddsQueries(competition, fixtures, deps.allowedDomains),
    maxResults: 20,
  });
  const licensed = hits.filter((h) => isOddsSource(domainOf(h.url), deps.allowedDomains) && oddsBookmakerKey(domainOf(h.url)) !== null);
  const priorityDomains = rotateBookmakerDomains(deps.allowedDomains, competition, rotationTime);
  const priority = new Map(priorityDomains.map((domain, index) => [oddsBookmakerKey(domain), index]));
  licensed.sort((a, b) =>
    (priority.get(oddsBookmakerKey(domainOf(a.url)) ?? "") ?? 99) -
    (priority.get(oddsBookmakerKey(domainOf(b.url)) ?? "") ?? 99),
  );
  const sources: OddsSource[] = [];
  const seenBookmakers = new Set<string>();
  const chosen = licensed.filter((hit) => {
    const key = oddsBookmakerKey(domainOf(hit.url));
    if (!key || seenBookmakers.has(key)) return false;
    seenBookmakers.add(key);
    return true;
  }).slice(0, MAX_PAGES);

  // Read one live page per bookmaker concurrently. A second domain or subdomain owned by the same operator
  // cannot inflate consensus or consume an additional source slot.
  const pages = await Promise.all(chosen.map(async (hit) => {
    const page = deps.extract ? await deps.extract.extract(hit.url).catch(() => null) : null;
    return page ? { url: hit.url, domain: domainOf(hit.url), text: cleanText(page.markdown, MAX_CHARS) } : null;
  }));
  for (const page of pages) {
    if (!page || page.text.length < 120) continue;
    sources.push({ index: sources.length + 1, url: page.url, domain: page.domain, text: page.text });
  }
  sources.splice(MAX_SOURCES);
  sources.forEach((s, i) => (s.index = i + 1));
  return sources;
}

async function generate(deps: OddsDeps, request: LlmRequest) {
  const models = deps.models ?? parseModelList(DEFAULT_PFIE_MODELS.join(",")).models;
  const usage = (await deps.usageToday?.().catch(() => ({}))) ?? {};
  const usedToday: Record<string, number> = {};
  for (const m of models) usedToday[m] = (usage as Record<string, number>)[`gemini:${m}`] ?? 0;
  return createModelRouter(deps.llm, { models, usedToday, retryDelayMs: 0 }).generate(request);
}

const message = (e: unknown) =>
  e instanceof AllModelsFailed || e instanceof Error ? e.message.slice(0, 280) : "unexpected error";

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
      const sources = await gatherSources(deps, competition, fixtures, start);
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
