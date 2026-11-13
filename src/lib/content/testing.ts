/** In-memory doubles for the content engine tests and for dry runs without credentials. Never used in production. */
import type {
  ArticleDraft,
  ContentSettings,
  ContentStore,
  ExtractProvider,
  JobStatus,
  LlmProvider,
  LlmRequest,
  ProjectUpdate,
  SearchHit,
  SearchProvider,
} from "./types";

export interface MemoryStore extends ContentStore {
  jobs: Map<
    string,
    { id: string; key: string; status: JobStatus; attempt: number; error?: string }
  >;
  logs: { stage: string; level: string; message: string }[];
  articles: {
    id: string;
    jobId: string;
    status: string;
    title: string;
    slug: string;
    citedSources: number;
  }[];
  usage: Record<string, number>;
  state: { settings: ContentSettings; updates: ProjectUpdate[]; titles: string[] };
}

export function memoryStore(overrides: Partial<ContentSettings> = {}): MemoryStore {
  const store: MemoryStore = {
    jobs: new Map(),
    logs: [],
    articles: [],
    usage: {},
    state: {
      settings: {
        enabled: true,
        autoPublish: true,
        minQuality: 85,
        scheduleMode: "sports",
        nextKindOverride: null,
        ...overrides,
      },
      updates: [],
      titles: [],
    },
    async settings() {
      return store.state.settings;
    },
    async claimJob({ jobKey, force }) {
      const existing = store.jobs.get(jobKey);
      if (existing) {
        const retry = existing.status === "failed" && (existing.attempt < 3 || force);
        if (!retry) return null;
        existing.status = "running";
        existing.attempt += 1;
        return { id: existing.id, attempt: existing.attempt };
      }
      const job = {
        id: `job-${store.jobs.size + 1}`,
        key: jobKey,
        status: "running" as JobStatus,
        attempt: 1,
      };
      store.jobs.set(jobKey, job);
      return { id: job.id, attempt: 1 };
    },
    async log(_jobId, stage, level, message) {
      store.logs.push({ stage, level, message });
    },
    async finishJob(jobId, result) {
      for (const job of store.jobs.values()) {
        if (job.id !== jobId) continue;
        job.status = result.status;
        if (result.error) job.error = result.error;
      }
    },
    async recentTitles() {
      return [...store.state.titles, ...store.articles.map((a) => a.title)].map((title) => ({
        title,
        slug: "x",
      }));
    },
    async pendingProjectUpdates() {
      return store.state.updates;
    },
    async saveArticle({ jobId, article, usedSourceIndexes }) {
      const id = `article-${store.articles.length + 1}`;
      store.articles.push({
        id,
        jobId,
        status: article.status,
        title: article.title,
        slug: article.slug,
        citedSources: usedSourceIndexes.length,
      });
      return { id };
    },
    async countUsage(provider) {
      store.usage[provider] = (store.usage[provider] ?? 0) + 1;
    },
    async usageToday() {
      return { ...store.usage };
    },
    async clearKindOverride() {
      store.state.settings = { ...store.state.settings, nextKindOverride: null };
    },
  };
  return store;
}

const PAGE_A =
  "Mamelodi Sundowns beat Orlando Pirates 2-1 at Loftus Versfeld on Saturday to move top of the Betway " +
  "Premiership. Peter Shalulile scored twice in the first half before Pirates pulled one back after the break. " +
  "The result leaves Sundowns on 27 points after 12 matches. Coach Miguel Cardoso said the team showed character " +
  "in a difficult second half and would need to recover quickly for the midweek trip.";
const PAGE_B =
  "Orlando Pirates lost 2-1 away to Mamelodi Sundowns and slipped to second place in the league table. " +
  "Pirates host Kaizer Chiefs in the Soweto derby at FNB Stadium next. Tickets for the derby went on sale on " +
  "Monday and the club expects a full house. Pirates have 25 points from 12 matches this season.";

