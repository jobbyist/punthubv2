import { describe, expect, it } from "vitest";

import { grade, type GradeFixture } from "./settlement";

const fin = (h: number | null, a: number | null): GradeFixture => ({
  status: "finished",
  home_score: h,
  away_score: a,
});

describe("1X2", () => {
  it("grades home, draw and away on the full-time score", () => {
    expect(grade("1X2", "home", null, 2.1, fin(2, 1))).toEqual({ result: "won", units: 1.1 });
    expect(grade("1X2", "home", null, 2.1, fin(1, 1))).toEqual({ result: "lost", units: -1 });
    expect(grade("1X2", "draw", null, 3.4, fin(0, 0))).toEqual({ result: "won", units: 2.4 });
    expect(grade("1X2", "away", null, 4, fin(0, 1))).toEqual({ result: "won", units: 3 });
    expect(grade("1X2", "away", null, 4, fin(2, 1))).toEqual({ result: "lost", units: -1 });
  });
});

describe("double chance", () => {
  it("1X wins unless away wins", () => {
    expect(grade("DC", "1X", null, 1.3, fin(1, 1))?.result).toBe("won");
    expect(grade("DC", "1X", null, 1.3, fin(2, 0))?.result).toBe("won");
    expect(grade("DC", "1X", null, 1.3, fin(0, 1))?.result).toBe("lost");
  });
  it("X2 wins unless home wins", () => {
    expect(grade("DC", "X2", null, 1.3, fin(1, 1))?.result).toBe("won");
    expect(grade("DC", "X2", null, 1.3, fin(0, 2))?.result).toBe("won");
    expect(grade("DC", "X2", null, 1.3, fin(1, 0))?.result).toBe("lost");
  });
  it("12 wins unless it is a draw", () => {
    expect(grade("DC", "12", null, 1.2, fin(3, 2))?.result).toBe("won");
    expect(grade("DC", "12", null, 1.2, fin(0, 1))?.result).toBe("won");
    expect(grade("DC", "12", null, 1.2, fin(2, 2))?.result).toBe("lost");
  });
});

describe("over/under 2.5", () => {
  it("over wins from three goals, under wins up to two", () => {
    expect(grade("OU25", "over", null, 1.9, fin(2, 1))?.result).toBe("won");
    expect(grade("OU25", "over", null, 1.9, fin(1, 1))?.result).toBe("lost");
    expect(grade("OU25", "over", null, 1.9, fin(0, 3))?.result).toBe("won");
    expect(grade("OU25", "under", null, 1.9, fin(1, 1))?.result).toBe("won");
    expect(grade("OU25", "under", null, 1.9, fin(0, 0))?.result).toBe("won");
    expect(grade("OU25", "under", null, 1.9, fin(2, 1))?.result).toBe("lost");
  });
});

describe("both teams to score", () => {
  it("yes needs a goal from each side", () => {
    expect(grade("BTTS", "yes", null, 1.8, fin(1, 1))?.result).toBe("won");
    expect(grade("BTTS", "yes", null, 1.8, fin(3, 0))?.result).toBe("lost");
    expect(grade("BTTS", "yes", null, 1.8, fin(0, 0))?.result).toBe("lost");
    expect(grade("BTTS", "no", null, 1.8, fin(3, 0))?.result).toBe("won");
    expect(grade("BTTS", "no", null, 1.8, fin(0, 0))?.result).toBe("won");
    expect(grade("BTTS", "no", null, 1.8, fin(2, 2))?.result).toBe("lost");
  });
});

describe("rugby handicap", () => {
  it("adds the line to the home score", () => {
    // Bulls -6.5 beat Stormers 20-10: 20 - 6.5 = 13.5 > 10, home covers
    expect(grade("HCP", "home", -6.5, 1.9, fin(20, 10))).toEqual({ result: "won", units: 0.9 });
    // 20-14: 13.5 < 14, home fails and away covers
    expect(grade("HCP", "home", -6.5, 1.9, fin(20, 14))?.result).toBe("lost");
    expect(grade("HCP", "away", -6.5, 1.9, fin(20, 14))?.result).toBe("won");
    // positive line gives the home team a start
    expect(grade("HCP", "home", 7.5, 1.9, fin(10, 17))?.result).toBe("won");
  });
  it("is void on an exact tie, for either side", () => {
    expect(grade("HCP", "home", -7, 1.9, fin(20, 13))).toEqual({ result: "void", units: 0 });
    expect(grade("HCP", "away", -7, 1.9, fin(20, 13))).toEqual({ result: "void", units: 0 });
    expect(grade("HCP", "home", 0, 1.9, fin(10, 10))?.result).toBe("void");
  });
  it("does not lose a point to floating point error", () => {
    expect(grade("HCP", "home", -0.1, 2, fin(1, 1))?.result).toBe("lost");
    expect(grade("HCP", "home", 0.3, 2, fin(0, 1))?.result).toBe("lost");
    expect(grade("HCP", "home", 0.3, 2, fin(1, 1))?.result).toBe("won");
  });
  it("cannot be graded without a line", () => {
    expect(grade("HCP", "home", null, 1.9, fin(20, 10))).toBeNull();
  });
});

describe("void states", () => {
  it("postponed, abandoned and cancelled are void with 0 units, whatever the score", () => {
    for (const status of ["postponed", "abandoned", "cancelled"]) {
      expect(
        grade("1X2", "home", null, 2.5, { status, home_score: null, away_score: null }),
      ).toEqual({ result: "void", units: 0 });
      expect(grade("BTTS", "yes", null, 2.5, { status, home_score: 2, away_score: 1 })).toEqual({
        result: "void",
        units: 0,
      });
    }
  });
});

describe("not ready", () => {
  it("never grades a fixture that is not final, or has no score", () => {
    expect(
      grade("1X2", "home", null, 2, { status: "scheduled", home_score: null, away_score: null }),
    ).toBeNull();
    expect(
      grade("1X2", "home", null, 2, { status: "live", home_score: 1, away_score: 0 }),
    ).toBeNull();
    expect(grade("1X2", "home", null, 2, fin(null, null))).toBeNull();
    expect(grade("1X2", "home", null, 2, fin(2, null))).toBeNull();
  });
  it("ignores unknown markets, selections and impossible scores", () => {
    expect(grade("CS", "2-1", null, 9, fin(2, 1))).toBeNull();
    expect(grade("1X2", "banana", null, 2, fin(2, 1))).toBeNull();
    expect(grade("1X2", "home", null, 2, fin(-1, 0))).toBeNull();
    expect(grade("1X2", "home", null, 2, fin(1.5, 0))).toBeNull();
  });
});

describe("units", () => {
  it("won is odds - 1 to two decimals, lost is -1", () => {
    expect(grade("1X2", "home", null, 1.01, fin(1, 0))?.units).toBe(0.01);
    expect(grade("1X2", "home", null, 50, fin(1, 0))?.units).toBe(49);
    expect(grade("1X2", "home", null, 2.1, fin(1, 0))?.units).toBe(1.1);
    expect(grade("1X2", "home", null, 1.87, fin(0, 1))?.units).toBe(-1);
  });
});
