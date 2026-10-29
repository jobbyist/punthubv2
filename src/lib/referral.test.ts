import { describe, expect, it } from "vitest";

import { foundingSpots } from "./founding";
import { inviteText, inviteUrl, shareText, whatsappUrl } from "./referral";

describe("foundingSpots", () => {
  it("counts down from the cap", () => {
    expect(foundingSpots(37)).toEqual({ cap: 100, taken: 37, left: 63 });
    expect(foundingSpots(0).left).toBe(100);
  });
  it("is zero when full and never negative", () => {
    expect(foundingSpots(100).left).toBe(0);
    expect(foundingSpots(104).left).toBe(0);
    expect(foundingSpots(-3)).toEqual({ cap: 100, taken: 0, left: 100 });
  });
});

describe("invite links", () => {
  it("builds the join link and the WhatsApp link", () => {
    expect(inviteUrl("abc12345")).toBe("https://puntr.co.za/join?ref=abc12345");
    const wa = whatsappUrl(inviteText("abc12345"));
    expect(wa.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(wa.slice("https://wa.me/?text=".length))).toContain(
      "https://puntr.co.za/join?ref=abc12345",
    );
  });
  it("escapes odd characters in a code", () => {
    expect(inviteUrl("a b&c")).toBe("https://puntr.co.za/join?ref=a%20b%26c");
  });
  it("contains no email, username or other personal detail", () => {
    expect(inviteText("abc12345")).not.toMatch(/@|username/i);
  });
});

describe("shareText", () => {
  it("matches the agreed wording", () => {
    expect(
      shareText({
        label: "Pirates to win",
        odds: "2.10",
        lockedBefore: "3h 12m",
        fixtureId: "f-1",
        code: "abc12345",
      }),
    ).toBe(
      "My pick: Pirates to win @ 2.10 - locked 3h 12m before kick-off on Puntr. puntr.co.za/match/f-1?ref=abc12345",
    );
  });
  it("omits the ref when there is no code", () => {
    expect(
      shareText({ label: "Over 2.5 goals", odds: "1.85", lockedBefore: "40m", fixtureId: "f-2" }),
    ).toBe(
      "My pick: Over 2.5 goals @ 1.85 - locked 40m before kick-off on Puntr. puntr.co.za/match/f-2",
    );
  });
});
