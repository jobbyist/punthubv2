import { describe, expect, it } from "vitest";

import { grade } from "@/lib/settlement";

import {
  ACCELERATED_TIMING,
  buildSeason,
  DEFAULT_TIMING,
  oddsFor,
  phaseAt,
  PRACTICE_TEAMS,
  priceFor,
  probabilities,
  rng,
} from "./simulator";

const timing = { startMs: Date.UTC(2026, 10, 12, 8, 0, 0), ...DEFAULT_TIMING };

describe("practice simulator", () => {
  it("is deterministic for a seed and differs between seeds", () => {
    const a = buildSeason(42, timing);
    const b = buildSeason(42, timing);
    const c = buildSeason(43, timing);
    expect(a).toEqual(b);
    expect(a.map((f) => [f.plannedHome, f.plannedAway])).not.toEqual(
      c.map((f) => [f.plannedHome, f.plannedAway]),
    );
  });

  it("builds a double round-robin: 14 rounds of 4, every pairing home and away once", () => {
    const s = buildSeason(7, timing);
    expect(s).toHaveLength(56);
    expect(new Set(s.map((f) => f.round)).size).toBe(14);
    for (let r = 1; r <= 14; r += 1) {
      const round = s.filter((f) => f.round === r);
      expect(round).toHaveLength(4);
      const teams = round.flatMap((f) => [f.home, f.away]);
      expect(new Set(teams).size).toBe(8); // each team plays once per round
    }
    const keys = s.map((f) => `${f.home}|${f.away}`);
    expect(new Set(keys).size).toBe(56);
    for (const f of s) expect(f.home).not.toBe(f.away);
  });

  it("uses only invented clubs and never a real-club name", () => {
    const real =
      /(chiefs|pirates|sundowns|manchester|arsenal|liverpool|chelsea|real madrid|barcelona|bafana)/i;
    for (const t of PRACTICE_TEAMS) expect(t.name).not.toMatch(real);
  });

  it("spaces rounds by the round length and starts after one round", () => {
    const s = buildSeason(1, timing);
    expect(s[0]!.kickoffMs).toBe(timing.startMs + 1800 * 1000);
    expect(s.at(-1)!.kickoffMs).toBe(timing.startMs + 14 * 1800 * 1000);
    const fast = buildSeason(1, { startMs: timing.startMs, ...ACCELERATED_TIMING });
    expect(fast[0]!.kickoffMs).toBe(timing.startMs + 300 * 1000);
  });

  it("probabilities sum to one and favour the stronger side at home", () => {
    const p = probabilities(1.8, 0.9);
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 6);
    expect(p.home).toBeGreaterThan(p.away);
    expect(p.over25).toBeGreaterThan(0);
    expect(p.bttsYes).toBeGreaterThan(0);
  });

  it("prices stay inside the real pick limits and have a margin", () => {
    expect(priceFor(0.00001)).toBe(50);
    expect(priceFor(0.9999)).toBeGreaterThanOrEqual(1.01);
    const o = oddsFor(1.4, 1.1);
    const book = 1 / o["1X2"].home + 1 / o["1X2"].draw + 1 / o["1X2"].away;
    expect(book).toBeGreaterThan(1);
    for (const v of Object.values(o))
      for (const x of Object.values(v)) {
        expect(x).toBeGreaterThanOrEqual(1.01);
        expect(x).toBeLessThanOrEqual(50);
      }
  });

  it("scores feed the real grader unchanged", () => {
    const f = buildSeason(5, timing)[0]!;
    const fixture = { status: "finished", home_score: f.plannedHome, away_score: f.plannedAway };
    const g = grade(
      "1X2",
      f.plannedHome > f.plannedAway ? "home" : f.plannedHome === f.plannedAway ? "draw" : "away",
      null,
      f.odds["1X2"].home,
      fixture,
    );
    expect(g?.result).toBe("won");
  });

  it("walks a fixture through its phases", () => {
    const t = { roundSeconds: 1800, lockSeconds: 120, fullTimeSeconds: 600 };
    const ko = Date.UTC(2026, 10, 12, 10, 0, 0);
    expect(phaseAt(ko, ko - 3 * 1800_000, t)).toBe("upcoming");
    expect(phaseAt(ko, ko - 1800_000, t)).toBe("open");
    expect(phaseAt(ko, ko - 60_000, t)).toBe("locked");
    expect(phaseAt(ko, ko + 60_000, t)).toBe("live");
    expect(phaseAt(ko, ko + 601_000, t)).toBe("finished");
  });

  it("scores look like football over a season", () => {
    const goals = buildSeason(99, timing).map((f) => f.plannedHome + f.plannedAway);
    const avg = goals.reduce((a, b) => a + b, 0) / goals.length;
    expect(avg).toBeGreaterThan(1.8);
    expect(avg).toBeLessThan(3.8);
    expect(rng(1)()).toBeLessThan(1);
  });
});
