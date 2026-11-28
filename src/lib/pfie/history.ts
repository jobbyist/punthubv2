/**
 * Recent results for form, from the same extraction and validation as PFIE results. A past result is kept only
 * when its score is confirmed by the competition's own site or by two different sites. Kick-off times are not
 * needed here (form only uses the date and score), so date-only result pages are fine.
 */
import type { CompetitionKey } from "@/lib/sports/competitions";

import { normaliseTeam, resolveTeam } from "./teams";
import type { Observation } from "./types";
import { publisherKey } from "./publisher-identity";

export interface HistoryRow {
  competitionKey: CompetitionKey;
  matchDate: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  sourceDomains: string[];
}

export function verifyHistory(
  observations: Observation[],
  competitionKey: CompetitionKey,
  knownTeams: readonly string[] = [],
): { rows: HistoryRow[]; unverified: number } {
  const name = (n: string) => {
    const r = knownTeams.length ? resolveTeam(n, knownTeams) : null;
    return r && r !== "ambiguous" ? r : n.trim();
  };
  const groups = new Map<string, Observation[]>();
  for (const o of observations) {
    if (o.status !== "finished" || o.homeScore === null || o.awayScore === null) continue;
    const key = `${o.date}|${normaliseTeam(o.home)}|${normaliseTeam(o.away)}`;
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  const rows: HistoryRow[] = [];
  let unverified = 0;
  for (const group of groups.values()) {
    const byScore = new Map<string, Observation[]>();
    for (const o of group) {
      const k = `${o.homeScore}-${o.awayScore}`;
      byScore.set(k, [...(byScore.get(k) ?? []), o]);
    }
    if (byScore.size !== 1) {
      unverified++;
      continue;
    }
    const domains = Array.from(new Set(group.map((o) => o.domain)));
    const publishers = new Set(group.map((o) => publisherKey(o.domain)));
    const official = group.some((o) => o.tier === "official");
    if (!official && publishers.size < 2) {
      unverified++;
      continue;
    }
    const o = group[0]!;
    rows.push({
      competitionKey,
      matchDate: o.date,
      home: name(o.home),
      away: name(o.away),
      homeScore: o.homeScore!,
      awayScore: o.awayScore!,
      sourceDomains: domains,
    });
  }
  return { rows, unverified };
}

/** Teams with fewer than `min` completed matches recorded: the competition needs a history backfill. */
export function needsBackfill(
  counts: Map<string, number>,
  teams: readonly string[],
  min = 5,
): boolean {
  if (teams.length === 0) return true;
  const short = teams.filter((t) => (counts.get(t.toLowerCase()) ?? 0) < min).length;
  return short / teams.length > 0.25;
}
