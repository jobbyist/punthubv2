import { describe, expect, it } from "vitest";

import { selectionLabel } from "./pick-labels";

// A stand-in translator that mirrors the English strings closely enough to test the wiring.
const fake = (key: string, o: Record<string, unknown> = {}) =>
  ({
    "selection.draw": "Draw",
    "selection.over": "Over 2.5 goals",
    "selection.under": "Under 2.5 goals",
    "selection.yes": "Yes",
    "selection.no": "No",
    "selection.homeOrDraw": `${o["home"]} or draw`,
    "selection.drawOrAway": `Draw or ${o["away"]}`,
    "selection.homeOrAway": `${o["home"]} or ${o["away"]}`,
    "selection.handicap": `${o["team"]} ${o["line"]}`,
  })[key] ?? key;

const t = fake as never;
const teams = { home: "Bulls", away: "Stormers" };

describe("selectionLabel", () => {
  it("names the team for Match result picks", () => {
    expect(selectionLabel(t, { market: "1X2", selection: "home", line: null }, teams)).toBe(
      "Bulls",
    );
    expect(selectionLabel(t, { market: "1X2", selection: "away", line: null }, teams)).toBe(
      "Stormers",
    );
    expect(selectionLabel(t, { market: "1X2", selection: "draw", line: null }, teams)).toBe("Draw");
  });
  it("words double chance", () => {
    expect(selectionLabel(t, { market: "DC", selection: "1X", line: null }, teams)).toBe(
      "Bulls or draw",
    );
    expect(selectionLabel(t, { market: "DC", selection: "X2", line: null }, teams)).toBe(
      "Draw or Stormers",
    );
    expect(selectionLabel(t, { market: "DC", selection: "12", line: null }, teams)).toBe(
      "Bulls or Stormers",
    );
  });
  it("applies the handicap line to the home team and mirrors it for the away team", () => {
    expect(selectionLabel(t, { market: "HCP", selection: "home", line: -6.5 }, teams)).toBe(
      "Bulls -6.5",
    );
    expect(selectionLabel(t, { market: "HCP", selection: "away", line: -6.5 }, teams)).toBe(
      "Stormers +6.5",
    );
    expect(selectionLabel(t, { market: "HCP", selection: "home", line: 3 }, teams)).toBe(
      "Bulls +3",
    );
  });
  it("handles totals and both teams to score", () => {
    expect(selectionLabel(t, { market: "OU25", selection: "over", line: null }, teams)).toBe(
      "Over 2.5 goals",
    );
    expect(selectionLabel(t, { market: "BTTS", selection: "no", line: null }, teams)).toBe("No");
  });
});
