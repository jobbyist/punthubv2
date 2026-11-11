/**
 * Practice Mode simulator. Pure and seeded: the same seed always gives the same league, schedule, prices and
 * results, so it is fully testable. Everything here is FICTIONAL: made-up clubs, made-up matches, made-up scores.
 * Nothing is read from, or written to, the real fixtures, predictions or leaderboards, and no AI or paid API is
 * called. The "model" is plain arithmetic on the invented team ratings (a Poisson goals model) and is labelled
 * SIMULATED wherever it is shown. It is not a Puntr prediction.
 */

/** Invented clubs. None is meant to match a real club; keep it that way. */
export const PRACTICE_TEAMS: readonly { name: string; attack: number; defence: number }[] = [
  { name: "Harbour City FC", attack: 1.25, defence: 0.85 },
  { name: "Kloof Athletic", attack: 1.1, defence: 0.95 },
  { name: "Highveld Rovers", attack: 1.05, defence: 1.0 },
  { name: "Karoo United", attack: 0.95, defence: 1.05 },
  { name: "Marula Stars", attack: 1.15, defence: 1.1 },
  { name: "Baobab Wanderers", attack: 0.9, defence: 0.95 },
  { name: "Protea Park", attack: 0.85, defence: 1.15 },
  { name: "Savanna Town", attack: 1.0, defence: 1.2 },
] as const;

export const BASE_GOALS = 1.3;
export const HOME_ADVANTAGE = 1.12;
/** Practice price margin: the invented prices are a little shorter than fair, like a real book. */
export const PRICE_MARGIN = 1.07;

/** Small fast seeded generator (mulberry32). Returns a function giving numbers in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Team {
  name: string;
  attack: number;
  defence: number;
}

/** Expected goals for each side. */
export function expectedGoals(home: Team, away: Team): { home: number; away: number } {
  return {
    home: round3(BASE_GOALS * home.attack * away.defence * HOME_ADVANTAGE),
    away: round3((BASE_GOALS * away.attack * home.defence) / HOME_ADVANTAGE),
  };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

function poissonPmf(lambda: number, k: number): number {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i += 1) p *= lambda / i;
  return p;
}

/** Draws a Poisson-distributed score (Knuth). */
export function samplePoisson(lambda: number, next: () => number): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= next();
  } while (p > limit && k < 12);
  return k - 1;
}

export interface Probabilities {
  home: number;
  draw: number;
  away: number;
  over25: number;
  bttsYes: number;
}

/** Match probabilities from the goal expectations, over a 0-10 goals grid. */
export function probabilities(lambdaHome: number, lambdaAway: number): Probabilities {
  let home = 0;
  let draw = 0;
  let away = 0;
  let over = 0;
  let btts = 0;
  const MAX = 10;
  for (let h = 0; h <= MAX; h += 1) {
    const ph = poissonPmf(lambdaHome, h);
    for (let a = 0; a <= MAX; a += 1) {
      const p = ph * poissonPmf(lambdaAway, a);
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
      if (h + a >= 3) over += p;
      if (h > 0 && a > 0) btts += p;
    }
  }
  const total = home + draw + away;
  return {
    home: home / total,
    draw: draw / total,
    away: away / total,
    over25: over / total,
    bttsYes: btts / total,
  };
}

/** Invented price for a probability, with a margin, kept inside the real pick limits (1.01 to 50). */
export function priceFor(probability: number): number {
  const p = Math.max(probability, 0.0001);
  return round2(Math.min(50, Math.max(1.01, 1 / (p * PRICE_MARGIN))));
}

export type PracticeOdds = {
  "1X2": { home: number; draw: number; away: number };
  DC: { "1X": number; X2: number; "12": number };
  OU25: { over: number; under: number };
  BTTS: { yes: number; no: number };
};

export function oddsFor(lambdaHome: number, lambdaAway: number): PracticeOdds {
  const p = probabilities(lambdaHome, lambdaAway);
  return {
    "1X2": { home: priceFor(p.home), draw: priceFor(p.draw), away: priceFor(p.away) },
    DC: {
      "1X": priceFor(p.home + p.draw),
      X2: priceFor(p.away + p.draw),
      "12": priceFor(p.home + p.away),
    },
    OU25: { over: priceFor(p.over25), under: priceFor(1 - p.over25) },
    BTTS: { yes: priceFor(p.bttsYes), no: priceFor(1 - p.bttsYes) },
  };
}

