/**
 * Practice settlement: the REAL grader (`grade()`) applied to practice picks. Pure, so it is tested without a
 * database. Nothing here touches the real predictions or settlements.
 */
import { grade } from "@/lib/settlement";

export interface PracticePickRow {
  id: string;
  fixture_id: string;
  user_id: string;
  market: string;
  selection: string;
  odds: number;
}

export interface PracticeFinishedFixture {
  id: string;
  home_score: number;
  away_score: number;
}

export interface PracticeSettlement {
  id: string;
  user_id: string;
  result: "won" | "lost" | "void";
  units: number;
}

/** Grades every pick whose fixture has finished. Picks that cannot be graded are left alone (never guessed). */
export function settlePracticePicks(
  picks: PracticePickRow[],
  finished: PracticeFinishedFixture[],
): PracticeSettlement[] {
  const byId = new Map(finished.map((f) => [f.id, f]));
  const out: PracticeSettlement[] = [];
  for (const p of picks) {
    const f = byId.get(p.fixture_id);
    if (!f) continue;
    const g = grade(p.market, p.selection, null, p.odds, {
      status: "finished",
      home_score: f.home_score,
      away_score: f.away_score,
    });
    if (g) out.push({ id: p.id, user_id: p.user_id, result: g.result, units: g.units });
  }
  return out;
}
