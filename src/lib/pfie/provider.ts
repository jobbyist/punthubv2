/**
 * PFIE fixtures provider: Parallel Search finds the pages, Parallel Extract reads them, Parallel Responses
 * structures observations, and plain code validates and corroborates. It implements the same `SportsProvider`
 * interface as the API-Sports adapter, so the
 * existing sync, settlement and cron code runs unchanged.
 *
 * This is not a live-score feed. Fixtures refresh once a day; a result is published when the competition's official
 * site shows it or two independent sites agree, usually within an hour or two of full time.
 */
import { randomUUID } from "node:crypto";

import { ProviderError } from "@/lib/content/http";
import { withExtractCache, withSearchCache, type CacheEvent, type CacheStore } from "@/lib/parallel/cached";
import { AllModelsFailed, createModelRouter } from "@/lib/content/model-router";
import { canonicalUrl, cleanText, domainOf, isBlockedDomain } from "@/lib/content/research";
import type { ExtractProvider, LlmProvider, SearchProvider } from "@/lib/content/types";
import { sastDate } from "@/lib/sast";
import {
  activeCompetitions,
  seasonFor,
  type Competition,
  type CompetitionKey,
} from "@/lib/sports/competitions";
import type { ListOptions, ListResult, SportsProvider } from "@/lib/sports/provider";
import type { NormalisedFixture } from "@/lib/sports/types";

import { corroborate } from "./corroborate";
import {
  chunkSourcesForExtraction,
  extractionRequest,
  parseObservations,
  validateObservations,
} from "./extract";
import type { Decision, PfieSource, PfieStore, SourceTier } from "./types";
import { isPfieLaunchCompetition } from "./launch-scope";

interface CompetitionSources {
  /** The competition's own site: authoritative. */
  official: string[];
  /** Official pages read in full on every run, when an extraction provider is configured. */
  pages: { fixtures: string[]; results: string[] };
  queries: { fixtures: string[]; results: string[] };
}

/**
 * Domestic competitions whose venues share one time zone. The official site read without a printed zone is taken
 * to show this zone, as an inferred time that a second site must confirm (see corroborate.ts). Cross-border
 * competitions (UEFA, CAF) have none.
 */
export const HOME_ZONES: Partial<Record<CompetitionKey, string>> = {
  psl: "Africa/Johannesburg",
  nedbank: "Africa/Johannesburg",
  "sa-championship": "Africa/Johannesburg",
  epl: "Europe/London",
  championship: "Europe/London",
  facup: "Europe/London",
  eflcup: "Europe/London",
  laliga: "Europe/Madrid",
  seriea: "Europe/Rome",
  bundesliga: "Europe/Berlin",
  ligue1: "Europe/Paris",
  eredivisie: "Europe/Amsterdam",
  primeira: "Europe/Lisbon",
  "saudi-pro": "Asia/Riyadh",
};

/**
 * Extra phrasings that pull in pages printing times in a known zone: South African outlets (SAST) and the
 * national press of the league's country (inferred zone). Same search call, so no extra cost.
 */
const ZONE_QUERIES: Partial<Record<CompetitionKey, string[]>> = {
  laliga: ["LaLiga horarios jornada", "La Liga fixtures SuperSport kick-off SA time"],
  seriea: ["Serie A orari giornata", "Serie A fixtures SuperSport kick-off SA time"],
  bundesliga: ["Bundesliga Spieltag Anstoßzeiten", "Bundesliga fixtures SA time"],
  ligue1: ["Ligue 1 programme horaires journée", "Ligue 1 fixtures SA time"],
  eredivisie: ["Eredivisie speelschema aftrap", "Eredivisie fixtures SA time"],
  primeira: ["Liga Portugal calendário horários jornada", "Liga Portugal fixtures SA time"],
  "saudi-pro": ["Roshn Saudi League fixtures KSA time", "Saudi Pro League fixtures SA time"],
  championship: ["Championship fixtures this weekend BBC Sport", "Championship fixtures SA time"],
  ucl: [
    "Champions League fixtures SuperSport kick-off times",
    "Champions League horarios jornada",
    "Champions League orari giornata",
  ],
  uel: ["Europa League fixtures SuperSport kick-off times", "Europa League horarios jornada"],
  uecl: ["Conference League fixtures SuperSport kick-off times"],
};