export interface SeasonTiming {
  /** Season start, epoch ms. */
  startMs: number;
  /** Seconds between rounds. 1800 by default; 300 for an accelerated season. */
  roundSeconds: number;
  /** Picks lock this many seconds before kick-off. */
  lockSeconds: number;
  /** Seconds from kick-off to full time. */
  fullTimeSeconds: number;
}

export const DEFAULT_TIMING = {
  roundSeconds: 1800,
  lockSeconds: 120,
  fullTimeSeconds: 600,
} as const;
export const ACCELERATED_TIMING = {
  roundSeconds: 300,
  lockSeconds: 60,
  fullTimeSeconds: 120,
} as const;

export interface PlannedFixture {
  round: number;
  home: string;
  away: string;
  kickoffMs: number;
  lambdaHome: number;
  lambdaAway: number;
  odds: PracticeOdds;
  /** Decided up front from the seed, kept secret by the database until full time. */
  plannedHome: number;
  plannedAway: number;
}

/**
 * Double round-robin for 8 teams (circle method): 14 rounds of 4 matches. Round r kicks off at
 * start + r x roundSeconds, so round 1 gives members one full round to pick before it starts.
 */
export function buildSeason(seed: number, timing: SeasonTiming): PlannedFixture[] {
  const next = rng(seed);
  const teams = PRACTICE_TEAMS;
  const n = teams.length;
  const order = teams.map((_, i) => i);
  const pairs: [number, number][][] = [];
  for (let r = 0; r < n - 1; r += 1) {
    const round: [number, number][] = [];
    for (let i = 0; i < n / 2; i += 1) {
      const a = order[i]!;
      const b = order[n - 1 - i]!;
      // Alternate home and away so no side always hosts.
      round.push((r + i) % 2 === 0 ? [a, b] : [b, a]);
    }
    pairs.push(round);
    // Rotate every team except the first.
    order.splice(1, 0, order.pop()!);
  }
  const reverse = pairs.map((round) => round.map(([h, a]) => [a, h] as [number, number]));
  const rounds = [...pairs, ...reverse];

  const out: PlannedFixture[] = [];
  rounds.forEach((round, idx) => {
    const kickoffMs = timing.startMs + (idx + 1) * timing.roundSeconds * 1000;
    for (const [h, a] of round) {
      const home = teams[h]!;
      const away = teams[a]!;
      const xg = expectedGoals(home, away);
      out.push({
        round: idx + 1,
        home: home.name,
        away: away.name,
        kickoffMs,
        lambdaHome: xg.home,
        lambdaAway: xg.away,
        odds: oddsFor(xg.home, xg.away),
        plannedHome: samplePoisson(xg.home, next),
        plannedAway: samplePoisson(xg.away, next),
      });
    }
  });
  return out;
}

export type PracticePhase = "upcoming" | "open" | "locked" | "live" | "finished";

/** Where a fixture is in its life at a given moment. Open from two rounds before kick-off until the lock. */
export function phaseAt(
  kickoffMs: number,
  nowMs: number,
  t: Pick<SeasonTiming, "roundSeconds" | "lockSeconds" | "fullTimeSeconds">,
): PracticePhase {
  const lockMs = kickoffMs - t.lockSeconds * 1000;
  const fullTimeMs = kickoffMs + t.fullTimeSeconds * 1000;
  const openMs = kickoffMs - 2 * t.roundSeconds * 1000;
  if (nowMs >= fullTimeMs) return "finished";
  if (nowMs >= kickoffMs) return "live";
  if (nowMs >= lockMs) return "locked";
  if (nowMs >= openMs) return "open";
  return "upcoming";
}

/** Points, mirroring the real `point_rules` values (confirm_email excluded; practice needs no email points). */
export const PRACTICE_POINT_RULES = {
  first_pick: { points: 20 },
  pick_locked: { points: 2, capPerDay: 10 },
  pick_settled: { points: 3 },
} as const;

/** Picks needed (settled) to earn the Practice Graduate badge. No cash value. */
export const GRADUATE_SETTLED_PICKS = 10;
