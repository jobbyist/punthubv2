/** Content engine configuration. The Newsroom uses Parallel Medium exclusively. */

/**
 * Primary first, then the fallbacks, strongest to lightest (14 Nov 2026): two more Flash models and one more
 * Flash-Lite, so a busy or capped model no longer drops straight to the lightest one. Every entry is on the free
 * tier; a model the project cannot reach answers 404 and the router simply moves on.
 */
/** Gemini models retained for non-PFIE odds and content workflows. */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

/** PFIE structured extraction is performed by Parallel Responses low effort only. */
export const DEFAULT_PFIE_MODELS = ["parallel-low"] as const;

/** Shared model allowlist. PFIE pins Parallel low; Newsroom pins Parallel medium; Gemini is non-PFIE only. */
export const APPROVED_CONTENT_MODELS: readonly string[] = [
  "parallel-medium",
  "parallel-low",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export interface ContentEnv {
  geminiKey: string | null;
  parallelKey: string | null;
  firecrawlKey: string | null;
  /** Newsroom model allowlist; currently Parallel Medium only. */
  models: string[];
  /** Model IDs refused because they are not on the approved Newsroom allowlist. */
  refusedModels: string[];
  /** Requests-per-day ceiling per model that the engine sets for itself (0 = no self-imposed ceiling). */
  dailyRequestCap: Record<string, number>;
  /** Overall time budget for one run, in milliseconds. */
  runBudgetMs: number;
}

type Env = Record<string, string | undefined>;

function clean(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

export function parseModelList(raw: string | undefined): { models: string[]; refused: string[] } {
  const wanted = (raw ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const list = wanted.length > 0 ? wanted : [...DEFAULT_GEMINI_MODELS];
  const ordered = ["parallel-medium", ...list.filter((m) => m !== "parallel-medium")];
  const models: string[] = [];
  const refused: string[] = [];
  for (const model of ordered) {
    if (!APPROVED_CONTENT_MODELS.includes(model)) refused.push(model);
    else if (!models.includes(model)) models.push(model);
  }
  return { models, refused };
}

/** Per-model request caps, e.g. `gemini-3.8-flash=20`. Bad entries are ignored. */
export function parseDailyCaps(raw: string | undefined): Record<string, number> {
  const caps: Record<string, number> = {};
  for (const part of (raw ?? "").split(",")) {
    const [model, value] = part.split("=").map((s) => s.trim());
    const n = Number(value);
    if (model && Number.isInteger(n) && n >= 0) caps[model] = n;
  }
  return caps;
}

export function readContentEnv(env: Env = process.env): ContentEnv {
  const { models, refused } = parseModelList(undefined);
  const budget = Number(env["CONTENT_RUN_BUDGET_MS"]);
  return {
    geminiKey: clean(env["GEMINI_API_KEY"]),
    parallelKey: clean(env["PARALLEL_API_KEY"]),
    firecrawlKey: clean(env["FIRECRAWL_API_KEY"]),
    models,
    refusedModels: refused,
    dailyRequestCap: parseDailyCaps(env["CONTENT_GEMINI_RPD"]),
    runBudgetMs: Number.isFinite(budget) && budget >= 10_000 ? budget : 120_000,
  };
}

/** Names of the credentials a live run still needs. Used by the cron route and the admin status panel. */
export function missingCredentials(env: ContentEnv, _kind: "sports" | "development"): string[] {
  const missing: string[] = [];
  if (!env.parallelKey) missing.push("PARALLEL_API_KEY");
  return missing;
}

/** Keeps the first and last two characters, for logs. A complete secret is never logged. */
export function redact(secret: string | null): string {
  if (!secret) return "(not set)";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 2)}…${secret.slice(-2)}`;
}

/** Every Newsroom slot uses Parallel Medium; Gemini remains available to non-PFIE odds/content workflows only. */
export function modelsForContentSlot(
  _models: readonly string[],
  _slot?: "breaking" | "editorial" | "intelligence",
): string[] {
  return ["parallel-medium"];
}
