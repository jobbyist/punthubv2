import { describe, expect, it } from "vitest";

import {
  missingCredentials,
  parseDailyCaps,
  parseModelList,
  readContentEnv,
  redact,
} from "./config";
import { backoffDelay, classifyStatus, postJson, ProviderError } from "./http";
import { AllModelsFailed, createModelRouter } from "./model-router";
import { runContentJob, type PipelineDeps } from "./pipeline";
import { parseReview, reviewRequest } from "./prompt";
import { canonicalUrl, isBlockedDomain, projectSources, rankHits, toSource } from "./research";
import { dailyJobKey, kindForDay, nextRunAt } from "./schedule";
import { fakeExtract, fakeLlm, fakeSearch, memoryStore, SAMPLE_HITS, sampleDraft } from "./testing";
import type { LlmRequest, ResearchSource } from "./types";
import {
  numberTokens,
  parseDraft,
  quotedPassages,
  slugFor,
  titleSimilarity,
  validateDraft,
} from "./validate";

const noSleep = async () => undefined;
const REQUEST: LlmRequest = {
  system: "s",
  prompt: "p",
  schema: {},
  temperature: 0,
  maxOutputTokens: 10,
};
const quota = () => new ProviderError("gemini", "quota", 429, "quota exhausted");

function sources(): ResearchSource[] {
  return rankHits(SAMPLE_HITS, 6).map((hit, i) => toSource(i + 1, hit, null));
}

function deps(overrides: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    store: memoryStore(),
    env: readContentEnv({
      GEMINI_API_KEY: "g-key-123456",
      PARALLEL_API_KEY: "p-key-123456",
      FIRECRAWL_API_KEY: "f",
    }),
    search: fakeSearch(),
    extract: fakeExtract(),
    llm: fakeLlm(),
    now: () => new Date("2026-11-14T04:00:00Z"),
    sleep: noSleep,
    ...overrides,
  };
}

describe("config", () => {
  it("defaults to the two free models, primary first", () => {
    expect(parseModelList(undefined).models).toEqual(["gemini-3.8-flash", "gemini-3.1-flash-lite"]);
  });
  it("refuses a model that is not on the free list", () => {
    const { models, refused } = parseModelList("gemini-3.1-pro-preview, gemini-3.1-flash-lite");
    expect(models).toEqual(["gemini-3.1-flash-lite"]);
    expect(refused).toEqual(["gemini-3.1-pro-preview"]);
  });
  it("reads daily caps and ignores bad entries", () => {
    expect(parseDailyCaps("gemini-3.8-flash=20, x=abc, gemini-3.1-flash-lite=500")).toEqual({
      "gemini-3.8-flash": 20,
      "gemini-3.1-flash-lite": 500,
    });
  });
  it("names the missing credentials per article kind", () => {
    const env = readContentEnv({});
    expect(missingCredentials(env, "sports")).toEqual(["GEMINI_API_KEY", "PARALLEL_API_KEY"]);
    expect(missingCredentials(env, "development")).toEqual(["GEMINI_API_KEY"]);
  });
  it("never shows a whole secret", () => {
    expect(redact("AIzaSyExampleExampleExample")).toBe("AI…le");
    expect(redact(null)).toBe("(not set)");
  });
});

describe("http", () => {
  it("classifies statuses", () => {
    expect(classifyStatus(200)).toBeNull();
    expect(classifyStatus(429)).toBe("quota");
    expect(classifyStatus(402)).toBe("quota");
    expect(classifyStatus(401)).toBe("auth");
    expect(classifyStatus(503)).toBe("unavailable");
    expect(classifyStatus(400)).toBe("bad_request");
  });
  it("backs off exponentially with a ceiling", () => {
    expect([1, 2, 3, 6].map((n) => backoffDelay(n, 1000))).toEqual([1000, 2000, 4000, 8000]);
  });
  it("retries a 503 and then succeeds", async () => {
    let n = 0;
    const fetchImpl = (async () =>
      ++n === 1
        ? new Response("down", { status: 503 })
        : Response.json({ ok: true })) as unknown as typeof fetch;
    const json = await postJson(
      "https://x.test",
      {},
      {},
      { provider: "p", timeoutMs: 100, attempts: 3, baseDelayMs: 1, fetchImpl, sleep: noSleep },
    );
    expect(json).toEqual({ ok: true });
    expect(n).toBe(2);
  });
  it("does not retry a quota error and keeps the key out of the message", async () => {
    let n = 0;
    const fetchImpl = (async () => (
      ++n,
      new Response("limit", { status: 429 })
    )) as unknown as typeof fetch;
    const error = await postJson(
      "https://x.test",
      { "x-api-key": "SECRET-KEY" },
      {},
      { provider: "p", timeoutMs: 100, attempts: 3, baseDelayMs: 1, fetchImpl, sleep: noSleep },
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("quota");
    expect((error as ProviderError).message).not.toContain("SECRET-KEY");
    expect(n).toBe(1);
  });
  it("turns a hung request into a timeout", async () => {
    const fetchImpl = ((_: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
        );
      })) as unknown as typeof fetch;
    const error = await postJson(
      "https://x.test",
      {},
      {},
      { provider: "p", timeoutMs: 5, attempts: 1, baseDelayMs: 1, fetchImpl, sleep: noSleep },
    ).catch((e: unknown) => e);
    expect((error as ProviderError).kind).toBe("timeout");
  });
});

