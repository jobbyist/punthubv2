import { describe, expect, it } from "vitest";

import { resultsGapMs } from "./provider";

describe("settlement-aware result polling", () => {
  it("checks every five minutes during the expected full-time settlement window", () => {
    expect(resultsGapMs(105 * 60_000)).toBe(5 * 60_000);
    expect(resultsGapMs(164 * 60_000)).toBe(5 * 60_000);
  });

  it("keeps five-minute checks active through the first four hours after kick-off", () => {
    expect(resultsGapMs(239 * 60_000)).toBe(5 * 60_000);
  });

  it("backs off to fifteen minutes for older unresolved matches", () => {
    expect(resultsGapMs(240 * 60_000)).toBe(15 * 60_000);
    expect(resultsGapMs(719 * 60_000)).toBe(15 * 60_000);
  });

  it("keeps stale unresolved fixtures in a bounded hourly retry cycle", () => {
    expect(resultsGapMs(720 * 60_000)).toBe(60 * 60_000);
    expect(resultsGapMs(24 * 60 * 60_000)).toBe(60 * 60_000);
  });
});