/** Launch coverage. Adding a competition is one entry here plus its entry in `competitions.ts`. */
export const PFIE_SOURCES: Partial<Record<CompetitionKey, CompetitionSources>> = {
  psl: {
    official: ["psl.co.za"],
    pages: {
      fixtures: ["https://www.psl.co.za/matchcentre?type=fixtures"],
      results: ["https://www.psl.co.za/matchcentre?type=results"],
    },
    queries: {
      fixtures: ["Betway Premiership fixtures this week", "PSL fixtures kick-off times"],
      results: ["Betway Premiership results", "PSL results full time scores"],
    },
  },
  epl: {
    official: ["premierleague.com"],
    pages: {
      fixtures: ["https://www.premierleague.com/fixtures"],
      results: ["https://www.premierleague.com/results"],
    },
    queries: {
      fixtures: [
        "Premier League fixtures SAST kick-off times South Africa",
        "Premier League fixtures this week kick-off times",
        "Premier League fixtures schedule",
      ],
      results: ["Premier League results", "Premier League full time scores"],
    },
  },
  ucl: {
    official: ["uefa.com"],
    pages: {
      fixtures: ["https://www.uefa.com/uefachampionsleague/fixtures-results/"],
      results: ["https://www.uefa.com/uefachampionsleague/fixtures-results/"],
    },
    queries: {
      fixtures: [
        "Champions League fixtures SAST kick-off times South Africa",
        "Champions League fixtures this week kick-off times",
        "UEFA Champions League matchday schedule",
      ],
      results: ["Champions League results", "UEFA Champions League full time scores"],
    },
  },
  // Owner (13 Nov): the top six leagues South African bettors and tipsters follow: Betway Premiership (PSL),
  // Premier League, Champions League, La Liga, Serie A and the Bundesliga.
  laliga: {
    official: ["laliga.com"],
    pages: {
      fixtures: ["https://www.laliga.com/en-GB/laliga-easports/calendar"],
      results: ["https://www.laliga.com/en-GB/laliga-easports/results"],
    },
    queries: {
      fixtures: [
        "La Liga fixtures SAST kick-off times South Africa",
        "La Liga fixtures this week kick-off times",
        "LaLiga EA Sports matchday schedule",
      ],
      results: ["La Liga results", "LaLiga full time scores"],
    },
  },
  seriea: {
    official: ["legaseriea.it"],
    pages: {
      fixtures: ["https://www.legaseriea.it/en/serie-a/calendar"],
      results: ["https://www.legaseriea.it/en/serie-a/results"],
    },
    queries: {
      fixtures: [
        "Serie A fixtures SAST kick-off times South Africa",
        "Serie A fixtures this week kick-off times",
        "Serie A matchday schedule",
      ],
      results: ["Serie A results", "Serie A full time scores"],
    },
  },
  bundesliga: {
    official: ["bundesliga.com"],
    pages: {
      // products.bundesliga.com prints every kick-off in both CET and UTC, so its times carry a printed zone.
      fixtures: [
        "https://www.bundesliga.com/en/bundesliga/matchday",
        "https://products.bundesliga.com/fixtures",
      ],
      // Same page on purpose: bundesliga.com shows the current matchday's kick-off times and, once played, its
      // scores at one address. Earlier matchdays come from the results queries below.
      results: ["https://www.bundesliga.com/en/bundesliga/matchday"],
    },
    queries: {
      fixtures: [
        "Bundesliga fixtures SAST kick-off times South Africa",
        "Bundesliga fixtures this week kick-off times",
        "Bundesliga matchday schedule",
      ],
      results: ["Bundesliga results", "Bundesliga full time scores"],
    },
  },
  // Wider coverage (owner, 14 Nov): popular leagues, cups and African competitions. SAST queries pull in South
  // African sites that print the zone, so kick-off times can be verified (see corroborate.ts).
  uel: {
    official: ["uefa.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Europa League fixtures SAST kick-off times",
        "UEFA Europa League fixtures this week kick-off times",
      ],
      results: ["Europa League results", "UEFA Europa League full time scores"],
    },
  },
  uecl: {
    official: ["uefa.com"],
    pages: {
      fixtures: [],
      results: [
        "https://www.uefa.com/uefaconferenceleague/fixtures-results/",
        "https://www.uefa.com/uefaconferenceleague/news/02a8-2174cb200f25-b94693ddff4e-1000--2026-27-conference-league-all-the-league-phase-fixtures/",
      ],
    },
    queries: {
      fixtures: [
        "Conference League fixtures SAST kick-off times",
        "UEFA Conference League fixtures this week kick-off times",
      ],
      results: ["Conference League results", "UEFA Conference League full time scores"],
    },
  },
  ligue1: {
    official: ["ligue1.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Ligue 1 fixtures SAST kick-off times",
        "Ligue 1 fixtures this week kick-off times",
      ],
      results: ["Ligue 1 results", "Ligue 1 full time scores"],
    },
  },
  championship: {
    official: ["efl.com"],
    pages: {
      fixtures: [],
      results: ["https://www.efl.com/competitions/efl-championship/"],
    },
    queries: {
      fixtures: [
        "EFL Championship fixtures SAST kick-off times",
        "Championship fixtures this week kick-off times",
      ],
      results: ["EFL Championship results", "Championship full time scores"],
    },
  },
  facup: {
    official: ["thefa.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: ["FA Cup fixtures SAST kick-off times", "FA Cup fixtures kick-off times"],
      results: ["FA Cup results", "FA Cup full time scores"],
    },
  },
  eflcup: {
    official: ["efl.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: ["Carabao Cup fixtures SAST kick-off times", "EFL Cup fixtures kick-off times"],
      results: ["Carabao Cup results", "EFL Cup full time scores"],
    },
  },
  eredivisie: {
    official: ["eredivisie.nl"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Eredivisie fixtures SAST kick-off times",
        "Eredivisie fixtures this week kick-off times",
      ],
      results: ["Eredivisie results", "Eredivisie full time scores"],
    },
  },
  primeira: {
    official: ["ligaportugal.pt"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Liga Portugal fixtures SAST kick-off times",
        "Primeira Liga fixtures this week kick-off times",
      ],
      results: ["Liga Portugal results", "Primeira Liga full time scores"],
    },
  },
  "saudi-pro": {
    official: ["spl.com.sa"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Saudi Pro League fixtures SAST kick-off times",
        "Saudi Pro League fixtures this week kick-off times",
      ],
      results: ["Saudi Pro League results", "Saudi Pro League full time scores"],
    },
  },
  nedbank: {
    official: ["psl.co.za"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: ["Nedbank Cup fixtures kick-off times", "Nedbank Cup fixtures SAST"],
      results: ["Nedbank Cup results", "Nedbank Cup full time scores"],
    },
  },
  "sa-championship": {
    official: ["psl.co.za"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "Motsepe Foundation Championship fixtures kick-off times",
        "Motsepe Foundation Championship fixtures this week",
      ],
      results: [
        "Motsepe Foundation Championship results",
        "Motsepe Foundation Championship scores",
      ],
    },
  },
  "caf-cl": {
    official: ["cafonline.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "CAF Champions League fixtures SAST kick-off times",
        "CAF Champions League fixtures this week",
      ],
      results: ["CAF Champions League results", "CAF Champions League full time scores"],
    },
  },
  "caf-cc": {
    official: ["cafonline.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "CAF Confederation Cup fixtures SAST kick-off times",
        "CAF Confederation Cup fixtures this week",
      ],
      results: ["CAF Confederation Cup results", "CAF Confederation Cup full time scores"],
    },
  },
  afcon: {
    official: ["cafonline.com"],
    // Search only (no full-page reads), so the wider coverage uses Parallel Search excerpts without unnecessary page-extract calls.
    pages: { fixtures: [], results: [] },
    queries: {
      fixtures: [
        "AFCON qualifiers fixtures SAST kick-off times",
        "Africa Cup of Nations fixtures kick-off times",
      ],
      results: ["AFCON qualifiers results", "Africa Cup of Nations full time scores"],
    },
  },
  "bafana-friendlies": {
    official: ["safa.net"],
    pages: {
      fixtures: [],
      results: [
        "https://www.safa.net/general-news/disappointment-as-bafana-are-held-to-a-2-2-draw-by-kenya/",
        "https://www.safa.net/match-centre/fixtures/bafana-bafana-u23-vs-madagascar-u23-2/",
      ],
    },
    queries: {
      fixtures: ["Bafana Bafana next match kick-off time SAST", "Bafana Bafana friendly fixture"],
      results: ["Bafana Bafana result", "Bafana Bafana full time score"],
    },
  },
};