describe("model router", () => {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  it("uses the primary model when it works", async () => {
    const llm = fakeLlm(() => "{}");
    const out = await createModelRouter(llm, { models, sleep: noSleep }).generate(REQUEST);
    expect(out.model).toBe("gemini-3.8-flash");
  });
  it("falls back when the primary is out of quota", async () => {
    const llm = fakeLlm((model) => (model === "gemini-3.8-flash" ? quota() : "{}"));
    const out = await createModelRouter(llm, { models, sleep: noSleep }).generate(REQUEST);
    expect(out.model).toBe("gemini-3.1-flash-lite");
    expect(out.attempts.map((a) => a.outcome)).toEqual(["quota", "ok"]);
  });
  it("retries a timeout once on the same model before falling back", async () => {
    const llm = fakeLlm((model) =>
      model === "gemini-3.8-flash" ? new ProviderError("gemini", "timeout", null, "slow") : "{}",
    );
    const out = await createModelRouter(llm, { models, sleep: noSleep }).generate(REQUEST);
    expect(llm.calls.map((c) => c.model)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
    ]);
    expect(out.model).toBe("gemini-3.1-flash-lite");
  });
  it("skips a model that has reached its own daily ceiling without calling it", async () => {
    const llm = fakeLlm(() => "{}");
    const router = createModelRouter(llm, {
      models,
      usedToday: { "gemini-3.8-flash": 20 },
      dailyCap: { "gemini-3.8-flash": 20 },
      sleep: noSleep,
    });
    const out = await router.generate(REQUEST);
    expect(llm.calls.map((c) => c.model)).toEqual(["gemini-3.1-flash-lite"]);
    expect(out.attempts[0]?.outcome).toBe("skipped_cap");
  });
  it("never calls a model outside the free list", async () => {
    const llm = fakeLlm(() => "{}");
    const router = createModelRouter(llm, { models: ["gemini-3.1-pro-preview"], sleep: noSleep });
    await expect(router.generate(REQUEST)).rejects.toBeInstanceOf(AllModelsFailed);
    expect(llm.calls).toHaveLength(0);
  });
  it("throws AllModelsFailed when both models fail", async () => {
    const router = createModelRouter(
      fakeLlm(() => quota()),
      { models, sleep: noSleep },
    );
    await expect(router.generate(REQUEST)).rejects.toBeInstanceOf(AllModelsFailed);
  });
});

describe("schedule", () => {
  const base = { scheduleMode: "alternate" as const, nextKindOverride: null };
  it("keys the job on the South African date", () => {
    expect(dailyJobKey(new Date("2026-11-13T22:30:00Z"))).toBe("daily:2026-11-14");
  });
  it("alternates day by day", () => {
    const a = kindForDay(base, true, new Date("2026-11-14T04:00:00Z")).kind;
    const b = kindForDay(base, true, new Date("2026-11-15T04:00:00Z")).kind;
    expect(new Set([a, b])).toEqual(new Set(["sports", "development"]));
  });
  it("never schedules development news without an approved update", () => {
    for (const day of ["2026-11-14", "2026-11-15"]) {
      expect(kindForDay(base, false, new Date(`${day}T04:00:00Z`)).kind).toBe("sports");
    }
    expect(kindForDay({ ...base, nextKindOverride: "development" }, false).kind).toBe("sports");
  });
  it("lets an administrator override the rotation", () => {
    expect(kindForDay({ ...base, nextKindOverride: "development" }, true).kind).toBe("development");
  });
  it("runs next at 04:00 UTC, which is 06:00 SAST", () => {
    expect(nextRunAt(new Date("2026-11-13T12:00:00Z")).toISOString()).toBe(
      "2026-11-14T04:00:00.000Z",
    );
    expect(nextRunAt(new Date("2026-11-13T03:00:00Z")).toISOString()).toBe(
      "2026-11-13T04:00:00.000Z",
    );
  });
});

