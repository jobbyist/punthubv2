/**
 * The daily content run: schedule -> topic -> research -> extraction -> consolidation -> writing -> independent
 * review -> quality gate -> publish or queue -> audit log.
 *
 * Guarantees:
 * - One job per key (idempotent). A second call for the same day stops at the lock.
 * - Every run that starts ends with a job row in `succeeded`, `failed` or `skipped`, and a log trail. No silent exits.
 * - Nothing is published unless the engine is on, automatic publishing is on, the independent review ran, there is no critical issue
 *   and the score reaches the minimum. Otherwise the article waits in the editorial review queue.
 * - If research or every model fails, nothing is written to the newsroom and what is already published stays.
 */
import { sastDate } from "@/lib/sast";

import { missingCredentials, type ContentEnv } from "./config";
import { ProviderError } from "./http";
import { AllModelsFailed, createModelRouter } from "./model-router";
import { articleRequest, parseReview, reviewRequest } from "./prompt";
import { projectSources, rankHits, sportsBrief, toSource } from "./research";
import { dailyJobKey, kindForDay, sastDayNumber } from "./schedule";
import type {
  ContentKind,
  ContentStore,
  ExtractProvider,
  JobTrigger,
  LlmProvider,
  QualityReport,
  ResearchSource,
  SearchProvider,
} from "./types";
import { parseDraft, readingMinutes, slugFor, validateDraft } from "./validate";

export interface PipelineDeps {
  store: ContentStore;
  env: ContentEnv;
  search: SearchProvider | null;
  extract: ExtractProvider | null;
  llm: LlmProvider | null;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
}

export interface RunOptions {
  trigger: JobTrigger;
  kind?: ContentKind;
  /** Manual rerun: takes over a failed or stuck job for the same key. */
  force?: boolean;
  /** Runs everything except saving the article. */
  dry?: boolean;
}

export type RunOutcome =
  | {
      ok: true;
      status: "published" | "queued_for_review" | "dry_run";
      jobId: string;
      kind: ContentKind;
      model: string;
      quality: QualityReport;
      articleId?: string;
    }
  | { ok: true; status: "disabled" | "already_ran"; kind?: ContentKind }
  | { ok: false; status: "failed"; jobId: string; kind: ContentKind; error: string };

class StageError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StageError";
  }
}

const MIN_SOURCE_CHARS = 200;
const SEARCH_RESULTS = 8;
const PAGES_TO_READ = 4;

