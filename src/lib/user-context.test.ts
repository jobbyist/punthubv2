import { describe, expect, it } from "vitest";

import {
  EMPTY_SIGNALS,
  deriveSegment,
  foldVisit,
  nextBestAction,
  partOfDay,
  type ContextInput,
} from "./user-context";

const base: ContextInput = {
  isSignedIn: false,
  pickCount: null,
  hasFavourites: false,
  isStandalone: false,
  local: EMPTY_SIGNALS,
};

describe("deriveSegment", () => {
  it("tells first-time and returning guests apart", () => {
    expect(deriveSegment(base)).toBe("guest-first");
    expect(deriveSegment({ ...base, local: { ...EMPTY_SIGNALS, visits: 3 } })).toBe(
      "guest-returning",
    );
  });
  it("tells new and active members apart", () => {
    expect(deriveSegment({ ...base, isSignedIn: true, pickCount: 0 })).toBe("member-onboarding");
    expect(deriveSegment({ ...base, isSignedIn: true, pickCount: 4 })).toBe("member-active");
  });
});

describe("nextBestAction", () => {
  it("walks members from first pick to favourites to their last match", () => {
    expect(nextBestAction({ ...base, isSignedIn: true, pickCount: 0 }).key).toBe("firstPick");
    expect(nextBestAction({ ...base, isSignedIn: true, pickCount: 2 }).key).toBe("favourites");
    const back = nextBestAction({
      ...base,
      isSignedIn: true,
      pickCount: 2,
      hasFavourites: true,
      local: { ...EMPTY_SIGNALS, lastMatchId: "abc" },
    });
    expect(back).toEqual({
      key: "continueMatch",
      to: "/match/$fixtureId",
      params: { fixtureId: "abc" },
    });
  });
  it("asks returning guests to join and first-timers to learn", () => {
    expect(nextBestAction(base).key).toBe("learn");
    expect(nextBestAction({ ...base, local: { ...EMPTY_SIGNALS, visits: 2 } }).key).toBe("join");
  });
});

describe("foldVisit", () => {
  it("counts a new visit only after 30 minutes and remembers the last match", () => {
    const t0 = new Date("2026-11-27T10:00:00Z");
    const a = foldVisit(EMPTY_SIGNALS, "/discover", t0);
    expect(a.visits).toBe(1);
    const b = foldVisit(a, "/match/xyz?tab=h2h", new Date("2026-11-27T10:10:00Z"));
    expect(b.visits).toBe(1);
    expect(b.lastMatchId).toBe("xyz");
    expect(b.recentPaths).toEqual(["/match/xyz", "/discover"]);
    const c = foldVisit(b, "/discover", new Date("2026-11-27T11:00:00Z"));
    expect(c.visits).toBe(2);
    expect(c.recentPaths[0]).toBe("/discover");
  });

  it("does not throw on a malformed match id", () => {
    const a = foldVisit(EMPTY_SIGNALS, "/match/%GH", new Date("2026-11-27T10:00:00Z"));
    expect(a.lastMatchId).toBe("%GH");
  });
});

describe("partOfDay", () => {
  it("uses South African time", () => {
    expect(partOfDay(new Date("2026-11-27T05:00:00Z"))).toBe("morning"); // 07:00 SAST
    expect(partOfDay(new Date("2026-11-27T12:00:00Z"))).toBe("afternoon"); // 14:00 SAST
    expect(partOfDay(new Date("2026-11-27T18:00:00Z"))).toBe("evening"); // 20:00 SAST
  });
});
