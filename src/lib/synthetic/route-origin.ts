/** Canonical public origin used by production Synthetic QA cron checks. */
export const SYNTHETIC_QA_ORIGIN = "https://puntr.co.za";

/** Resolve allowlisted same-origin route paths without inheriting Vercel's cron hostname. */
export function syntheticQaUrl(path: string): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Synthetic QA paths must be absolute same-origin paths");
  }
  return new URL(path, SYNTHETIC_QA_ORIGIN);
}

/** Keep the follow-up research call on the canonical production origin too. */
export function syntheticResearchUrl(): URL {
  return new URL("/api/cron/synthetic-decisions-daily", SYNTHETIC_QA_ORIGIN);
}
