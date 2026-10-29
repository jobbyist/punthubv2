import { describe, expect, it, vi } from "vitest";

import { runSettlement, type PendingPick, type SettlementStore } from "./settle.server";

const pick = (over: Partial<PendingPick> = {}): PendingPick => ({
  prediction_id: "p1",
  market: "1X2",
  selection: "home",
  line: null,
  odds: 2.1,
  status: "finished",
  home_score: 2,
  away_score: 1,
  ...over,
});

const store = (pending: PendingPick[], inserted?: number) => {
  const apply = vi.fn().mockImplementation(async (rows: unknown[]) => inserted ?? rows.length);
  return {
    pending: vi.fn().mockResolvedValue(pending),
    apply,
  } satisfies SettlementStore as SettlementStore & { apply: typeof apply };
};

describe("runSettlement", () => {
  it("grades pending picks and writes them in one call", async () => {
    const s = store([
      pick(),
      pick({ prediction_id: "p2", selection: "away" }),
      pick({ prediction_id: "p3", status: "cancelled", home_score: null, away_score: null }),
    ]);
    const report = await runSettlement(s);
    expect(report).toEqual({ ok: true, pending: 3, graded: 3, inserted: 3, skipped: 0 });
    expect(s.apply.mock.calls[0]![0]).toEqual([
      { prediction_id: "p1", result: "won", units: 1.1 },
      { prediction_id: "p2", result: "lost", units: -1 },
      { prediction_id: "p3", result: "void", units: 0 },
    ]);
  });
  it("leaves a finished fixture with no score for a later run", async () => {
    const s = store([pick({ home_score: null, away_score: null })]);
    expect(await runSettlement(s)).toEqual({
      ok: true,
      pending: 1,
      graded: 0,
      inserted: 0,
      skipped: 1,
    });
    expect(s.apply).not.toHaveBeenCalled();
  });
  it("does nothing when nothing is pending", async () => {
    const s = store([]);
    expect(await runSettlement(s)).toEqual({
      ok: true,
      pending: 0,
      graded: 0,
      inserted: 0,
      skipped: 0,
    });
    expect(s.apply).not.toHaveBeenCalled();
  });
  it("reports the database's count, which is lower on a repeat run", async () => {
    const s = store([pick()], 0);
    expect((await runSettlement(s)).inserted).toBe(0);
  });
  it("treats the numeric odds the database returns as strings safely", async () => {
    const s = store([pick({ odds: "2.10" as unknown as number })]);
    await runSettlement(s);
    expect(s.apply.mock.calls[0]![0][0].units).toBe(1.1);
  });
});
