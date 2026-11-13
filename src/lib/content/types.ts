/**
 * Content engine: shared types. The pipeline only talks to these interfaces, so a research provider or an AI model
 * can be replaced without touching publishing (docs/CONTENT_ENGINE.md).
 *
 * Privacy: nothing in this module may carry personal information. Research briefs, sources and prompts are built
 * from public pages and the approved project-update feed only (CLAUDE.md: never send personal data to an AI service).
 */

export type ContentKind = "sports" | "development";

export interface SearchHit {
  url: string;
  title: string;
  /** Text the search provider returned for the page (may be empty). */
  excerpt: string;
  publishedAt: string | null;
}

export interface SearchProvider {
  readonly name: string;
  search(input: { objective: string; queries: string[]; maxResults: number }): Promise<SearchHit[]>;
}

export interface ExtractProvider {
  readonly name: string;
  /** Returns the page as plain markdown, or null when the page could not be read. */
  extract(url: string): Promise<{ markdown: string; title: string | null } | null>;
}

export interface LlmRequest {
  system: string;
  prompt: string;
  /** JSON schema (Gemini `responseSchema` subset) the answer must follow. */
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
}

export interface LlmResult {
  model: string;
  text: string;
}

export interface LlmProvider {
  readonly name: string;
  generate(model: string, request: LlmRequest): Promise<LlmResult>;
}

/** One researched page, numbered so the model can cite it as [n]. */
export interface ResearchSource {
  index: number;
  url: string;
  domain: string;
  title: string;
  publishedAt: string | null;
  text: string;
  /** "search" = provider excerpt only, "extract" = full page text, "project" = approved Puntr update feed. */
  via: "search" | "extract" | "project";
}

export interface ArticleClaim {
  text: string;
  source: number;
  /** Words copied from the source that support the claim. Checked verbatim by the validator. */
  quote: string;
}

export interface ArticleDraft {
  title: string;
  excerpt: string;
  body: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  claims: ArticleClaim[];
}

export interface QualityIssue {
  code: string;
  /** A critical issue always blocks automatic publishing, whatever the score. */
  critical: boolean;
  detail: string;
}

export interface QualityReport {
  score: number;
  issues: QualityIssue[];
  critical: boolean;
}

export type JobStatus = "running" | "succeeded" | "failed" | "skipped";
export type JobTrigger = "cron" | "manual";

export interface ContentSettings {
  enabled: boolean;
  autoPublish: boolean;
  minQuality: number;
  scheduleMode: "alternate" | "sports" | "development";
  nextKindOverride: ContentKind | null;
}

export interface ProjectUpdate {
  id: string;
  title: string;
  detail: string;
  happenedOn: string;
}

export type LogLevel = "info" | "warn" | "error";

export interface ArticleRecord {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  readingMinutes: number;
  status: "REVIEW" | "PUBLISHED";
  aiModel: string;
  qualityScore: number;
  qualityIssues: QualityIssue[];
}

/** Everything the pipeline needs from the database. Implemented by `store.server.ts`; faked in tests. */
export interface ContentStore {
  settings(): Promise<ContentSettings>;
  /** Claims the job key. Returns null when another run already holds or finished it (idempotency lock). */
  claimJob(input: {
    jobKey: string;
    kind: ContentKind;
    trigger: JobTrigger;
    force: boolean;
  }): Promise<{ id: string; attempt: number } | null>;
  log(
    jobId: string,
    stage: string,
    level: LogLevel,
    message: string,
    data?: unknown,
  ): Promise<void>;
  finishJob(
    jobId: string,
    result: {
      status: JobStatus;
      articleId?: string;
      model?: string;
      error?: string;
      report?: unknown;
    },
  ): Promise<void>;
  recentTitles(limit: number): Promise<{ title: string; slug: string }[]>;
  pendingProjectUpdates(limit: number): Promise<ProjectUpdate[]>;
  saveArticle(input: {
    jobId: string;
    article: ArticleRecord;
    sources: ResearchSource[];
    usedSourceIndexes: number[];
    projectUpdateIds: string[];
  }): Promise<{ id: string }>;
  countUsage(provider: string, outcome: "ok" | "error"): Promise<void>;
  /** Calls made so far today (UTC day) per provider key, e.g. `gemini:gemini-3.8-flash`. */
  usageToday(): Promise<Record<string, number>>;
  clearKindOverride(): Promise<void>;
}