const TRUSTED = [
  "supersport.com",
  "bbc.com",
  "bbc.co.uk",
  "skysports.com",
  "espn.com",
  "theguardian.com",
  "reuters.com",
  "kickoff.com",
  "soccerladuma.co.za",
  "ladumaanalytics.co.za",
  "45min.co.za",
  "sabcsport.com",
  "goal.com",
  "uefa.com",
  "premierleague.com",
  "psl.co.za",
  "laliga.com",
  "legaseriea.it",
  "bundesliga.com",
  "dfb.de",
  "ligue1.com",
  "efl.com",
  "thefa.com",
  "eredivisie.nl",
  "ligaportugal.pt",
  "spl.com.sa",
  "cafonline.com",
  "safa.net",
  "fbref.com",
  "worldfootball.net",
  "transfermarkt.com",
  "flashscore.com",
  "soccerway.com",
  "kicker.de",
  "onefootball.com",
  "football-italia.net",
  "vi.nl",
  "ziggo.nl",
  "sportsmole.co.uk",
  "stat-football.com",
  "rotascore.com",
  "treble.co.za",
  "nasiscore.co.za",
  "topbookmakers.co.za",
  "serieaschedule.com",
  "tntsports.co.uk",
  "tactix.football",
  "footballedgelab.com",
  "cbssports.com",
  "foxsports.com",
  "statz.ai",
  "sportmetrics.org",
  "tribuna.com",
  "ninetyminutesplus.com",
  "theanalyst.com",
  "smartsoccerstats.eu",
  "swissfootballdata.com",
  "keepstandings.com",
  "365scores.com",
  "standings.nz",
  "globalsportsarchive.com",
  "scoremondo.com",
  "zeanball.online",
  "statsfera.com.tr",
  "ligue1schedule.com",
  "sportnewsafrica.com",
  "vavel.com",
  "vavel.fr",
  "foot-africa.com",
  "english.ahram.org.eg",
  "psg.fr",
  "footmercato.net",
];

