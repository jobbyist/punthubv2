import { describe, expect, it } from "vitest";

import { adapterFor } from "./adapters";
import {
  coerceDraft,
  mapMarket,
  parseAmount,
  parseOdds,
  parseSlipText,
  validateDraft,
} from "./parse";
import { scrubSlipText } from "./scrub";

describe("scrubSlipText", () => {
  it("removes personal details and labelled lines", () => {
    const r = scrubSlipText(
      [
        "Username: thabo_88",
        "Balance R1 230.00",
        "Arsenal v Chelsea",
        "Contact thabo@example.com or 082 555 1234",
        "Ticket 1234567890123",
        "Match Result: Arsenal @ 1.85",
      ].join("\n"),
    );
    expect(r.text).not.toMatch(/thabo|1 230|082|1234567890123/);
    expect(r.text).toContain("Arsenal v Chelsea");
    expect(r.text).toContain("1.85");
    expect(r.removed).toBeGreaterThanOrEqual(5);
  });
  it("handles +27 numbers and caps length", () => {
    expect(scrubSlipText("call +27 82 555 1234").text).toBe("call [removed]");
    expect(scrubSlipText("x".repeat(5000)).text.length).toBe(4000);
  });
});

describe("odds and amounts", () => {
  it("parses decimal, comma and fractional odds", () => {
    expect(parseOdds("1.85")).toBe(1.85);
    expect(parseOdds("2,10")).toBe(2.1);
    expect(parseOdds("17/20")).toBe(1.85);
    expect(parseOdds("1.00")).toBeNull();
    expect(parseOdds("abc")).toBeNull();
  });
  it("parses rand amounts", () => {
    expect(parseAmount("R 1 250.00")).toBe(1250);
    expect(parseAmount("R50")).toBe(50);
    expect(parseAmount("50,00")).toBe(50);
    expect(parseAmount("0")).toBeNull();
  });
});

describe("mapMarket", () => {
  const m = (a: string, b: string) => mapMarket(a, b, "Kaizer Chiefs", "Orlando Pirates");
  it("maps supported markets", () => {
    expect(m("Match Result", "Kaizer Chiefs")).toEqual({ market: "1X2", selection: "home" });
    expect(m("1X2", "X")).toEqual({ market: "1X2", selection: "draw" });
    expect(m("Full Time Result", "2")).toEqual({ market: "1X2", selection: "away" });
    expect(m("Double Chance", "1X")).toEqual({ market: "DC", selection: "1X" });
    expect(m("Double Chance", "Draw or Orlando Pirates")).toEqual({
      market: "DC",
      selection: "X2",
    });
    expect(m("Both Teams To Score", "Yes")).toEqual({ market: "BTTS", selection: "yes" });
    expect(m("Total Goals Over/Under 2.5", "Under 2.5")).toEqual({
      market: "OU25",
      selection: "under",
    });
  });
  it("leaves unsupported markets tracked only", () => {
    expect(m("Correct Score", "2-1")).toBeNull();
    expect(m("Total Goals Over/Under 3.5", "Over 3.5")).toBeNull();
    expect(m("Handicap", "Kaizer Chiefs -1")).toBeNull();
  });
});

describe("parseSlipText", () => {
  it("reads legs, stake and return", () => {
    const d = parseSlipText(
      [
        "Betway",
        "Kaizer Chiefs v Orlando Pirates",
        "Match Result: Kaizer Chiefs",
        "@ 2.40",
        "Arsenal vs Chelsea 17:30",
        "Both Teams To Score: Yes 1.70",
        "Total Stake R50.00",
        "Potential Winnings R204.00",
      ].join("\n"),
    );
    expect(d.bookmaker).toBe("Betway");
    expect(d.legs).toHaveLength(2);
    expect(d.legs[0]).toMatchObject({
      home: "Kaizer Chiefs",
      away: "Orlando Pirates",
      market: "1X2",
      selection: "home",
      odds: 2.4,
    });
    expect(d.legs[1]).toMatchObject({
      home: "Arsenal",
      away: "Chelsea",
      market: "BTTS",
      selection: "yes",
      odds: 1.7,
    });
    expect(d.betType).toBe("multi");
    expect(d.stake).toBe(50);
    expect(d.potentialReturn).toBe(204);
    expect(d.totalOdds).toBe(4.08);
    expect(validateDraft(d)).toEqual([]);
  });
  it("does not mistake a market line for a fixture", () => {
    expect(parseSlipText("Match Result - Arsenal").legs).toHaveLength(0);
  });
});

describe("validation and coercion", () => {
  it("flags a bad selection and an empty slip", () => {
    expect(
      validateDraft({
        bookmaker: null,
        betType: "single",
        stake: null,
        totalOdds: null,
        potentialReturn: null,
        legs: [],
      }),
    ).toContain("no_legs");
    expect(
      validateDraft({
        bookmaker: null,
        betType: "single",
        stake: null,
        totalOdds: null,
        potentialReturn: null,
        legs: [{ home: "A", away: "B", market: "BTTS", selection: "maybe", odds: 1.5 }],
      }),
    ).toContain("leg_selection");
  });
  it("coerces untrusted JSON and drops junk", () => {
    const d = coerceDraft({
      bookmaker: "hollywoodbets",
      stake: "R20",
      legs: [
        { home: "Sundowns", away: "Pirates", market: "1X2", selection: "1", odds: "1.55" },
        { home: "" },
        7,
      ],
    });
    expect(d.bookmaker).toBe("Hollywoodbets");
    expect(d.stake).toBe(20);
    expect(d.legs).toEqual([
      expect.objectContaining({ home: "Sundowns", market: "1X2", selection: "home", odds: 1.55 }),
    ]);
    expect(coerceDraft(null).legs).toEqual([]);
  });
  it("routes text to the text adapter", () => {
    expect(adapterFor("Arsenal v Chelsea")?.id).toBe("text");
    expect(adapterFor("   ")).toBeNull();
  });
});