export async function runContentJob(deps: PipelineDeps, options: RunOptions): Promise<RunOutcome> {
  const now = deps.now ?? (() => new Date());
  const started = now();
  const { store, env } = deps;
  const settings = await store.settings();

  if (options.trigger === "cron" && !settings.enabled) return { ok: true, status: "disabled" };

  const updates = await store.pendingProjectUpdates(5);
  const choice = options.kind
    ? { kind: options.kind, reason: "chosen for this run" }
    : kindForDay(settings, updates.length > 0, started);
  const kind = choice.kind;

  // The schedule and a forced rerun share the day's key; any other manual run gets its own.
  const jobKey =
    options.trigger === "cron" || options.force
      ? dailyJobKey(started)
      : `manual:${started.toISOString()}`;
  const job = await store.claimJob({
    jobKey,
    kind,
    trigger: options.trigger,
    force: options.force === true,
  });
  if (!job) return { ok: true, status: "already_ran", kind };

  const log = (stage: string, level: "info" | "warn" | "error", message: string, data?: unknown) =>
    store.log(job.id, stage, level, message, data).catch(() => undefined);
  const budgetLeft = () => env.runBudgetMs - (now().getTime() - started.getTime());
  const checkBudget = (stage: string) => {
    if (budgetLeft() <= 0)
      throw new StageError("time_budget_exceeded", `out of time before ${stage}`);
  };

  try {
    await log("schedule", "info", `${kind} article (${choice.reason}), attempt ${job.attempt}`);
    if (env.refusedModels.length > 0)
      await log(
        "schedule",
        "warn",
        "models refused because they are not on the free list",
        env.refusedModels,
      );

    const missing = missingCredentials(env, kind);
    if (missing.length > 0 || !deps.llm || (kind === "sports" && !deps.search))
      throw new StageError(
        "pending_credentials",
        `missing: ${missing.join(", ") || "provider not configured"}`,
      );
    if (kind === "development" && updates.length === 0)
      throw new StageError("no_project_updates", "no approved project update is waiting");

    // Research.
    let sources: ResearchSource[];
    let beat = "Puntr";
    if (kind === "development") {
      sources = projectSources(updates);
      await log("research", "info", `${sources.length} approved project update(s)`);
    } else {
      const brief = sportsBrief(sastDayNumber(started), started);
      beat = brief.beat;
      await log("topic", "info", `beat: ${beat}`, brief.queries);
      sources = await research(deps, brief, log);
    }
    checkBudget("writing");

    // Writing, through the free-model router.
    const usage = await store.usageToday().catch(() => ({}) as Record<string, number>);
    const usedToday: Record<string, number> = {};
    for (const m of env.models) usedToday[m] = usage[`gemini:${m}`] ?? 0;
    const router = createModelRouter(deps.llm, {
      models: env.models,
      usedToday,
      dailyCap: env.dailyRequestCap,
      ...(deps.sleep ? { sleep: deps.sleep } : {}),
      onAttempt: async (a) => {
        if (a.outcome === "skipped_cap" || a.outcome === "refused_not_free") {
          await log("model", "warn", `${a.model}: ${a.outcome}`, a.detail);
          return;
        }
        await store
          .countUsage(`gemini:${a.model}`, a.outcome === "ok" ? "ok" : "error")
          .catch(() => undefined);
        if (a.outcome !== "ok")
          await log("model", "warn", `${a.model} failed: ${a.outcome}`, a.detail);
      },
    });

    const recent = await store.recentTitles(30);
    const request = articleRequest({
      kind,
      beat,
      today: sastDate(started),
      sources,
      recentTitles: recent.map((r) => r.title).slice(0, 10),
    });

    let written = await router.generate(request);
    let draft = parseDraft(written.text);
    if (!draft) {
      await log(
        "writing",
        "warn",
        `${written.model} returned an answer that is not a valid article; one more try`,
      );
      checkBudget("second writing attempt");
      const other = env.models.find((m) => m !== written.model);
      written = await router.generate(request, other);
      draft = parseDraft(written.text);
    }
    if (!draft)
      throw new StageError(
        "invalid_generated_content",
        "the model's answer was not a valid article twice",
      );
    await log("writing", "info", `draft by ${written.model}: "${draft.title}"`);

    // Independent review by the other model where there is one. Not run = not eligible for automatic publishing.
    let reviewerUnsupported: string[] = [];
    let reviewRan = false;
    if (budgetLeft() > 12_000) {
      try {
        const reviewer = env.models.find((m) => m !== written.model);
        const review = await router.generate(reviewRequest(draft, sources), reviewer);
        const parsed = parseReview(review.text);
        if (parsed) {
          reviewerUnsupported = parsed;
          reviewRan = true;
          await log(
            "review",
            "info",
            `${review.model} flagged ${parsed.length} statement(s)`,
            parsed,
          );
        } else {
          await log("review", "warn", "review answer could not be read");
        }
      } catch (error) {
        await log("review", "warn", "independent review did not run", describe(error));
      }
    } else {
      await log("review", "warn", "independent review skipped: not enough time left in this run");
    }

    // Quality gate.
    const quality = validateDraft({
      draft,
      kind,
      sources,
      recentTitles: recent.map((r) => r.title),
      reviewerUnsupported,
    });
    await log(
      "quality",
      quality.critical ? "warn" : "info",
      `score ${quality.score}`,
      quality.issues,
    );

    // `enabled` guards publishing for every trigger: a manual run while the engine is off (the validation
    // workflow) can only ever produce a review-queue article.
    const publish =
      settings.enabled &&
      settings.autoPublish &&
      reviewRan &&
      !quality.critical &&
      quality.score >= settings.minQuality;

    if (options.dry) {
      await store.finishJob(job.id, {
        status: "succeeded",
        model: written.model,
        report: { dry: true, quality },
      });
      return { ok: true, status: "dry_run", jobId: job.id, kind, model: written.model, quality };
    }

    const cited = [...new Set(draft.claims.map((c) => c.source))];
    const saved = await store.saveArticle({
      jobId: job.id,
      article: {
        slug: slugFor(draft.title, sastDate(started)),
        title: draft.title,
        excerpt: draft.excerpt,
        body: draft.body,
        category: kind === "sports" ? "sports" : "product",
        tags: draft.tags.slice(0, 6).map((t) => t.toLowerCase()),
        seoTitle: draft.seoTitle.slice(0, 60),
        seoDescription: draft.seoDescription.slice(0, 160),
        readingMinutes: readingMinutes(draft.body),
        status: publish ? "PUBLISHED" : "REVIEW",
        aiModel: written.model,
        qualityScore: quality.score,
        qualityIssues: quality.issues,
      },
      sources,
      usedSourceIndexes: cited,
      projectUpdateIds: kind === "development" ? updates.map((u) => u.id) : [],
    });
    if (settings.nextKindOverride) await store.clearKindOverride().catch(() => undefined);

    await log("publish", "info", publish ? "published" : "queued for editorial review", {
      reviewRan,
    });
    await store.finishJob(job.id, {
      status: "succeeded",
      articleId: saved.id,
      model: written.model,
      report: { quality, reviewRan, published: publish, sources: sources.length },
    });
    return {
      ok: true,
      status: publish ? "published" : "queued_for_review",
      jobId: job.id,
      kind,
      model: written.model,
      quality,
      articleId: saved.id,
    };
  } catch (error) {
    const message = describe(error);
    await log("failure", "error", message);
    await store.finishJob(job.id, { status: "failed", error: message }).catch(() => undefined);
    return { ok: false, status: "failed", jobId: job.id, kind, error: message };
  }
}

