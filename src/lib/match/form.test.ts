import { describe, expect, it } from "vitest";

import { competitionMeta } from "./competition-meta";
import { computeForms, headToHead, perMatch, quotedList, type FinishedRow } from "./form";

const row = (
  home: string,
  away: string,
  hs: number | null,
  as: number | null,
  day: number,
): FinishedRow => ({
  id: `${home}-${away}-${day}`,
  competition: "Betway Premiership",
  home,
  away,
  kickoff_at: `2026-11-${String(day).padStart(2, "0")}T15:30:00Z`,
  home_score: hs,
  away_score: as,
});

const rows = [
  row("Kaizer Chiefs", "Orlando Pirates", 1, 2, 1),
  row("Orlando Pirates", "Sekhukhune United", 0, 0, 5),
  row("Stellenbosch", "Orlando Pirates", 3, 1, 9),
  row("Orlando Pirates", "Kaizer Chiefs", 2, 2, 12),
  row("Orlando Pirates", "AmaZulu", null, null, 13),
];

describe("computeForms", () => {
  it("returns newest first with W/D/L from the team's side", () => {
    const f = computeForms(rows, ["Orlando Pirates"])["Orlando Pirates"]!;
    expect(f.entries.map((e) => e.result)).toEqual(["D", "L", "D", "W"]);
    expect(f.entries[1]).toMatchObject({
      venue: "A",
      opponent: "Stellenbosch",
      scored: 1,
      conceded: 3,
    });
    expect([f.played, f.scored, f.conceded]).toEqual([4, 5, 6]);
  });
  it("caps at n and ignores rows without scores", () => {
    expect(computeForms(rows, ["Orlando Pirates"], 2)["Orlando Pirates"]!.played).toBe(2);
  });
  it("gives an empty form for a team with no stored results", () => {
    expect(computeForms(rows, ["Mamelodi Sundowns"])["Mamelodi Sundowns"]!.entries).toEqual([]);
  });
  it("matches names case-insensitively", () => {
    expect(computeForms(rows, ["kaizer chiefs"])["kaizer chiefs"]!.played).toBe(2);
  });
});

describe("headToHead / perMatch / quotedList", () => {
  it("finds meetings at either venue", () => {
    expect(headToHead(rows, "Kaizer Chiefs", "Orlando Pirates").map((r) => r.id)).toEqual([
      "Orlando Pirates-Kaizer Chiefs-12",
      "Kaizer Chiefs-Orlando Pirates-1",
    ]);
  });
  it("needs a minimum sample before averaging", () => {
    expect(perMatch(5, 2)).toBeNull();
    expect(perMatch(5, 4)).toBe("1.3");
  });
  it("quotes names so commas cannot break the filter", () => {
    expect(quotedList(["A, B", 'C "D"'])).toBe('"A, B","C \\"D\\""');
  });
});

describe("competitionMeta", () => {
  it("uses the monogram for known competitions and initials otherwise", () => {
    expect(competitionMeta("Betway Premiership")).toMatchObject({ short: "PSL", tone: "primary" });
    expect(competitionMeta("UEFA Champions League").short).toBe("UCL");
    expect(competitionMeta("Saudi Pro League").short).toBe("SPL");
  });
});
