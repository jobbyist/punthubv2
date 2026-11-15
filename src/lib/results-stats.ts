import type { SeasonResult } from "@/lib/records";

/** Home/draw/away shares and goals per game for a list of results. Pure arithmetic on stored scores. */
export function outcomeSplit(rows: SeasonResult[]) {
  const n = rows.length;
  if (n === 0) return null;
  let home = 0;
  let draw = 0;
  let goals = 0;
  for (const r of rows) {
    if (r.homeScore > r.awayScore) home++;
    else if (r.homeScore === r.awayScore) draw++;
    goals += r.homeScore + r.awayScore;
  }
  return { n, home: home / n, draw: draw / n, away: (n - home - draw) / n, gpg: goals / n };
}
