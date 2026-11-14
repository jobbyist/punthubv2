import type { CompetitionKey } from "./competitions";

/** Competitions not synced within `staleHours`, least recently synced first. */
export function orderKeys(
  keys: CompetitionKey[],
  runs: { competition: string; started_at: string }[],
  staleHours: number,
  nowMs: number,
): CompetitionKey[] {
  const last = new Map<string, number>();
  for (const r of runs) {
    const t = Date.parse(r.started_at);
    if (!Number.isNaN(t) && t > (last.get(r.competition) ?? 0)) last.set(r.competition, t);
  }
  const cutoff = nowMs - staleHours * 3_600_000;
  return keys
    .filter((k) => (last.get(k) ?? 0) <= cutoff)
    .sort((a, b) => (last.get(a) ?? 0) - (last.get(b) ?? 0));
}
