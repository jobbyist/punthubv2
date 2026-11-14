import { describe, expect, it } from "vitest";

import { duelErrorKey, gradeDuels, runDuelSettlement, validCalls, type SettleRow } from "./duels";

const row = (over: Partial<SettleRow>): SettleRow => ({
  duel_id: "d1",
  fixture_status: "finished",
  home_score: 2,
  away_score: 1,
  user_id: "a",
  market: "1X2",
  selection: "home",
  ...over,
});

describe("validCalls", () => {
  it("needs 2 or 3 distinct markets with valid selections", () => {
    expect(validCalls([{ market: "1X2", selection: "home" }])).toBe(false);
    expect(
      validCalls([
        { market: "1X2", selection: "home" },
        { market: "BTTS", selection: "yes" },
      ]),
    ).toBe(true);
    expect(
      validCalls([
        { market: "1X2", selection: "home" },
        { market: "1X2", selection: "away" },
      ]),
    ).toBe(false);
    expect(
      validCalls([
        { market: "1X2", selection: "over" },
        { market: "BTTS", selection: "yes" },
      ]),
    ).toBe(false);
  });
});

describe("gradeDuels", () => {
  it("grades every call with the shared grader", () => {
    const [v] = gradeDuels([
      row({ user_id: "a", market: "1X2", selection: "home" }),
      row({ user_id: "a", market: "BTTS", selection: "yes" }),
      row({ user_id: "b", market: "1X2", selection: "draw" }),
      row({ user_id: "b", market: "OU25", selection: "over" }),
    ]);
    expect(v!.void).toBe(false);
    expect(v!.results.map((r) => r.correct)).toEqual([true, true, false, true]);
  });
  it("voids a duel on a postponed match", () => {
    expect(gradeDuels([row({ fixture_status: "postponed" })])[0]).toMatchObject({ void: true });
  });
  it("leaves a final without a score for later", () => {
    expect(gradeDuels([row({ home_score: null, away_score: null })])).toEqual([]);
  });
  it("runs expire, grade and settle", async () => {
    const settled: string[] = [];
    const report = await runDuelSettlement({
      expire: async () => 2,
      toSettle: async () => [row({}), row({ user_id: "b", selection: "away" })],
      settle: async (v) => (settled.push(v.duelId), "settled"),
    });
    expect(report).toEqual({ expired: 2, graded: 1, outcomes: { settled: 1 } });
    expect(settled).toEqual(["d1"]);
  });
});

describe("duelErrorKey", () => {
  it("maps database errors to keys", () => {
    expect(duelErrorKey("insufficient_transferable")).toBe("errors.insufficient_transferable");
    expect(duelErrorKey("boom")).toBe("errors.generic");
  });
});
