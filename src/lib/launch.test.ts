import { describe, expect, it } from "vitest";

import {
  addDays,
  cleanEmail,
  launchDate,
  launchMessages,
  toE164ZA,
  waveDates,
  waveFor,
} from "./launch";

describe("launch waves", () => {
  it("runs on launch day, +3 and +7", () => {
    expect(waveDates("2026-11-02").map((w) => w.date)).toEqual([
      "2026-11-02",
      "2026-11-05",
      "2026-11-09",
    ]);
    expect(waveFor("2026-11-02", "2026-11-02")).toBe(1);
    expect(waveFor("2026-11-05", "2026-11-02")).toBe(2);
    expect(waveFor("2026-11-09", "2026-11-02")).toBe(3);
    expect(waveFor("2026-11-03", "2026-11-02")).toBeNull();
    expect(addDays("2026-11-28", 3)).toBe("2026-12-01");
  });
  it("falls back to the default launch date for bad input", () => {
    expect(launchDate(undefined)).toBe("2026-11-02");
    expect(launchDate("tomorrow")).toBe("2026-11-02");
    expect(launchDate("2026-13-45")).toBe("2026-11-02");
    expect(launchDate(" 2026-11-09 ")).toBe("2026-11-09");
  });
});

describe("cleanEmail", () => {
  it("removes a leading www. and normalises case", () => {
    expect(cleanEmail("www.itumelengtumza1350@gmail.com")).toBe("itumelengtumza1350@gmail.com");
    expect(cleanEmail("  Foo@Example.com ")).toBe("foo@example.com");
    expect(cleanEmail("wwwfoo@example.com")).toBe("wwwfoo@example.com");
  });
});

describe("toE164ZA", () => {
  it("normalises South African numbers", () => {
    expect(toE164ZA("0659979455")).toBe("+27659979455");
    expect(toE164ZA("+27695985061")).toBe("+27695985061");
    expect(toE164ZA("27 76 757 2016")).toBe("+27767572016");
  });
  it("leaves anything else for a person to check", () => {
    expect(toE164ZA("07083645780")).toBeNull();
    expect(toE164ZA("")).toBeNull();
    expect(toE164ZA(null)).toBeNull();
  });
});

describe("launchMessages", () => {
  it("keeps the SMS short and carries 18+ and the helpline", () => {
    const m = launchMessages("Nzube prosper");
    expect(m.sms.length).toBeLessThanOrEqual(160);
    for (const t of [m.sms, m.whatsapp]) {
      expect(t).toContain("18+");
      expect(t).toContain("0800 006 008");
    }
    expect(m.whatsapp.startsWith("Hi Nzube,")).toBe(true);
    expect(`${m.sms} ${m.whatsapp}`).not.toMatch(/guarantee|win money|earn more|sure/i);
  });
});
