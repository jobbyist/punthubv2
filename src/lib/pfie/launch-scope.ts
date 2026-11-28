import type { CompetitionKey } from "@/lib/sports/competitions";

/**
 * The complete PFIE pre-launch allowlist. Keep every ingestion path (fixtures, results,
 * standings, history, season backfill and archive) on this single source of truth.
 */
export const PFIE_LAUNCH_KEYS = [
  "psl",
  "epl",
  "championship",
  "laliga",
  "ucl",
  "uecl",
  "bundesliga",
  "seriea",
  "ligue1",
  "caf-cc",
] as const satisfies readonly CompetitionKey[];

const PFIE_LAUNCH_KEY_SET: ReadonlySet<CompetitionKey> = new Set(PFIE_LAUNCH_KEYS);

export function isPfieLaunchCompetition(key: CompetitionKey): boolean {
  return PFIE_LAUNCH_KEY_SET.has(key);
}