export function tierOf(domain: string, official: string[]): SourceTier {
  const is = (list: string[]) => list.some((d) => domain === d || domain.endsWith(`.${d}`));
  if (is(official)) return "official";
  return is(TRUSTED) ? "trusted" : "other";
}

const MAX_SOURCES = 6;
const MAX_CHARS = 9_000;
const RESULTS_MIN_GAP_MS = 50 * 60_000;
/** A match that kicked off less than this long ago cannot have a final score yet. */
const RESULTS_EARLIEST_MS = 105 * 60_000;

/**
 * Back-off between results checks for one competition: 50 minutes soon after kick-off, then a third of the time
 * since the earliest open kick-off, capped at six hours so unresolved fixtures remain in the retry cycle.
 */
export function resultsGapMs(sinceKickoffMs: number): number {
  // Keep retrying old unresolved fixtures at least four times per day; a very old fixture must not
  // push its competition's next result check out by multiple days.
  return Math.min(6 * 60 * 60_000, Math.max(RESULTS_MIN_GAP_MS, Math.floor(sinceKickoffMs / 3)));
}

export interface PfieDeps {
  search: SearchProvider;
  extract: ExtractProvider | null;
  llm: LlmProvider;
  store: PfieStore;
  /** Persistent Parallel cache; cache wrappers are applied outside quota guards. */
  cache?: CacheStore | null;
  /** Set before each competition run so API claim events share the same competition/run context. */
  setUsageContext?: (context: { competition: string; jobRunId: string }) => void;
  /** Ordered model list; extraction prefers the high-allowance lite model. */
  models?: string[];
  dailyCap?: Record<string, number>;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export const PFIE_PROVIDER = "pfie";

/** Championship fixture extraction gets one bounded Medium-first retry after the Low response fails JSON parsing. */
export function pfieRetryPreference(
  competitionKey: CompetitionKey,
  kind: "fixtures" | "results",
): string | undefined {
  return competitionKey === "championship" && kind === "fixtures" ? "parallel-medium" : undefined;
}

export function createPfieProvider(deps: PfieDeps): SportsProvider {
  const now = deps.now ?? (() => new Date());
  const models = deps.models ?? ["parallel-low"];

  async function run(
    competition: Competition,
    kind: "fixtures" | "results",
    from: Date,
    to: Date,
    targetFixtures: NonNullable<ListOptions["fixtures"]> = [],
  ): Promise<{ fixtures: NormalisedFixture[]; calls: number; skipped?: string }> {
    const jobRunId = randomUUID();
    deps.setUsageContext?.({ competition: competition.key, jobRunId });
    const config = PFIE_SOURCES[competition.key];
    if (!config) return { fixtures: [], calls: 0, skipped: "no PFIE sources configured" };
    const count = (provider: string, ok: boolean) =>
      deps.store.countUsage(provider, ok ? "ok" : "error").catch(() => undefined);
    let calls = 0;
    const sources: PfieSource[] = [];
    let cachedSearchResponses = 0;
    let cachedExtractResponses = 0;
    const cacheEvent = (event: CacheEvent) => {
      if (event.outcome === "hit" || event.outcome === "deduplicated") {
        if (event.endpoint.startsWith("search:")) cachedSearchResponses++;
        if (event.endpoint.startsWith("extract:")) cachedExtractResponses++;
      }
      console.info("pfie-cache", JSON.stringify({ competition: competition.key, kind, ...event }));
    };
    // These wrappers sit outside guardSearch/guardExtract, so cache hits never consume quota.
    const searchProvider = withSearchCache(deps.search, deps.cache ?? null, kind, cacheEvent);
    const extractProvider = withExtractCache(deps.extract, deps.cache ?? null, kind, cacheEvent);
    try {
      // 1. Discovery.
      const today = sastDate(now());
      calls++;
      const targetedMatches = targetFixtures
        .slice(0, 12)
        .map(
          (fixture) =>
            `${fixture.home} vs ${fixture.away} result score ${sastDate(new Date(fixture.kickoffAt))}`,
        );
      const targetedResultQueries = Array.from(
        { length: Math.ceil(targetedMatches.length / 3) },
        (_, index) =>
          `${competition.name} results and final scores: ${targetedMatches.slice(index * 3, index * 3 + 3).join("; ")}`,
      );
      const resultQueries = targetedResultQueries.length
        ? [...targetedResultQueries, ...config.queries.results.slice(0, 1)].slice(0, 5)
        : config.queries.results.slice(0, 5);
      const hits = await deps.search
        .search({
          objective:
            kind === "fixtures"
              ? `${competition.name} football fixtures from ${sastDate(from)} to ${sastDate(to)} with dates and ` +
                `kick-off times. Prefer the official competition site and established sports news sites.`
              : `${competition.name} football final scores for matches played from ${sastDate(from)} to ` +
                `${today}. ${targetedMatches.length ? `Prioritise these outstanding matches: ${targetedMatches.join("; ")}. ` : ""}` +
                `Prefer the official competition site and established sports news sites.`,
          queries:
            kind === "fixtures"
              ? // Parallel Search takes at most 5 phrasings per call.
                [...config.queries.fixtures, ...(ZONE_QUERIES[competition.key] ?? [])].slice(0, 5)
              : resultQueries,
          maxResults: 10,
        })
        .then(
          (h) => {
            if (cachedSearchResponses > 0) cachedSearchResponses--;
            else void count(searchProvider.name, true);
            return h;
          },
          (e: unknown) => {
            void count(searchProvider.name, false);
            throw e;
          },
        );

      // 2. Sources: official pages read in full first, then the best search hits.
      const seen = new Set<string>();
      const add = (url: string, text: string) => {
        const clean = cleanText(text, MAX_CHARS);
        const domain = domainOf(url);
        if (clean.length < 200 || isBlockedDomain(domain) || seen.has(canonicalUrl(url))) return;
        seen.add(canonicalUrl(url));
        sources.push({ index: 0, url, domain, tier: tierOf(domain, config.official), text: clean });
      };
      if (extractProvider) {
        for (const url of config.pages[kind]) {
          calls++;
          try {
            const page = await extractProvider.extract(url);
            if (cachedExtractResponses > 0) cachedExtractResponses--;
            else void count(extractProvider.name, true);
            if (page) add(url, page.markdown);
          } catch {
            void count(deps.extract.name, false);
          }
        }
      }
      for (const hit of hits) add(hit.url, hit.excerpt);
      const order = { official: 0, trusted: 1, other: 2 } as const;
      sources.sort((a, b) => order[a.tier] - order[b.tier]);
      sources.splice(MAX_SOURCES);
      sources.forEach((s, i) => (s.index = i + 1));
      if (sources.length === 0) throw new Error("no usable source");

      // 3. Extraction. Split long historical pages into bounded chunks so the combined Parallel input
      // (instructions + schema + source text) stays comfortably below the 20,000-character endpoint limit.
      const retryPreference = pfieRetryPreference(competition.key, kind);
      const routerModels = retryPreference
        ? [...new Set([...models, retryPreference])]
        : models;
      const usage = await deps.store.usageToday().catch(() => ({}) as Record<string, number>);
      const usedToday: Record<string, number> = {};
      for (const m of routerModels) {
        const effort = /^parallel-(low|medium|high)$/.exec(m)?.[1];
        usedToday[m] = effort ? (usage[`parallel-chat:${effort}`] ?? 0) : (usage[m] ?? 0);
      }
      const router = createModelRouter(deps.llm, {
        models: routerModels,
        usedToday,
        ...(deps.dailyCap ? { dailyCap: deps.dailyCap } : {}),
        ...(deps.sleep ? { sleep: deps.sleep } : {}),
        onAttempt: async (a) => {
          if (a.outcome !== "skipped_cap" && a.outcome !== "refused_not_free") {
            const effort = /^parallel-(low|medium|high)$/.exec(a.model)?.[1];
            await count(effort ? `parallel-chat:${effort}` : a.model, a.outcome === "ok");
          }
        },
      });

      const raw = [] as NonNullable<ReturnType<typeof parseObservations>>;
      const sourceBatches = chunkSourcesForExtraction(sources);
      let modelUsed: string | null = null;
      for (const batch of sourceBatches) {
        const makeRequest = (batchSources: PfieSource[], retryHint?: string) =>
          extractionRequest({
            competition: competition.name,
            from: sastDate(from),
            to: sastDate(to),
            today,
            sources: batchSources,
            ...(retryHint ? { retryHint } : {}),
          });

        calls++;
        let answer = await router.generate(makeRequest(batch.sources));
        modelUsed = answer.model;
        let parsed = parseObservations(answer.text);
        if (!parsed) {
          // Retry only this bounded chunk with smaller source excerpts; all quotes are validated against
          // the original, complete page text below.
          calls++;
          const retrySources = batch.sources.map((source) => ({
            ...source,
            text: source.text.slice(0, 3_000),
          }));
          answer = await router.generate(
            makeRequest(
              retrySources,
              "The previous response was not valid JSON or did not match the required schema.",
            ),
            retryPreference,
          );
          modelUsed = answer.model;
          parsed = parseObservations(answer.text);
        }
        if (!parsed) throw new Error("extraction answer was not valid JSON after one chunk retry");
        raw.push(
          ...parsed.map((observation) => ({
            ...observation,
            source: batch.sourceIndexByChunk[observation.source] ?? observation.source,
          })),
        );
      }
      // 4. Validation and corroboration: code only.
      const { accepted, rejected } = validateObservations(raw, sources, {
        from,
        to,
        now: now(),
        homeZone: HOME_ZONES[competition.key] ?? null,
      });
      const known = await deps.store.knownFixtures(
        competition.name,
        new Date(from.getTime() - 3 * 86_400_000),
        new Date(to.getTime() + 3 * 86_400_000),
      );
      const { decisions, ambiguous } = corroborate({
        competitionKey: competition.key,
        season: seasonFor(competition.seasonRule, from),
        observations: accepted,
        known,
      });
      for (const o of ambiguous) rejected.push({ raw: o, reason: "ambiguous_team_name" });

      await deps.store
        .recordRun({
          jobRunId,
          competition: competition.key,
          kind,
          ok: true,
          ...(modelUsed ? { model: modelUsed } : {}),
          sources,
          accepted,
          rejected,
          decisions,
        })
        .catch((e: unknown) => console.error("pfie: could not record run", e));

      return {
        fixtures: decisions.filter((d) => d.publish).map((d) => toFixture(d, competition)),
        calls,
      };
    } catch (error) {
      const message =
        error instanceof ProviderError || error instanceof AllModelsFailed || error instanceof Error
          ? error.message.slice(0, 300)
          : "unexpected error";
      await deps.store
        .recordRun({
          jobRunId,
          competition: competition.key,
          kind,
          ok: false,
          error: message,
          sources,
          accepted: [],
          rejected: [],
          decisions: [],
        })
        .catch(() => undefined);
      return { fixtures: [], calls, skipped: `failed: ${message}` };
    }
  }

  function selected(opts?: ListOptions): Competition[] {
    return activeCompetitions().filter(
      (c) =>
        c.sport === "soccer" &&
        isPfieLaunchCompetition(c.key) &&
        PFIE_SOURCES[c.key] &&
        (!opts?.only || opts.only.includes(c.key)),
    );
  }

  async function prioritizeByMemberInterest(items: Competition[]): Promise<Competition[]> {
    try {
      const { getPfieLearningSignals } = await import("./learning.server");
      const signals = await getPfieLearningSignals(100);
      const score = new Map<string, number>();
      for (const signal of signals) {
        if (!signal.competition) continue;
        const key = signal.competition.trim().toLocaleLowerCase();
        const value = signal.pseudonymous_participants * 1000 + signal.interactions;
        score.set(key, Math.max(score.get(key) ?? 0, value));
      }
      // Reorder only: every selected competition is still processed and validation rules are unchanged.
      return [...items].sort(
        (a, b) =>
          (score.get(b.name.trim().toLocaleLowerCase()) ?? 0) -
          (score.get(a.name.trim().toLocaleLowerCase()) ?? 0),
      );
    } catch {
      // Learning data is an optional prioritisation signal, never a dependency for PFIE facts.
      return items;
    }
  }
  return {
    name: PFIE_PROVIDER,
    async listFixtures(from, to, opts): Promise<ListResult> {
      const out: ListResult = { fixtures: [], calls: 0, skipped: [] };
      for (const c of await prioritizeByMemberInterest(selected(opts))) {
        const r = await run(c, "fixtures", from, to);
        out.fixtures.push(...r.fixtures);
        out.calls += r.calls;
        if (r.skipped) out.skipped.push({ key: c.key, reason: r.skipped });
      }
      return out;
    },
    async listResults(from, to, opts): Promise<ListResult> {
      const out: ListResult = { fixtures: [], calls: 0, skipped: [] };
      if (now().getTime() - from.getTime() < RESULTS_EARLIEST_MS) {
        for (const c of selected(opts))
          out.skipped.push({ key: c.key, reason: "too early for a final score" });
        return out;
      }
      for (const c of await prioritizeByMemberInterest(selected(opts))) {
        const last = await deps.store.lastRunAt(c.key, "results").catch(() => null);
        const gap = resultsGapMs(now().getTime() - from.getTime());
        if (!opts?.force && last && now().getTime() - last.getTime() < gap) {
          out.skipped.push({
            key: c.key,
            reason: `checked less than ${Math.round(gap / 60_000)} minutes ago`,
          });
          continue;
        }
        const r = await run(c, "results", from, to, opts?.fixtures ?? []);
        // Only results: a results run never creates or moves a fixture.
        out.fixtures.push(...r.fixtures.filter((f) => f.status !== "scheduled"));
        out.calls += r.calls;
        if (r.skipped) out.skipped.push({ key: c.key, reason: r.skipped });
      }
      return out;
    },
  };
}

function toFixture(d: Decision, competition: Competition): NormalisedFixture {
  return {
    provider: PFIE_PROVIDER,
    providerRef: d.providerRef ?? "",
    sport: "soccer",
    competition: competition.name,
    home: d.home,
    away: d.away,
    kickoffAt: d.kickoffAt ?? "",
    status: d.status,
    homeScore: d.homeScore,
    awayScore: d.awayScore,
  };
}