async function research(
  deps: PipelineDeps,
  brief: { objective: string; queries: string[] },
  log: (
    stage: string,
    level: "info" | "warn" | "error",
    message: string,
    data?: unknown,
  ) => Promise<void>,
): Promise<ResearchSource[]> {
  const { store, search, extract } = deps;
  if (!search) throw new StageError("pending_credentials", "search provider not configured");

  let hits;
  try {
    hits = await search.search({
      objective: brief.objective,
      queries: brief.queries,
      maxResults: SEARCH_RESULTS,
    });
    await store.countUsage(search.name, "ok").catch(() => undefined);
  } catch (error) {
    await store.countUsage(search.name, "error").catch(() => undefined);
    throw new StageError("research_failed", `search failed: ${describe(error)}`);
  }
  const ranked = rankHits(hits, PAGES_TO_READ + 2);
  await log(
    "research",
    "info",
    `${hits.length} result(s), ${ranked.length} kept`,
    ranked.map((h) => h.url),
  );

  // Read the best pages in full. A page that cannot be read falls back to the search excerpt (graceful degradation).
  const pages = await Promise.all(
    ranked.map(async (hit, i) => {
      if (!extract || i >= PAGES_TO_READ) return null;
      try {
        const page = await extract.extract(hit.url);
        await store.countUsage(extract.name, "ok").catch(() => undefined);
        return page;
      } catch (error) {
        await store.countUsage(extract.name, "error").catch(() => undefined);
        await log(
          "extraction",
          "warn",
          `could not read ${hit.url}; using the search excerpt`,
          describe(error),
        );
        return null;
      }
    }),
  );
  if (!extract)
    await log(
      "extraction",
      "warn",
      "no extraction provider configured; using search excerpts only",
    );

  const sources = ranked
    .map((hit, i) => toSource(0, hit, pages[i] ?? null))
    .filter((s) => s.text.length >= MIN_SOURCE_CHARS)
    .map((s, i) => ({ ...s, index: i + 1 }));
  const domains = new Set(sources.map((s) => s.domain));
  if (sources.length < 2 || domains.size < 2)
    throw new StageError(
      "insufficient_research",
      `${sources.length} usable source(s) from ${domains.size} site(s); at least 2 from 2 sites are needed`,
    );
  await log("consolidation", "info", `${sources.length} source(s) from ${domains.size} site(s)`);
  return sources;
}

function describe(error: unknown): string {
  if (error instanceof StageError) return `${error.code}: ${error.message}`;
  if (error instanceof AllModelsFailed) return `all_models_failed: ${error.message}`;
  if (error instanceof ProviderError) return error.message;
  if (error instanceof Error) return `unexpected: ${error.message.slice(0, 200)}`;
  return "unexpected error";
}
