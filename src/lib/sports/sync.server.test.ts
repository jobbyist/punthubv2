import { describe, expect, it } from "vitest";

import type { SportsProvider } from "./provider";
import { RESULTS_LOOKBACK_DAYS, syncResults, type FixtureStore } from "./sync.server";

describe("syncResults lookback", () => {
  it("forwards a forced retry only to the requested competition", async () => {
    const now = new Date("2026-11-28T06:00:00.000Z");
    let received: { only?: string[]; force?: boolean } | null = null;
    const provider = {
      name: "pfie",
      async listResults(_from: Date, _to: Date, options: { only?: string[]; force?: boolean }) {
        received = options;
        return { fixtures: [], calls: 0, skipped: [] };
      },
    } as unknown as SportsProvider;
    const store = {
      async openSince() {
        return [{
          provider: "pfie",
          providerRef: "premier-league-1",
          competition: "Premier League",
          home: "Arsenal",
          away: "Chelsea",
          kickoffAt: "2026-11-27T18:00:00.000Z",
        }];
      },
    } as unknown as FixtureStore;

    await syncResults(provider, store, now, { force: true, only: ["epl"] });

    expect(received).toMatchObject({ force: true, only: ["epl"] });
  });

  it("keeps unresolved past fixtures in the 30-day verification window", async () => {
    const now = new Date("2026-11-28T06:00:00.000Z");
    const captured: Date[] = [];
    const store = {
      async openSince(value: Date) {
        captured.push(value);
        return [];
      },
    } as unknown as FixtureStore;

    await syncResults({ name: "pfie" } as SportsProvider, store, now);

    expect(RESULTS_LOOKBACK_DAYS).toBe(30);
    expect(captured[0]?.toISOString()).toBe("2026-10-29T06:00:00.000Z");
  });
});
