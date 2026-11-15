import { describe, expect, it } from "vitest";

import enHome from "@/locales/en-ZA/home.json";
import afHome from "@/locales/af/home.json";
import {
  DEFAULT_MATCHUP_ID,
  MARQUEE_MATCHUPS,
  isTwoWay,
  nextMatchupIndex,
  outcomeLabel,
  outcomesFor,
  roadmapWeek,
} from "./marquee-matchups";

describe("marquee matchups", () => {
  it("opens on the Soweto Derby so SSR and first client render match", () => {
    expect(MARQUEE_MATCHUPS[0]?.id).toBe(DEFAULT_MATCHUP_ID);
    expect(DEFAULT_MATCHUP_ID).toBe("soweto");
  });

  it("has unique ids, splits that sum to 100 and a lean among the outcomes", () => {
    const ids = MARQUEE_MATCHUPS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MARQUEE_MATCHUPS) {
      const total = outcomesFor(m).reduce((sum, k) => sum + (m.split[k] ?? 0), 0);
      expect(total, m.id).toBe(100);
      expect(outcomesFor(m)).toContain(m.lean);
      expect(m.confidence).toBeGreaterThan(0);
      expect(m.confidence).toBeLessThanOrEqual(100);
    }
  });

  it("treats basketball and cricket as two-way markets", () => {
    for (const m of MARQUEE_MATCHUPS) {
      expect(isTwoWay(m), m.id).toBe(m.sport === "basketball" || m.sport === "cricket");
    }
  });

  it("tags non-football sports with their roadmap week and football with none", () => {
    expect(roadmapWeek("soccer")).toBeNull();
    expect(roadmapWeek("rugby")).toBe(2);
    expect(roadmapWeek("basketball")).toBe(2);
    expect(roadmapWeek("cricket")).toBe(10);
  });

  it("wraps around when cycling", () => {
    expect(nextMatchupIndex(MARQUEE_MATCHUPS.length - 1)).toBe(0);
    expect(nextMatchupIndex(0)).toBe(1);
  });

  it("labels the draw as null so the caller translates it", () => {
    const soweto = MARQUEE_MATCHUPS[0]!;
    expect(outcomeLabel(soweto, "draw")).toBeNull();
    expect(outcomeLabel(soweto, "home")).toBe("Orlando Pirates");
  });

  it("has copy for every matchup in English and Afrikaans", () => {
    for (const loc of [enHome, afHome]) {
      const items = loc.matchups.items as Record<string, Record<string, string>>;
      for (const m of MARQUEE_MATCHUPS) {
        for (const f of ["short", "title", "tag", "competition", "venue", "insight"]) {
          expect(items[m.id]?.[f], `${m.id}.${f}`).toBeTruthy();
        }
      }
    }
  });
});
