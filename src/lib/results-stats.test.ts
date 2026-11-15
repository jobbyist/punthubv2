import { describe, expect, it } from "vitest";

import { outcomeSplit } from "./results-stats";

const r = (h: number, a: number) => ({
  id: `${h}${a}${Math.random()}`,
  competition: "X",
  matchDate: "2026-01-01",
  home: "A",
  away: "B",
  homeScore: h,
  awayScore: a,
  sources: [],
});

describe("outcomeSplit", () => {
  it("splits home/draw/away and goals per game", () => {
    const s = outcomeSplit([r(2, 0), r(1, 1), r(0, 3), r(4, 1)])!;
    expect(s).toMatchObject({ n: 4, home: 0.5, draw: 0.25, away: 0.25, gpg: 3 });
  });
  it("returns null with no results", () => {
    expect(outcomeSplit([])).toBeNull();
  });
});
