import { grade, type Graded } from "./settlement";

export interface PendingPick {
  prediction_id: string;
  market: string;
  selection: string;
  line: number | null;
  odds: number;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

/** The two database functions the route needs, so it can be tested with fakes. */
export interface SettlementStore {
  pending(): Promise<PendingPick[]>;
  apply(
    rows: { prediction_id: string; result: Graded["result"]; units: number }[],
  ): Promise<number>;
}

export interface SettleReport {
  ok: true;
  pending: number;
  graded: number;
  inserted: number;
  /** Picks left for a later run because their fixture is final but has no usable score. */
  skipped: number;
}

/** Grades every pending pick and writes the results. Safe to run repeatedly and in parallel. */
export async function runSettlement(store: SettlementStore): Promise<SettleReport> {
  const pending = await store.pending();
  const rows: { prediction_id: string; result: Graded["result"]; units: number }[] = [];
  for (const p of pending) {
    const g = grade(p.market, p.selection, p.line, Number(p.odds), p);
    if (g) rows.push({ prediction_id: p.prediction_id, ...g });
  }
  const inserted = rows.length ? await store.apply(rows) : 0;
  return {
    ok: true,
    pending: pending.length,
    graded: rows.length,
    inserted,
    skipped: pending.length - rows.length,
  };
}
