/**
 * PFIE fixtures provider: Parallel Search finds the pages, Gemini lists what each page states, and plain code
 * validates and corroborates. It implements the same `SportsProvider` interface as the API-Sports adapter, so the
 * existing sync, settlement and cron code runs unchanged.
 *
 * This is not a live-score feed. Fixtures refresh once a day; a result is published when the competition's official
 * site shows it or two independent sites agree, usually within an hour or two of full time.
 */
import { DEFAULT_PFIE_MODELS, parseModelList } from "@/lib/content/config";
import { ProviderError } from "@/lib/content/http";
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
import { extractionRequest, parseObservations, validateObservations } from "./extract";
import type { Decision, PfieSource, PfieStore, SourceTier } from "./types";

interface CompetitionSources {
  /** The competition's own site: authoritative. */
  official: string[];
  /** Official pages read in full on every run, when an extraction provider is configured. */
  pages: { fixtures: string[]; results: string[] };
  queries: { fixtures: string[]; results: string[] };
}

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
      fixtures: ["La Liga fixtures this week kick-off times", "LaLiga EA Sports matchday schedule"],
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
      fixtures: ["Serie A fixtures this week kick-off times", "Serie A matchday schedule"],
      results: ["Serie A results", "Serie A full time scores"],
    },
  },
  bundesliga: {
    official: ["bundesliga.com"],
    pages: {
      fixtures: ["https://www.bundesliga.com/en/bundesliga/matchday"],
      // Same page on purpose: bundesliga.com shows the current matchday's kick-off times and, once played, its
      // scores at one address. Earlier matchdays come from the results queries below.
      results: ["https://www.bundesliga.com/en/bundesliga/matchday"],
    },
    queries: {
      fixtures: ["Bundesliga fixtures this week kick-off times", "Bundesliga matchday schedule"],
      results: ["Bundesliga results", "Bundesliga full time scores"],
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
  "sabcsport.com",
  "goal.com",
  "uefa.com",
  "premierleague.com",
  "psl.co.za",
  "laliga.com",
  "legaseriea.it",
  "bundesliga.com",
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

export interface PfieDeps {
  search: SearchProvider;
  extract: ExtractProvider | null;
  llm: LlmProvider;
  store: PfieStore;
  /** Ordered model list; extraction prefers the high-allowance lite model. */
  models?: string[];
  dailyCap?: Record<string, number>;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export const PFIE_PROVIDER = "pfie";

export function createPfieProvider(deps: PfieDeps): SportsProvider {
  const now = deps.now ?? (() => new Date());
  const models = deps.models ?? parseModelList(DEFAULT_PFIE_MODELS.join(",")).models;

  async function run(
    competition: Competition,
    kind: "fixtures" | "results",
    from: Date,
    to: Date,
  ): Promise<{ fixtures: NormalisedFixture[]; calls: number; skipped?: string }> {
    const config = PFIE_SOURCES[competition.key];
    if (!config) return { fixtures: [], calls: 0, skipped: "no PFIE sources configured" };
    const count = (provider: string, ok: boolean) =>
      deps.store.countUsage(provider, ok ? "ok" : "error").catch(() => undefined);
    let calls = 0;
    const sources: PfieSource[] = [];
    try {
      // 1. Discovery.
      const today = sastDate(now());
      calls++;
      const hits = await deps.search
        .search({
          objective:
            kind === "fixtures"
              ? `${competition.name} football fixtures from ${sastDate(from)} to ${sastDate(to)} with dates and ` +
                `kick-off times. Prefer the official competition site and established sports news sites.`
              : `${competition.name} football final scores for matches played from ${sastDate(from)} to ` +
                `${today}. Prefer the official competition site and established sports news sites.`,
          queries: config.queries[kind],
          maxResults: 10,
        })
        .then(
          (h) => (count(deps.search.name, true), h),
          (e: unknown) => {
            void count(deps.search.name, false);
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
      if (deps.extract) {
        for (const url of config.pages[kind]) {
          calls++;
          try {
            const page = await deps.extract.extract(url);
            void count(deps.extract.name, true);
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

      // 3. Extraction (one model call for all sources).
      const usage = await deps.store.usageToday().catch(() => ({}) as Record<string, number>);
      const usedToday: Record<string, number> = {};
      for (const m of models) usedToday[m] = usage[`gemini:${m}`] ?? 0;
      const router = createModelRouter(deps.llm, {
        models,
        usedToday,
        ...(deps.dailyCap ? { dailyCap: deps.dailyCap } : {}),
        ...(deps.sleep ? { sleep: deps.sleep } : {}),
        onAttempt: async (a) => {
          if (a.outcome !== "skipped_cap" && a.outcome !== "refused_not_free")
            await count(`gemini:${a.model}`, a.outcome === "ok");
        },
      });
      calls++;
      const answer = await router.generate(
        extractionRequest({
          competition: competition.name,
          from: sastDate(from),
          to: sastDate(to),
          today,
          sources,
        }),
      );
      const raw = parseObservations(answer.text);
      if (!raw) throw new Error("extraction answer was not valid JSON");

      // 4. Validation and corroboration: code only.
      const { accepted, rejected } = validateObservations(raw, sources, { from, to, now: now() });
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
          competition: competition.key,
          kind,
          ok: true,
          model: answer.model,
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
        c.sport === "soccer" && PFIE_SOURCES[c.key] && (!opts?.only || opts.only.includes(c.key)),
    );
  }

  return {
    name: PFIE_PROVIDER,
    async listFixtures(from, to, opts): Promise<ListResult> {
      const out: ListResult = { fixtures: [], calls: 0, skipped: [] };
      for (const c of selected(opts)) {
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
      for (const c of selected(opts)) {
        const last = await deps.store.lastRunAt(c.key, "results").catch(() => null);
        if (last && now().getTime() - last.getTime() < RESULTS_MIN_GAP_MS) {
          out.skipped.push({ key: c.key, reason: "checked less than 50 minutes ago" });
          continue;
        }
        const r = await run(c, "results", from, to);
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
