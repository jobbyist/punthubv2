import { describe, expect, it } from "vitest";

import type { SportsProvider } from "./provider";
import { RESULTS_LOOKBACK_DAYS, RESULTS_TARGET_FIXTURE_LIMIT, syncResults, type FixtureStore } from "./sync.server";

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

  it("passes a batch of unresolved fixtures into one targeted PFIE result lookup", async () => {
    const now = new Date("2026-11-28T06:00:00.000Z");
    const open = Array.from({ length: 14 }, (_, i) => ({
      provider: "pfie",
      providerRef: `fixture-${i + 1}`,
      competition: "Premier League",
      home: `Home ${i + 1}`,
      away: `Away ${i + 1}`,
      kickoffAt: new Date(now.getTime() - (i + 2) * 60 * 60_000).toISOString(),
    }));
    let received: { fixtures?: { home: string; away: string; kickoffAt: string }[] } | null = null;
    const store = { async openSince() { return open; } } as unknown as FixtureStore;
    const provider = {
      name: "pfie",
      async listResults(_from: Date, _to: Date, options: { fixtures?: typeof open }) {
        received = options;
        return { fixtures: [], calls: 1, skipped: [] };
      },
    } as unknown as SportsProvider;

    await syncResults(provider, store, now, { force: true, only: ["epl"] });

    expect(RESULTS_TARGET_FIXTURE_LIMIT).toBe(12);
    expect(received?.fixtures).toHaveLength(12);
    expect(received?.fixtures?.[0]?.home).toBe("Home 1");
    expect(received?.fixtures?.[11]?.home).toBe("Home 12");
  });

  it("maps verified result aliases back to every matching stored fixture reference", async () => {
    const now = new Date("2026-11-28T06:00:00.000Z");
    const open = [
      {
        provider: "pfie",
        providerRef: "old-brann-aarhus",
        competition: "UEFA Conference League",
        home: "Brann",
        away: "Aarhus",
        kickoffAt: "2026-11-26T17:45:00.000Z",
      },
      {
        provider: "pfie",
        providerRef: "old-brann-agf",
        competition: "UEFA Conference League",
        home: "Brann",
        away: "AGF",
        kickoffAt: "2026-11-26T17:45:00.000Z",
      },
    ];
    const saved: Record<string, unknown>[] = [];
    const store = {
      async openSince() { return open; },
      async upsert(rows: Record<string, unknown>[]) { saved.push(...rows); },
    } as unknown as FixtureStore;
    const provider = {
      name: "pfie",
      async listResults() {
        return {
          calls: 1,
          skipped: [],
          fixtures: [{
            provider: "pfie",
            providerRef: "new-brann-agf",
            competition: "UEFA Conference League",
            home: "Brann",
            away: "AGF",
            kickoffAt: "2026-11-26T17:45:00.000Z",
            status: "finished",
            homeScore: 2,
            awayScore: 1,
          }],
        };
      },
    } as unknown as SportsProvider;

    const report = await syncResults(provider, store, now, { force: true, only: ["uecl"] });

    expect(report.upserted).toBe(2);
    expect(saved.map((row) => row.providerRef).sort()).toEqual(["old-brann-agf", "old-brann-aarhus"]);
    expect(saved.every((row) => row.home === "Brann" && row.kickoffAt === open[0]?.kickoffAt)).toBe(true);
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
