import { describe, expect, it } from "vitest";

import { compareScores, DEFAULT_SCORING_RULES, pointsFor } from "./scoreboard";

describe("competition points", () => {
  it("scores the brief's three markets 3, 2 and 2 and nothing for a wrong or void pick", () => {
    expect(pointsFor("1X2", "won", DEFAULT_SCORING_RULES)).toBe(3);
    expect(pointsFor("BTTS", "won", DEFAULT_SCORING_RULES)).toBe(2);
    expect(pointsFor("OU25", "won", DEFAULT_SCORING_RULES)).toBe(2);
    expect(pointsFor("1X2", "lost", DEFAULT_SCORING_RULES)).toBe(0);
    expect(pointsFor("1X2", "void", DEFAULT_SCORING_RULES)).toBe(0);
    expect(pointsFor("UNKNOWN", "won", DEFAULT_SCORING_RULES)).toBe(0);
  });
  it("breaks ties by correct picks, then accuracy, then settled picks, then username", () => {
    const rows = [
      { username: "alice", points: 3, correct: 1, settled: 2 },
      { username: "cara", points: 3, correct: 1, settled: 1 },
      { username: "bob", points: 3, correct: 2, settled: 2 },
      { username: "zed", points: 6, correct: 2, settled: 5 },
      { username: "amy", points: 3, correct: 1, settled: 2 },
    ];
    expect([...rows].sort(compareScores).map((r) => r.username)).toEqual([
      "zed",
      "bob",
      "cara",
      "alice",
      "amy",
    ]);
  });
  it("puts more settled picks first when points, correct picks and accuracy are level", () => {
    // Only possible with no correct picks: equal correct and equal accuracy otherwise mean equal settled.
    const more = { username: "zoe", points: 0, correct: 0, settled: 5 };
    const fewer = { username: "amy", points: 0, correct: 0, settled: 2 };
    expect(compareScores(more, fewer)).toBeLessThan(0);
  });
  it("falls back to username when everything else is level", () => {
    const a = { username: "a", points: 6, correct: 2, settled: 4 };
    expect(compareScores(a, { ...a, username: "b" })).toBeLessThan(0);
  });
});
