/**
 * Football coverage registry: the single place that says which competitions Puntr covers and in which phase.
 * The soccer page, the team directory and any coverage copy read from here, so a league added to PFIE (an entry in
 * `competitions.ts` plus `PFIE_SOURCES`) shows up everywhere once it is given a phase below. A test keeps this list
 * aligned with `PFIE_SOURCES` and the launch standings set.
 *
 * Phases (owner decision 27 Nov 2026, PFIE v2.1 section 3):
 *  - launch: the ten launch leagues. Fixtures, verified results and (for league formats) a verified table.
 *  - post-launch: PFIE already reads them, but they are not part of the launch promise yet.
 *  - planned: in the registry only; no PFIE sources yet, so nothing is fetched.
 */
import { competitionMeta, type CompetitionRegion } from "@/lib/match/competition-meta";
import { STANDINGS_COMPETITIONS, STANDINGS_LAUNCH_KEYS } from "@/lib/pfie/standings";
import { MARKETS_BY_SPORT, type Market } from "@/lib/picks";
import { competitions, type CompetitionKey } from "@/lib/sports/competitions";

export type CoveragePhase = "launch" | "post-launch" | "planned";

export const COVERAGE_PHASES: readonly CoveragePhase[] = ["launch", "post-launch", "planned"];

/** Every football competition in `competitions.ts`, in display order within each phase. */
export const SOCCER_PHASE: Readonly<Partial<Record<CompetitionKey, CoveragePhase>>> = {
  // Launch 10, in the agreed priority order (same order as STANDINGS_LAUNCH_KEYS).
  psl: "launch",
  epl: "launch",
  championship: "launch",
  laliga: "launch",
  ucl: "launch",
  uecl: "launch",
  bundesliga: "launch",
  seriea: "launch",
  ligue1: "launch",
  "caf-cc": "launch",
  // Post-launch 9 (owner, 27 Nov), plus Nedbank Cup and CAF Champions League, which PFIE already reads
  // (PFIE v2.1 recommendation D9: label them post-launch).
  facup: "post-launch",
  eredivisie: "post-launch",
  "sa-championship": "post-launch",
  "bafana-friendlies": "post-launch",
  afcon: "post-launch",
  "saudi-pro": "post-launch",
  primeira: "post-launch",
  uel: "post-launch",
  eflcup: "post-launch",
  nedbank: "post-launch",
  "caf-cl": "post-launch",
  // Registry only, no PFIE sources yet.
  mtn8: "planned",
  "wcq-caf": "planned",
};

export interface CoverageCompetition {
  key: CompetitionKey;
  name: string;
  short: string;
  region: CompetitionRegion;
  phase: CoveragePhase;
  /** PFIE reads fixtures and results for it. */
  fixtures: boolean;
  /** A league table is built and verified for it. */
  table: boolean;
  /** Teams in the league format, when known (a table competition). */
  teams: number | null;
}

/** The football coverage list, phase by phase, built from the registries above. */
export function soccerCoverage(): CoverageCompetition[] {
  const order = new Map(COVERAGE_PHASES.map((p, i) => [p, i]));
  const keys = Object.keys(SOCCER_PHASE) as CompetitionKey[];
  return competitions
    .filter((c) => c.sport === "soccer" && SOCCER_PHASE[c.key])
    .map((c) => {
      const meta = competitionMeta(c.name);
      const standings = STANDINGS_COMPETITIONS[c.key];
      return {
        key: c.key,
        name: c.name,
        short: meta.short,
        region: meta.region,
        phase: SOCCER_PHASE[c.key]!,
        // PFIE reads every launch and post-launch competition (a test keeps this equal to PFIE_SOURCES).
        fixtures: SOCCER_PHASE[c.key] !== "planned",
        table: Boolean(standings),
        teams: standings && !standings.groups ? standings.teams : null,
      };
    })
    .sort(
      (a, b) =>
        order.get(a.phase)! - order.get(b.phase)! || keys.indexOf(a.key) - keys.indexOf(b.key),
    );
}

export const LAUNCH_COMPETITION_KEYS: readonly CompetitionKey[] = STANDINGS_LAUNCH_KEYS;

/** Competition keys in a phase. */
export function competitionsIn(phase: CoveragePhase): CompetitionKey[] {
  return soccerCoverage()
    .filter((c) => c.phase === phase)
    .map((c) => c.key);
}

/** Markets members can predict in football (the database enforces the same list). */
export function soccerMarkets(): Market[] {
  return [...MARKETS_BY_SPORT.soccer];
}

/** Competition key for a stored competition name, or null when it is not a covered football competition. */
export function coverageKeyFor(name: string): CompetitionKey | null {
  const c = competitions.find((x) => x.name === name && x.sport === "soccer");
  return c && SOCCER_PHASE[c.key] ? c.key : null;
}
