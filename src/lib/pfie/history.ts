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


export interface CompletedMatchEvidence {
  matchDate: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  kickoffAt?: string;
}

/**
 * Collapse fixture/history copies of the same match by canonical team identity and local match date.
 * If two records disagree on the score, quarantine that match from form counts rather than choosing one.
 */
export function dedupeCompletedMatches(
  matches: CompletedMatchEvidence[],
  knownTeams: readonly string[] = [],
): CompletedMatchEvidence[] {
  const identity = (name: string): string | null => {
    const resolved = knownTeams.length ? resolveTeam(name, knownTeams) : null;
    if (resolved === "ambiguous") return null;
    return normaliseTeam(resolved ?? name);
  };
  const grouped = new Map<string, { row: CompletedMatchEvidence; score: string; conflict: boolean }>();
  for (const row of matches) {
    const home = identity(row.home);
    const away = identity(row.away);
    if (!home || !away || home === away || !/^\d{4}-\d{2}-\d{2}$/.test(row.matchDate)) continue;
    const key = row.matchDate + "|" + home + "|" + away;
    const score = String(row.homeScore) + "-" + String(row.awayScore);
    const existing = grouped.get(key);
    if (!existing) grouped.set(key, { row, score, conflict: false });
    else if (existing.score !== score) existing.conflict = true;
  }
  return [...grouped.values()].filter((entry) => !entry.conflict).map((entry) => entry.row);
}

/** Canonical per-team match counts for the backfill selector. Duplicate aliases count once; score conflicts count zero. */
export function completedMatchCounts(
  matches: CompletedMatchEvidence[],
  knownTeams: readonly string[] = [],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of dedupeCompletedMatches(matches, knownTeams)) {
    for (const name of [row.home, row.away]) {
      const resolved = knownTeams.length ? resolveTeam(name, knownTeams) : null;
      if (resolved === "ambiguous") continue;
      const key = normaliseTeam(resolved ?? name);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** Teams with fewer than `min` completed matches recorded: the competition needs a history backfill. */
export function needsBackfill(
  counts: Map<string, number>,
  teams: readonly string[],
  min = 5,
): boolean {
  if (teams.length === 0) return true;
  const short = teams.filter((t) => (counts.get(normaliseTeam(t)) ?? 0) < min).length;
  return short / teams.length > 0.25;
}