describe("research", () => {
  it("blocks bookmaker, tipster and social pages", () => {
    expect(isBlockedDomain("surebets.example")).toBe(true);
    expect(isBlockedDomain("x.com")).toBe(true);
    expect(isBlockedDomain("psl.co.za")).toBe(false);
  });
  it("drops tracking parameters", () => {
    expect(canonicalUrl("https://a.test/p/?utm_source=x&id=2#top")).toBe("https://a.test/p/?id=2");
  });
  it("removes duplicates and blocked pages, official sources first", () => {
    const hits = [
      ...SAMPLE_HITS,
      { ...SAMPLE_HITS[0]!, url: `${SAMPLE_HITS[0]!.url}?utm_source=feed` },
    ];
    expect(rankHits(hits, 6).map((h) => h.url)).toEqual([SAMPLE_HITS[0]!.url, SAMPLE_HITS[1]!.url]);
  });
  it("builds development sources only from approved updates", () => {
    const s = projectSources([
      {
        id: "1",
        title: "Practice Mode live",
        detail: "Season one started for Founding Members.",
        happenedOn: "2026-11-11",
      },
    ]);
    expect(s[0]?.via).toBe("project");
    expect(s[0]?.text).toContain("Season one started");
  });
});

describe("quality gate", () => {
  const check = (draft = sampleDraft(), extra: Partial<Parameters<typeof validateDraft>[0]> = {}) =>
    validateDraft({ draft, kind: "sports", sources: sources(), recentTitles: [], ...extra });
  const codes = (r: ReturnType<typeof validateDraft>) => r.issues.map((i) => i.code);

  it("passes a fully sourced article", () => {
    const report = check();
    expect(report.issues).toEqual([]);
    expect(report.score).toBe(100);
  });
  it("rejects an answer that is not the expected JSON", () => {
    expect(parseDraft("Sure! Here is your article")).toBeNull();
    expect(parseDraft(JSON.stringify({ title: "x" }))).toBeNull();
    expect(parseDraft(JSON.stringify(sampleDraft()))?.claims).toHaveLength(5);
  });
  it("blocks a supporting quote that is not in the source", () => {
    const draft = sampleDraft();
    draft.claims[0] = {
      text: "made up",
      source: 1,
      quote: "Sundowns won the league title on Saturday",
    };
    const report = check(draft);
    expect(report.critical).toBe(true);
    expect(codes(report)).toContain("claim_not_in_source");
  });
  it("blocks a number that appears in no source", () => {
    const draft = sampleDraft();
    draft.body += "\n\nA crowd of 45000 watched the match.";
    expect(codes(check(draft))).toContain("number_not_in_sources");
  });
  it("blocks an invented quotation", () => {
    const draft = sampleDraft();
    draft.body += '\n\nThe coach said: "We are the best team in Africa by a distance."';
    expect(codes(check(draft))).toContain("quotation_not_in_sources");
  });
  it("blocks an article sourced from one site only", () => {
    const draft = sampleDraft();
    draft.claims = draft.claims.filter((c) => c.source === 1);
    expect(codes(check(draft))).toEqual(expect.arrayContaining(["few_claims", "thin_sourcing"]));
  });
  it("blocks house-rule breaches", () => {
    const draft = sampleDraft();
    draft.body += "\n\nThis is a guaranteed result.";
    expect(codes(check(draft))).toContain("banned_phrase");
  });
  it("blocks a near-duplicate of a published article", () => {
    const report = check(sampleDraft(), {
      recentTitles: ["Sundowns go top of the Betway Premiership after beating Pirates again"],
    });
    expect(codes(report)).toContain("duplicate_title");
  });
  it("blocks anything the independent reviewer could not support", () => {
    expect(check(sampleDraft(), { reviewerUnsupported: ["Pirates have 30 points"] }).critical).toBe(
      true,
    );
  });
  it("marks a prediction stated as fact and lowers the score", () => {
    const draft = sampleDraft();
    draft.body += "\n\nPirates will win the derby.";
    const report = check(draft);
    expect(codes(report)).toContain("prediction_as_fact");
    expect(report.critical).toBe(false);
    expect(report.score).toBe(85);
  });
  it("caps the score of an article with a critical issue below any publishing threshold", () => {
    const draft = sampleDraft({ title: "Short" });
    expect(check(draft).score).toBeLessThan(50);
  });
  it("has working helpers", () => {
    expect(numberTokens("won 2–1 in 2026, 3 points")).toEqual(["2-1", "2026"]);
    expect(quotedPassages('He said "we showed real character today" after')).toEqual([
      "we showed real character today",
    ]);
    expect(titleSimilarity("Sundowns go top", "Chiefs sign striker")).toBe(0);
    expect(slugFor("Sundowns go top: 2–1!", "2026-11-14")).toBe("sundowns-go-top-2-1-2026-11-14");
    expect(slugFor("Sundowns go top: 2–1!", "2026-11-14")).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(parseReview('{"unsupported":["a",""]}')).toEqual(["a"]);
    expect(parseReview("nope")).toBeNull();
    expect(reviewRequest(sampleDraft(), sources()).temperature).toBe(0);
  });
});

