/** Content engine configuration. The Newsroom uses Parallel Medium exclusively. */

/**
 * Primary first, then the fallbacks, strongest to lightest (14 Nov 2026): two more Flash models and one more
 * Flash-Lite, so a busy or capped model no longer drops straight to the lightest one. Every entry is on the free
 * tier; a model the project cannot reach answers 404 and the router simply moves on.
 */
/** Parallel is the only approved model for Newsroom writing, revision and review. */
export const APPROVED_CONTENT_MODELS: readonly string[] = ["parallel-medium"];

export interface ContentEnv {
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

export function parseModelList(_raw?: string): { models: string[]; refused: string[] } {
  return { models: ["parallel-medium"], refused: [] };
}

/** `CONTENT_MODEL_RPD` looks like `parallel-medium=12`. Bad entries are ignored. */
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
  const { models, refused } = parseModelList();
  const budget = Number(env["CONTENT_RUN_BUDGET_MS"]);
  return {
    parallelKey: clean(env["PARALLEL_API_KEY"]),
    firecrawlKey: clean(env["FIRECRAWL_API_KEY"]),
    models,
    refusedModels: refused,
    dailyRequestCap: parseDailyCaps(env["CONTENT_MODEL_RPD"]),
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


/** Every Newsroom slot uses the same approved Parallel Medium model. */
export function modelsForContentSlot(_models: readonly string[], _slot?: "breaking" | "editorial" | "intelligence"): string[] {
  return ["parallel-medium"];
}
