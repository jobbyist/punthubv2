import { describe, expect, it } from "vitest";

import { canonicalTimestamp, computePickHash, hashPreimage, isPickId, verifyPick } from "./verify";

// A real pick written by create_prediction on the live database (rolled back test data). Its hash was computed by Postgres.
const REAL = {
  id: "9faaef2d-f559-4698-868f-73f1c0f669a9",
  prev_hash: "9b8a93265a35a498d8aaf13936754894448d6f657fa3cd4a9e5d885cc84b3039",
  user_id: "5a09f663-db87-4f31-b2c2-36cf2c2443d5",
  fixture_id: "e2bb2f06-f3ec-4414-818a-722dc034440c",
  market: "1X2",
  selection: "draw",
  line: null,
  odds: 3.2,
  created_at: "2026-10-29 09:09:59.911703+00",
  hash: "ccd9fd562ee31f73cc23d07f7d46f70451dd59f70f44dd630b3e3e66360e3c66",
};

describe("canonicalTimestamp", () => {
  it("keeps microseconds and converts to UTC", () => {
    expect(canonicalTimestamp("2026-10-29 09:09:59.911703+00")).toBe("2026-10-29T09:09:59.911703Z");
    expect(canonicalTimestamp("2026-10-29T09:09:59.911703+00:00")).toBe(
      "2026-10-29T09:09:59.911703Z",
    );
    expect(canonicalTimestamp("2026-10-29T11:09:59.5+02:00")).toBe("2026-10-29T09:09:59.500000Z");
    expect(canonicalTimestamp("2026-10-29T09:09:59Z")).toBe("2026-10-29T09:09:59.000000Z");
  });
  it("pads trailing zeros PostgREST drops", () => {
    expect(canonicalTimestamp("2026-10-29T09:09:59.9117+00:00")).toBe(
      "2026-10-29T09:09:59.911700Z",
    );
  });
  it("crosses a day boundary with an offset", () => {
    expect(canonicalTimestamp("2026-10-30T00:30:00.123456+02:00")).toBe(
      "2026-10-29T22:30:00.123456Z",
    );
  });
  it("rejects nonsense", () => {
    expect(canonicalTimestamp("yesterday")).toBeNull();
  });
});

describe("hashPreimage", () => {
  it("formats odds and line to two decimals, and an empty line for non-handicap markets", () => {
    expect(hashPreimage({ ...REAL, line: null, odds: 3.2 })).toBe(
      `${REAL.prev_hash}${REAL.user_id}${REAL.fixture_id}1X2draw3.202026-10-29T09:09:59.911703Z`,
    );
    const hcp = hashPreimage({ ...REAL, market: "HCP", selection: "home", line: -6.5, odds: 1.9 })!;
    expect(hcp).toContain("HCPhome-6.501.90");
    expect(hashPreimage({ ...REAL, line: 0 })).toContain("draw0.003.20");
  });
});

describe("verifyPick", () => {
  it("recomputes the real database hash exactly", async () => {
    expect(await computePickHash(REAL)).toBe(REAL.hash);
    const r = await verifyPick(REAL, REAL.prev_hash, false);
    expect(r.hashMatches).toBe(true);
    expect(r.linksToPrevious).toBe(true);
  });
  it("detects any change to the pick", async () => {
    for (const changed of [
      { odds: 3.3 },
      { selection: "home" },
      { market: "BTTS" },
      { created_at: "2026-10-29 09:09:59.911704+00" },
      { user_id: "5a09f663-db87-4f31-b2c2-36cf2c2443d6" },
    ]) {
      expect(
        (await verifyPick({ ...REAL, ...changed }, REAL.prev_hash, false)).hashMatches,
        JSON.stringify(changed),
      ).toBe(false);
    }
  });
  it("checks the link to the previous pick, and the all-zero start of the chain", async () => {
    expect((await verifyPick(REAL, "f".repeat(64), false)).linksToPrevious).toBe(false);
    expect((await verifyPick(REAL, null, false)).linksToPrevious).toBeNull();
    expect(
      (await verifyPick({ ...REAL, prev_hash: "0".repeat(64) }, null, true)).linksToPrevious,
    ).toBe(true);
    expect((await verifyPick(REAL, null, true)).linksToPrevious).toBe(false);
  });
});

describe("isPickId", () => {
  it("accepts a UUID with surrounding spaces and rejects anything else", () => {
    expect(isPickId(` ${REAL.id} `)).toBe(true);
    expect(isPickId("not-an-id")).toBe(false);
    expect(isPickId("")).toBe(false);
  });
});
