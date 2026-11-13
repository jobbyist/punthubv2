import { describe, expect, it } from "vitest";

import { cleanTargetUrl, parseNotificationInput } from "./admin-notifications";

const NOW = Date.parse("2026-11-13T18:00:00Z");
const base = { title: "Hello members", message: "Practice Mode season 2 starts tonight." };

describe("cleanTargetUrl", () => {
  it("keeps in-app paths and turns puntr.co.za links into paths", () => {
    expect(cleanTargetUrl("/founding#annual-pass")).toBe("/founding#annual-pass");
    expect(cleanTargetUrl("https://puntr.co.za/practice?x=1")).toBe("/practice?x=1");
    expect(cleanTargetUrl("https://www.instagram.com/puntr")).toBe(
      "https://www.instagram.com/puntr",
    );
    expect(cleanTargetUrl("  ")).toBeNull();
  });
  it("refuses unsafe links", () => {
    expect(() => cleanTargetUrl("//evil.example")).toThrow();
    expect(() => cleanTargetUrl("javascript:alert(1)")).toThrow();
    expect(() => cleanTargetUrl("http://example.com")).toThrow();
    expect(() => cleanTargetUrl("https://user:pw@example.com")).toThrow();
  });
});

describe("parseNotificationInput", () => {
  it("defaults to everyone, Announcements, send now", () => {
    const r = parseNotificationInput(base, NOW);
    expect(r).toMatchObject({ audience: "all", category: "Announcements", publishAt: null });
  });
  it("needs a username for one member", () => {
    expect(() => parseNotificationInput({ ...base, audience: "member" }, NOW)).toThrow();
    expect(
      parseNotificationInput({ ...base, audience: "member", username: "@MyKeyFR" }, NOW).username,
    ).toBe("mykeyfr");
  });
  it("schedules future times, sends past times now, refuses far-future times", () => {
    expect(
      parseNotificationInput({ ...base, publishAt: "2026-11-14T06:00:00Z" }, NOW).publishAt,
    ).toBe("2026-11-14T06:00:00.000Z");
    expect(
      parseNotificationInput({ ...base, publishAt: "2026-11-01T06:00:00Z" }, NOW).publishAt,
    ).toBeNull();
    expect(() =>
      parseNotificationInput({ ...base, publishAt: "2027-06-01T06:00:00Z" }, NOW),
    ).toThrow();
  });
  it("enforces lengths", () => {
    expect(() => parseNotificationInput({ title: "Hi", message: "ok ok" }, NOW)).toThrow();
    expect(() => parseNotificationInput({ ...base, message: "x".repeat(401) }, NOW)).toThrow();
  });
});
