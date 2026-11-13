import { describe, expect, it } from "vitest";

import { DEFAULT_LAUNCH_AT, gateOpen } from "./launch-gate";

describe("launch gate", () => {
  const before = new Date("2026-11-30T21:59:00Z");
  const after = new Date("2026-11-30T22:00:00Z");
  it("is closed to members before 1 December 00:00 SAST", () => {
    expect(gateOpen(before, DEFAULT_LAUNCH_AT, false, false)).toBe(false);
  });
  it("is open to admins and Early-access testers before launch", () => {
    expect(gateOpen(before, DEFAULT_LAUNCH_AT, true, false)).toBe(true);
    expect(gateOpen(before, DEFAULT_LAUNCH_AT, false, true)).toBe(true);
  });
  it("opens to everyone at launch", () => {
    expect(gateOpen(after, DEFAULT_LAUNCH_AT, false, false)).toBe(true);
  });
});
