import { describe, expect, it } from "vitest";

import { currentWeekStart } from "./pick-data";

describe("currentWeekStart", () => {
  it("is the Monday of the week in South Africa", () => {
    // Wed 4 Nov 2026 12:00 SAST
    expect(currentWeekStart(new Date("2026-11-04T10:00:00Z"))).toBe("2026-11-02");
    // Monday 2 Nov 00:30 SAST is still Monday 2 Nov, although it is Sunday in UTC
    expect(currentWeekStart(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-02");
    // Sunday 1 Nov 23:30 SAST belongs to the previous week
    expect(currentWeekStart(new Date("2026-11-01T21:30:00Z"))).toBe("2026-10-26");
  });
});
