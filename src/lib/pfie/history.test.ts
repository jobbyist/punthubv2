import { describe, expect, it } from "vitest";

import { completedMatchCounts, dedupeCompletedMatches, needsBackfill } from "./history";

const rows = [
  { matchDate: "2026-11-21", home: "Millwall", away: "QPR", homeScore: 0, awayScore: 1 },
  { matchDate: "2026-11-21", home: "Millwall", away: "Queens Park Rangers", homeScore: 0, awayScore: 1 },
];

describe("canonical completed match reconciliation", () => {
  it("counts aliases as one match for each canonical team", () => {
    const counts = completedMatchCounts(rows);
    expect(counts.get("millwall")).toBe(1);
    expect(counts.get("queens park rangers")).toBe(1);
  });

  it("quarantines a canonical match when duplicate evidence disagrees on score", () => {
    const conflicting = [
      ...rows.slice(0, 1),
      { ...rows[1]!, homeScore: 2, awayScore: 1 },
    ];
    expect(dedupeCompletedMatches(conflicting)).toHaveLength(0);
    expect(completedMatchCounts(conflicting).size).toBe(0);
  });

  it("resolves shortened publisher names against the current standings roster", () => {
    const roster = ["SV Werder Bremen", "Hamburger SV"];
    const result = completedMatchCounts([
      { matchDate: "2026-11-22", home: "Werder Bremen", away: "HSV", homeScore: 4, awayScore: 0 },
      { matchDate: "2026-11-22", home: "SV Werder Bremen", away: "Hamburger SV", homeScore: 4, awayScore: 0 },
    ], roster);
    expect(result.get("sv werder bremen")).toBe(1);
    expect(result.get("hamburger sv")).toBe(1);
  });

  it("keeps distinct match dates separate", () => {
    const counts = completedMatchCounts([
      ...rows.slice(0, 1),
      { ...rows[0]!, matchDate: "2026-11-24" },
    ]);
    expect(counts.get("millwall")).toBe(2);
    expect(counts.get("queens park rangers")).toBe(2);
  });

  it("uses canonical keys when deciding whether a team needs a backfill", () => {
    expect(needsBackfill(new Map([["queens park rangers", 8], ["millwall", 8]]), ["QPR", "Millwall"])).toBe(false);
  });
});
