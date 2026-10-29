import { describe, expect, it } from "vitest";

import { sastDate } from "./sast";

describe("sastDate", () => {
  it("is the South African calendar date", () => {
    expect(sastDate(new Date("2026-10-29T21:55:00Z"))).toBe("2026-10-29"); // 23:55 SAST
    expect(sastDate(new Date("2026-10-29T22:00:00Z"))).toBe("2026-10-30"); // midnight SAST
    expect(sastDate(new Date("2026-10-30T00:30:00Z"))).toBe("2026-10-30");
  });
});
