/**
 * Content engine configuration, read from server environment variables only. Nothing here is ever sent to the client.
 *
 * Model IDs are configuration, not assumptions. The defaults were checked against Google's pricing page and current
 * free-tier write-ups on 13 and 14 Nov 2026 and are listed as free of charge, but the limits that apply are the ones
 * shown for the project in Google AI Studio: put those in CONTENT_GEMINI_RPD.
 */

/**
 * Primary first, then the fallbacks, strongest to lightest (14 Nov 2026): two more Flash models and one more
 * Flash-Lite, so a busy or capped model no longer drops straight to the lightest one. Every entry is on the free
 * tier; a model the project cannot reach answers 404 and the router simply moves on.
 */
export const DEFAULT_GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
] as const;

/** PFIE extraction is high volume and simple: the Flash-Lite models go first, the Flash models back them up. */
export const DEFAULT_PFIE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;

/**
 * Models the router may ever call. A model outside this list is refused even if an environment variable names it,
 * so a paid model can never be selected automatically. Adding a model is a reviewed code change.
 */
export const FREE_MODEL_ALLOWLIST: readonly string[] = [
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
  /** Ordered: primary first, then fallbacks. Already filtered to the free allowlist. */
  models: string[];
  /** Models named in configuration that were refused because they are not on the free allowlist. */
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
  const models: string[] = [];
  const refused: string[] = [];
  for (const m of list) {
    if (!FREE_MODEL_ALLOWLIST.includes(m)) refused.push(m);
    else if (!models.includes(m)) models.push(m);
  }
  return { models, refused };
}

/** `CONTENT_GEMINI_RPD` looks like `gemini-3.8-flash=20,gemini-3.1-flash-lite=500`. Bad entries are ignored. */
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
  const { models, refused } = parseModelList(env["CONTENT_GEMINI_MODELS"]);
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
export function missingCredentials(env: ContentEnv, kind: "sports" | "development"): string[] {
  const missing: string[] = [];
  if (!env.geminiKey) missing.push("GEMINI_API_KEY");
  // Development news is written from the approved project-update feed and needs no web research.
  if (kind === "sports" && !env.parallelKey) missing.push("PARALLEL_API_KEY");
  return missing;
}

/** Keeps the first and last two characters, for logs. A complete secret is never logged. */
export function redact(secret: string | null): string {
  if (!secret) return "(not set)";
  if (secret.length <= 8) return "****";
  return `${secret.slice(0, 2)}…${secret.slice(-2)}`;
}