export const SAMPLE_HITS: SearchHit[] = [
  {
    url: "https://www.psl.co.za/news/sundowns-pirates",
    title: "Sundowns go top",
    excerpt: PAGE_A,
    publishedAt: null,
  },
  {
    url: "https://supersport.com/football/pirates-derby",
    title: "Pirates slip",
    excerpt: PAGE_B,
    publishedAt: null,
  },
  { url: "https://www.surebets.example/tips", title: "Tips", excerpt: PAGE_A, publishedAt: null },
];

export function sampleDraft(overrides: Partial<ArticleDraft> = {}): ArticleDraft {
  const paragraph =
    "Mamelodi Sundowns are top of the Betway Premiership after beating Orlando Pirates 2-1 at Loftus Versfeld. " +
    "Peter Shalulile scored twice in the first half, and Pirates could only pull one back after the break. " +
    "Sundowns now have 27 points from 12 matches, with Pirates on 25 points and down to second place.";
  return {
    title: "Sundowns go top of the Betway Premiership after beating Pirates",
    excerpt:
      "A first-half double from Peter Shalulile put Mamelodi Sundowns top of the table and left Orlando Pirates in second place before the Soweto derby.",
    body: [
      paragraph,
      "## What it means",
      paragraph.replace("are top", "sit top"),
      "## What comes next",
      "Pirates host Kaizer Chiefs in the Soweto derby at FNB Stadium next, and the club expects a full house. " +
        paragraph.replace("are top", "stay top"),
      paragraph.replace("are top", "remain top"),
      paragraph.replace("are top", "finish the weekend top"),
      paragraph.replace("are top", "end the round top"),
    ].join("\n\n"),
    tags: ["betway premiership", "sundowns", "pirates"],
    seoTitle: "Sundowns go top after beating Pirates",
    seoDescription:
      "Peter Shalulile scored twice as Mamelodi Sundowns beat Orlando Pirates to go top of the Betway Premiership.",
    claims: [
      {
        text: "Sundowns beat Pirates 2-1",
        source: 1,
        quote: "beat Orlando Pirates 2-1 at Loftus Versfeld",
      },
      {
        text: "Shalulile scored twice",
        source: 1,
        quote: "Peter Shalulile scored twice in the first half",
      },
      {
        text: "Sundowns have 27 points",
        source: 1,
        quote: "Sundowns on 27 points after 12 matches",
      },
      {
        text: "Pirates are second",
        source: 2,
        quote: "slipped to second place in the league table",
      },
      { text: "Derby is next", source: 2, quote: "Pirates host Kaizer Chiefs in the Soweto derby" },
    ],
    ...overrides,
  };
}

export function fakeSearch(hits: SearchHit[] | Error = SAMPLE_HITS): SearchProvider {
  return {
    name: "parallel",
    async search() {
      if (hits instanceof Error) throw hits;
      return hits;
    },
  };
}

export function fakeExtract(fail = false): ExtractProvider {
  return {
    name: "firecrawl",
    async extract(url) {
      if (fail) throw new Error("extract down");
      const hit = SAMPLE_HITS.find((h) => url.startsWith(h.url));
      return hit ? { markdown: hit.excerpt, title: hit.title } : null;
    },
  };
}

type Script = (model: string, request: LlmRequest, call: number) => string | Error;

/** A scripted model. By default it writes the sample draft and its reviews find nothing unsupported. */
export function fakeLlm(
  script?: Script,
): LlmProvider & { calls: { model: string; review: boolean }[] } {
  const calls: { model: string; review: boolean }[] = [];
  return {
    name: "gemini",
    calls,
    async generate(model, request) {
      const review = request.system.startsWith("You are a fact checker");
      calls.push({ model, review });
      const scripted = script?.(model, request, calls.length);
      if (scripted instanceof Error) throw scripted;
      const text =
        scripted ?? (review ? JSON.stringify({ unsupported: [] }) : JSON.stringify(sampleDraft()));
      return { model, text };
    },
  };
}
