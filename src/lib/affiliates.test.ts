import { describe, expect, it } from "vitest";

import { daysUntil } from "./affiliates";

describe("daysUntil", () => {
  const now = new Date(2026, 10, 11, 18, 30);
  it("counts calendar days", () => {
    expect(daysUntil("2026-11-20", now)).toBe(9);
    expect(daysUntil("2026-11-11", now)).toBe(0);
    expect(daysUntil("2026-11-09", now)).toBe(-2);
  });
  it("handles missing or bad dates", () => {
    expect(daysUntil(null, now)).toBeNull();
    expect(daysUntil("nope", now)).toBeNull();
  });
});