describe("pipeline", () => {
  it("researches, writes, reviews with the other model, and publishes", async () => {
    const d = deps();
    const store = d.store as ReturnType<typeof memoryStore>;
    const llm = d.llm as ReturnType<typeof fakeLlm>;
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out.status).toBe("published");
    expect(llm.calls).toEqual([
      { model: "gemini-3.8-flash", review: false },
      { model: "gemini-3.1-flash-lite", review: true },
    ]);
    expect(store.articles).toHaveLength(1);
    expect(store.articles[0]).toMatchObject({ status: "PUBLISHED", citedSources: 2 });
    expect([...store.jobs.values()][0]?.status).toBe("succeeded");
    expect(store.usage).toMatchObject({ parallel: 1, firecrawl: 2, "gemini:gemini-3.8-flash": 1 });
  });
  it("is idempotent: a second call for the same day does nothing", async () => {
    const d = deps();
    await runContentJob(d, { trigger: "cron" });
    const again = await runContentJob(d, { trigger: "cron" });
    expect(again.status).toBe("already_ran");
    expect((d.store as ReturnType<typeof memoryStore>).articles).toHaveLength(1);
  });
  it("does nothing on the schedule while the engine is switched off", async () => {
    const d = deps({ store: memoryStore({ enabled: false }) });
    expect((await runContentJob(d, { trigger: "cron" })).status).toBe("disabled");
    expect((d.llm as ReturnType<typeof fakeLlm>).calls).toHaveLength(0);
  });
  it("queues for review instead of publishing when automatic publishing is off", async () => {
    const d = deps({ store: memoryStore({ autoPublish: false }) });
    expect((await runContentJob(d, { trigger: "cron" })).status).toBe("queued_for_review");
    expect((d.store as ReturnType<typeof memoryStore>).articles[0]?.status).toBe("REVIEW");
  });
  it("queues for review when the quality gate finds a critical issue", async () => {
    const bad = sampleDraft();
    bad.body += "\n\nA crowd of 45000 watched.";
    const d = deps({
      llm: fakeLlm((_m, r) =>
        r.system.startsWith("You are a fact checker") ? '{"unsupported":[]}' : JSON.stringify(bad),
      ),
    });
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out.status).toBe("queued_for_review");
    expect(out.ok && "quality" in out && out.quality.critical).toBe(true);
  });
  it("queues for review when the independent review cannot run", async () => {
    const d = deps({
      llm: fakeLlm((_m, r) =>
        r.system.startsWith("You are a fact checker") ? quota() : JSON.stringify(sampleDraft()),
      ),
    });
    expect((await runContentJob(d, { trigger: "cron" })).status).toBe("queued_for_review");
  });
  it("falls back to the second model when the primary is out of quota", async () => {
    const d = deps({
      llm: fakeLlm((model, r) =>
        model === "gemini-3.8-flash"
          ? quota()
          : r.system.startsWith("You are a fact checker")
            ? '{"unsupported":[]}'
            : JSON.stringify(sampleDraft()),
      ),
    });
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out.ok && "model" in out && out.model).toBe("gemini-3.1-flash-lite");
  });
  it("records a failure and saves nothing when every model fails", async () => {
    const d = deps({ llm: fakeLlm(() => quota()) });
    const store = d.store as ReturnType<typeof memoryStore>;
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out).toMatchObject({ ok: false, status: "failed" });
    expect(store.articles).toHaveLength(0);
    expect([...store.jobs.values()][0]).toMatchObject({ status: "failed" });
    expect(store.logs.some((l) => l.level === "error")).toBe(true);
  });
  it("records a failure when the model twice returns something that is not an article", async () => {
    const d = deps({ llm: fakeLlm(() => "I cannot help with that") });
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out.ok === false && out.error).toContain("invalid_generated_content");
    expect((d.store as ReturnType<typeof memoryStore>).articles).toHaveLength(0);
  });
  it("records a failure when search is down, and a retry on the same day can succeed", async () => {
    const store = memoryStore();
    const failed = await runContentJob(
      deps({
        store,
        search: fakeSearch(new ProviderError("parallel", "unavailable", 503, "down")),
      }),
      { trigger: "cron" },
    );
    expect(failed.ok === false && failed.error).toContain("research_failed");
    const retried = await runContentJob(deps({ store }), { trigger: "cron" });
    expect(retried.status).toBe("published");
    expect([...store.jobs.values()][0]).toMatchObject({ attempt: 2, status: "succeeded" });
  });
  it("stops retrying after three attempts unless an administrator forces it", async () => {
    const store = memoryStore();
    const broken = () =>
      deps({ store, search: fakeSearch(new ProviderError("parallel", "quota", 429, "limit")) });
    for (let i = 0; i < 3; i++) await runContentJob(broken(), { trigger: "cron" });
    expect((await runContentJob(broken(), { trigger: "cron" })).status).toBe("already_ran");
    expect((await runContentJob(deps({ store }), { trigger: "manual", force: true })).status).toBe(
      "published",
    );
  });
  it("still works from search excerpts when page extraction is down", async () => {
    const d = deps({ extract: fakeExtract(true) });
    expect((await runContentJob(d, { trigger: "cron" })).status).toBe("published");
    expect(
      (d.store as ReturnType<typeof memoryStore>).logs.some(
        (l) => l.stage === "extraction" && l.level === "warn",
      ),
    ).toBe(true);
  });
  it("fails with too little research rather than writing from one site", async () => {
    const out = await runContentJob(deps({ search: fakeSearch([SAMPLE_HITS[0]!]) }), {
      trigger: "cron",
    });
    expect(out.ok === false && out.error).toContain("insufficient_research");
  });
  it("names the missing credentials instead of calling anything", async () => {
    const d = deps({ env: readContentEnv({}), search: null, extract: null, llm: null });
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out.ok === false && out.error).toContain(
      "pending_credentials: missing: GEMINI_API_KEY, PARALLEL_API_KEY",
    );
  });
  it("writes development news only from approved updates and never searches the web for it", async () => {
    const store = memoryStore({ scheduleMode: "development" });
    store.state.updates = [
      {
        id: "u1",
        title: "Practice Mode is live",
        detail:
          "Practice Mode opened to Founding Members with a first season of fictional fixtures.",
        happenedOn: "2026-11-11",
      },
    ];
    let searched = false;
    const search = { name: "parallel", search: async () => ((searched = true), []) };
    const draft = sampleDraft({
      title: "Practice Mode is now open to Founding Members",
      body: "Practice Mode opened to Founding Members with a first season of fictional fixtures.\n\n"
        .repeat(12)
        .trim(),
      claims: [
        {
          text: "Practice Mode opened",
          source: 1,
          quote: "Practice Mode opened to Founding Members",
        },
        { text: "Fictional fixtures", source: 1, quote: "a first season of fictional fixtures" },
      ],
    });
    const d = deps({
      store,
      search,
      llm: fakeLlm((_m, r) =>
        r.system.startsWith("You are a fact checker")
          ? '{"unsupported":[]}'
          : JSON.stringify(draft),
      ),
    });
    const out = await runContentJob(d, { trigger: "cron" });
    expect(out).toMatchObject({ status: "published", kind: "development" });
    expect(searched).toBe(false);
  });
  it("a dry run saves no article", async () => {
    const d = deps();
    expect((await runContentJob(d, { trigger: "manual", dry: true })).status).toBe("dry_run");
    expect((d.store as ReturnType<typeof memoryStore>).articles).toHaveLength(0);
  });
});
