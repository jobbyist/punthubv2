import { describe, expect, it } from "vitest";

import type { FixtureRow } from "./pick-data";
import {
  groupResultsByDay,
  picksNeeded,
  previousWeekStart,
  summariseFixture,
  weekRange,
} from "./records";

const fixture = (id: string, kickoff: string): FixtureRow => ({
  id,
  sport: "soccer",
  competition: "Betway Premiership",
  home: "A",
  away: "B",
  kickoff_at: kickoff,
  status: "finished",
  home_score: 2,
  away_score: 1,
});

describe("weeks", () => {
  it("steps back by seven days across a month end", () => {
    expect(previousWeekStart("2026-11-02")).toBe("2026-10-26");
    expect(previousWeekStart("2026-03-02")).toBe("2026-02-23");
  });
  it("labels Monday to Sunday", () => {
    expect(weekRange("2026-10-26")).toEqual({ from: "Mon 26 Oct 2026", to: "Sun 1 Nov 2026" });
  });
});

describe("picksNeeded", () => {
  it("counts down to the 10 settled picks needed for a rank", () => {
    expect(picksNeeded(0)).toBe(10);
    expect(picksNeeded(7)).toBe(3);
    expect(picksNeeded(10)).toBe(0);
    expect(picksNeeded(14)).toBe(0);
  });
});

describe("summariseFixture", () => {
  const f = fixture("f1", "2026-10-31T15:30:00Z");
  it("reports the crowd win rate on settled picks only", () => {
    const s = summariseFixture(
      f,
      [
        { id: "1", user_id: "u1", username: null, result: "won" },
        { id: "2", user_id: "u2", username: null, result: "won" },
        { id: "3", user_id: "u3", username: null, result: "lost" },
        { id: "4", user_id: "u4", username: null, result: "void" },
        { id: "5", user_id: "u5", username: null, result: null },
      ],
      [],
    );
    expect(s).toMatchObject({ picks: 5, settled: 3 });
    expect(s.crowdWinRate).toBeCloseTo(2 / 3);
  });
  it("has no win rate until something is settled", () => {
    expect(
      summariseFixture(f, [{ id: "1", user_id: "u1", username: null, result: null }], [])
        .crowdWinRate,
    ).toBeNull();
    expect(summariseFixture(f, [], []).crowdWinRate).toBeNull();
  });
  it("picks out the top tipsters' picks", () => {
    const s = summariseFixture(
      f,
      [
        { id: "1", user_id: "top", username: "top_one", result: "won" },
        { id: "2", user_id: "other", username: null, result: "lost" },
      ],
      ["top"],
    );
    expect(s.leaders.map((l) => l.username)).toEqual(["top_one"]);
  });
});

describe("groupResultsByDay", () => {
  it("groups by SAST day and sums picks", () => {
    const mk = (id: string, k: string, picks: number) => ({
      fixture: fixture(id, k),
      picks,
      settled: 0,
      crowdWinRate: null,
      leaders: [],
    });
    const days = groupResultsByDay([
      mk("a", "2026-11-01T10:00:00Z", 2),
      mk("b", "2026-10-31T22:30:00Z", 3), // 00:30 SAST on 1 Nov: same day as "a"
      mk("c", "2026-10-31T15:00:00Z", 1),
    ]);
    expect(days.map((d) => [d.label, d.fixtures.length, d.picks])).toEqual([
      ["Sun 1 Nov 2026", 2, 5],
      ["Sat 31 Oct 2026", 1, 1],
    ]);
  });
});
