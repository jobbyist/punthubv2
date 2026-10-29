import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatPhone,
  formatTime,
  formatUnits,
  money,
  odds,
  pct,
} from "./format";

const NBSP = " ";

describe("money", () => {
  it("drops cents for whole rand", () => {
    expect(money(1234)).toBe(`R1${NBSP}234`);
    expect(money(0)).toBe("R0");
    expect(money(99)).toBe("R99");
  });
  it("uses a decimal comma with two places", () => {
    expect(money(1234.5)).toBe(`R1${NBSP}234,50`);
    expect(money(0.05)).toBe("R0,05");
  });
  it("groups millions and handles negatives", () => {
    expect(money(1234567)).toBe(`R1${NBSP}234${NBSP}567`);
    expect(money(-250)).toBe("-R250");
  });
  it("rounds to the cent without float drift", () => {
    expect(money(1.005 + 0.1)).toBe("R1,11");
  });
  it("returns empty for non-finite input", () => {
    expect(money(NaN)).toBe("");
  });
});

describe("odds", () => {
  it("always shows two places with a decimal point", () => {
    expect(odds(2.1)).toBe("2.10");
    expect(odds(3)).toBe("3.00");
    expect(odds(1.875)).toBe("1.88");
  });
});

describe("pct", () => {
  it("formats a fraction", () => {
    expect(pct(0.62)).toBe("62%");
    expect(pct(0.625, 1)).toBe("62.5%");
  });
});

describe("dates and times", () => {
  // 15:30 UTC is 17:30 in Johannesburg (UTC+2, no DST).
  const d = new Date("2026-10-31T15:30:00Z");
  it("formats a date", () => expect(formatDate(d)).toBe("Sat 31 Oct 2026"));
  it("formats a 24-hour time with SAST", () => expect(formatTime(d)).toBe("17:30 SAST"));
  it("rolls the date over in SAST", () => {
    expect(formatDate(new Date("2026-10-31T22:30:00Z"))).toBe("Sun 1 Nov 2026");
  });
  it("pads midnight hours", () =>
    expect(formatTime(new Date("2026-10-31T22:05:00Z"))).toBe("00:05 SAST"));
  it("combines both", () => expect(formatDateTime(d)).toBe("Sat 31 Oct 2026, 17:30 SAST"));
});

describe("formatPhone", () => {
  it("normalises to +27", () => {
    expect(formatPhone("082 123 4567")).toBe("+27 82 123 4567");
    expect(formatPhone("+27821234567")).toBe("+27 82 123 4567");
  });
  it("leaves unrecognised input alone", () => expect(formatPhone("12345")).toBe("12345"));
});

describe("formatUnits", () => {
  it("signs and fixes to two places", () => {
    expect(formatUnits(1.1)).toBe("+1.10");
    expect(formatUnits(-2)).toBe("-2.00");
    expect(formatUnits(0)).toBe("0.00");
    expect(formatUnits(-0.001)).toBe("0.00");
  });
});
