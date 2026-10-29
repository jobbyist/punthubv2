/**
 * Grading rules. Pure and exhaustively tested: this is the product's integrity, so every market and edge case
 * has a test. Scores are the full-time score (90 minutes for soccer, no extra time or penalties).
 *
 * - 1X2: home, draw or away on the full-time score.
 * - DC (double chance): 1X wins if home does not lose, X2 if away does not lose, 12 if there is a winner.
 * - OU25: Over wins when total goals are 3 or more, Under otherwise. 2.5 can never tie.
 * - BTTS: Yes wins when both teams scored.
 * - HCP (rugby): home score + line against away score. An exact tie is void.
 * - Postponed, abandoned or cancelled: void.
 * Units: won = odds - 1, lost = -1, void = 0, rounded to two decimals.
 */

export type GradeResult = "won" | "lost" | "void";

export interface Graded {
  result: GradeResult;
  units: number;
}

export interface GradeFixture {
  status: string;
  home_score: number | null;
  away_score: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function outcome(result: GradeResult, odds: number): Graded {
  if (result === "won") return { result, units: round2(odds - 1) };
  if (result === "lost") return { result, units: -1 };
  return { result, units: 0 };
}

/**
 * Returns the grade, or null when the pick cannot be graded yet (a finished fixture with no score, a fixture
 * that has not reached a final state, or an unknown market or selection). Null is never written.
 */
export function grade(
  market: string,
  selection: string,
  line: number | null,
  odds: number,
  fixture: GradeFixture,
): Graded | null {
  if (
    fixture.status === "postponed" ||
    fixture.status === "abandoned" ||
    fixture.status === "cancelled"
  ) {
    return outcome("void", odds);
  }
  if (fixture.status !== "finished") return null;

  const h = fixture.home_score;
  const a = fixture.away_score;
  if (h === null || a === null || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0)
    return null;

  const win = (cond: boolean) => outcome(cond ? "won" : "lost", odds);

  switch (market) {
    case "1X2":
      if (selection === "home") return win(h > a);
      if (selection === "draw") return win(h === a);
      if (selection === "away") return win(a > h);
      return null;
    case "DC":
      if (selection === "1X") return win(h >= a);
      if (selection === "X2") return win(a >= h);
      if (selection === "12") return win(h !== a);
      return null;
    case "OU25":
      if (selection === "over") return win(h + a >= 3);
      if (selection === "under") return win(h + a <= 2);
      return null;
    case "BTTS":
      if (selection === "yes") return win(h > 0 && a > 0);
      if (selection === "no") return win(!(h > 0 && a > 0));
      return null;
    case "HCP": {
      if (line === null || !Number.isFinite(line)) return null;
      // Work in hundredths so a line such as -6.5 never meets floating point error.
      const diff = Math.round((h + line - a) * 100);
      if (diff === 0) return outcome("void", odds);
      if (selection === "home") return win(diff > 0);
      if (selection === "away") return win(diff < 0);
      return null;
    }
    default:
      return null;
  }
}
