import { describe, expect, it } from "vitest";

import type { SportsProvider } from "./provider";
import { RESULTS_LOOKBACK_DAYS, syncResults, type FixtureStore } from "./sync.server";

describe("syncResults lookback", () => {
  it("keeps unresolved past fixtures in the 30-day verification window", async () => {
    const now = new Date("2026-11-28T06:00:00.000Z");
    let since: Date | null = null;
    const store = {
      async openSince(value: Date) {
        since = value;
        return [];
      },
    } as unknown as FixtureStore;

    await syncResults({ name: "pfie" } as SportsProvider, store, now);

    expect(RESULTS_LOOKBACK_DAYS).toBe(30);
    expect(since?.toISOString()).toBe("2026-10-29T06:00:00.000Z");
  });
});
