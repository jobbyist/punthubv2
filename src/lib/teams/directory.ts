/**
 * Team directory: every team Puntr covers, built from public data only (league tables, upcoming fixtures and the
 * verified badge registry). Teams are merged by their normalised name, so "Man City" and "Manchester City" are one
 * entry. Football first; other sports join when they have competitions in the coverage registry.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { badgeKey } from "@/lib/badges/resolve";
import { getTeamLogo } from "@/lib/mock-data";
import { teamSlug } from "@/lib/pfie/teams";
import { competitionMeta, type CompetitionRegion } from "@/lib/match/competition-meta";
import { coverageKeyFor, soccerCoverage, type CoveragePhase } from "@/lib/sports/coverage";
import type { CompetitionKey } from "@/lib/sports/competitions";

const db = supabase as unknown as SupabaseClient;

export interface TeamCompetition {
  key: CompetitionKey;
  name: string;
  phase: CoveragePhase;
}

export interface TeamStanding {
  competitionKey: CompetitionKey;
  competition: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  teams: number;
}

export interface TeamFixture {
  id: string;
  competition: string;
  opponent: string;
  venue: "H" | "A";
  kickoffAt: string;
}

export interface DirectoryTeam {
  /** Normalised name, the key used by badges and follows. */
  key: string;
  slug: string;
  name: string;
  sport: "soccer";
  region: CompetitionRegion;
  competitions: TeamCompetition[];
  badge: string | null;
  standing: TeamStanding | null;
  nextFixture: TeamFixture | null;
  upcoming: number;
}

interface StandingRow {
  competition_key: string;
  competition: string;
  team: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface FixtureRow {
  id: string;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
}

export interface DirectoryInput {
  standings: StandingRow[];
  fixtures: FixtureRow[];
  badges: { team_key: string; logo_url: string | null }[];
}

const PHASE_ORDER: Record<CoveragePhase, number> = { launch: 0, "post-launch": 1, planned: 2 };

/** Pure merge of tables, fixtures and badges into directory entries (unit-tested). */
export function buildDirectory(input: DirectoryInput): DirectoryTeam[] {
  const coverage = new Map(soccerCoverage().map((c) => [c.key, c]));
  const badges = new Map(
    input.badges.filter((b) => b.logo_url).map((b) => [b.team_key, b.logo_url!]),
  );
  const teamsInTable = new Map<string, number>();
  for (const r of input.standings)
    teamsInTable.set(r.competition_key, (teamsInTable.get(r.competition_key) ?? 0) + 1);

  type Acc = DirectoryTeam & { names: Map<string, number> };
  const map = new Map<string, Acc>();
  const touch = (name: string, key: CompetitionKey, weight: number): Acc | null => {
    const k = badgeKey(name);
    const c = coverage.get(key);
    if (!k || !c) return null;
    let t = map.get(k);
    if (!t) {
      t = {
        key: k,
        slug: teamSlug(name),
        name,
        sport: "soccer",
        region: competitionMeta(c.name).region,
        competitions: [],
        badge: null,
        standing: null,
        nextFixture: null,
        upcoming: 0,
        names: new Map(),
      };
      map.set(k, t);
    }
    t.names.set(name, (t.names.get(name) ?? 0) + weight);
    if (!t.competitions.some((x) => x.key === key))
      t.competitions.push({ key, name: c.name, phase: c.phase });
    return t;
  };

  for (const r of input.standings) {
    const key = r.competition_key as CompetitionKey;
    if (!coverage.has(key)) continue;
    // Table names are the most consistent spelling, so they weigh more when picking the display name.
    const t = touch(r.team, key, 5);
    if (!t) continue;
    const better =
      !t.standing ||
      PHASE_ORDER[coverage.get(key)!.phase] <
        PHASE_ORDER[coverage.get(t.standing.competitionKey)!.phase];
    if (better)
      t.standing = {
        competitionKey: key,
        competition: r.competition,
        position: r.position,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goals_for,
        goalsAgainst: r.goals_against,
        points: r.points,
        teams: teamsInTable.get(r.competition_key) ?? 0,
      };
  }

  const sorted = [...input.fixtures].sort((a, b) => a.kickoff_at.localeCompare(b.kickoff_at));
  for (const f of sorted) {
    const key = coverageKeyFor(f.competition);
    if (!key) continue;
    for (const [name, opponent, venue] of [
      [f.home, f.away, "H"],
      [f.away, f.home, "A"],
    ] as const) {
      const t = touch(name, key, 1);
      if (!t) continue;
      t.upcoming += 1;
      if (!t.nextFixture)
        t.nextFixture = {
          id: f.id,
          competition: f.competition,
          opponent,
          venue,
          kickoffAt: f.kickoff_at,
        };
    }
  }

  const order = [...coverage.keys()];
  return [...map.values()]
    .map(({ names, ...t }) => {
      const name =
        [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0]?.[0] ??
        t.name;
      t.competitions.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
      const primary = t.competitions[0];
      return {
        ...t,
        name,
        slug: teamSlug(name),
        region: primary ? competitionMeta(primary.name).region : t.region,
        badge: badges.get(t.key) ?? getTeamLogo(name, "soccer") ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en-ZA"));
}

async function read<T>(
  label: string,
  run: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<T[]> {
  try {
    const { data, error } = await run();
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (error) {
    console.error(`team directory: ${label} failed`, error);
    return [];
  }
}

/** Reads the public tables and builds the directory. Fails soft: a missing source just means fewer details. */
export async function fetchDirectory(now = new Date()): Promise<DirectoryTeam[]> {
  const to = new Date(now.getTime() + 45 * 86_400_000).toISOString();
  const [standings, fixtures, badges] = await Promise.all([
    read<StandingRow>("standings", () =>
      db
        .from("league_standings")
        .select(
          "competition_key, competition, team, position, played, won, drawn, lost, goals_for, goals_against, points",
        )
        .order("position")
        .limit(2000),
    ),
    read<FixtureRow>("fixtures", () =>
      db
        .from("fixtures")
        .select("id, competition, home, away, kickoff_at")
        .eq("sport", "soccer")
        .in("status", ["scheduled", "live"])
        .gte("kickoff_at", new Date(now.getTime() - 3 * 3_600_000).toISOString())
        .lte("kickoff_at", to)
        .order("kickoff_at")
        .limit(2000),
    ),
    read<{ team_key: string; logo_url: string | null }>("badges", () =>
      db
        .from("team_badges")
        .select("team_key, logo_url")
        .eq("sport", "soccer")
        .eq("status", "verified")
        .limit(3000),
    ),
  ]);
  return buildDirectory({ standings, fixtures, badges });
}

/** Aggregate follower counts per team key (no personal data). Empty until the follows migration is applied. */
export async function fetchFollowerCounts(): Promise<Record<string, number>> {
  const rows = await read<{ team_key: string; followers: number }>("follower counts", () =>
    db.rpc("team_follower_counts", { p_sport: "soccer" }),
  );
  return Object.fromEntries(rows.map((r) => [r.team_key, Number(r.followers)]));
}
