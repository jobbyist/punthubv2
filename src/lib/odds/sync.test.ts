import { describe, expect, it, vi } from "vitest";
import { runOddsSync, type OddsDeps, type OddsStore } from "./sync";

const now = new Date("2026-11-28T00:00:00.000Z");
const fixture = {
  id: "fixture-1",
  home: "Kaizer Chiefs",
  away: "Orlando Pirates",
  kickoffAt: "2026-11-28T03:00:00.000Z",
};
const page = [
  "Pre-match soccer odds for the upcoming Kaizer Chiefs versus Orlando Pirates fixture.",
  "Full-time match result: Home 2.10, Draw 3.20, Away 3.40.",
  "Prices are decimal odds and were captured before kick-off. This is a reference page for the listed fixture.",
].join(" ");
const answer = JSON.stringify({
  prices: [
    {
      source: 1,
      home: "Kaizer Chiefs",
      away: "Orlando Pirates",
      market: "1X2",
      selection: "home",
      price: 2.1,
      quote: "Home 2.10",
    },
    {
      source: 1,
      home: "Kaizer Chiefs",
      away: "Orlando Pirates",
      market: "1X2",
      selection: "draw",
      price: 3.2,
      quote: "Draw 3.20",
    },
    {
      source: 1,
      home: "Kaizer Chiefs",
      away: "Orlando Pirates",
      market: "1X2",
      selection: "away",
      price: 3.4,
      quote: "Away 3.40",
    },
  ],
});

function makeDeps(options: { allowedDomains?: string[]; extractedPage?: string | null } = {}) {
  const inserted: Parameters<OddsStore["insert"]>[0][number][] = [];
  const records: { scope: unknown; ok: boolean; error: unknown; meta: unknown }[] = [];
  const extract = vi.fn(async () =>
    options.extractedPage === null ? null : { markdown: options.extractedPage ?? page },
  );
  const store: OddsStore = {
    upcoming: async () => [{ ...fixture, competition: "Betway Premiership" }],
    statuses: async () => [],
    authorizedDomains: async () => options.allowedDomains ?? ["betway.co.za"],
    insert: async (rows, _capturedAt) => {
      inserted.push(...rows);
      return rows.length;
    },
    record: async (scope, ok, error, meta) => {
      records.push({ scope, ok, error, meta });
    },
  };
  const deps = {
    search: {
      search: async () => [
        {
          url: "https://www.betway.co.za/soccer/odds",
          title: "Match odds",
          snippet: "Pre-match odds",
        },
      ],
    },
    extract: { extract },
    llm: { generate: async () => ({ text: answer, model: "parallel-chat:low" }) },
    store,
    allowedDomains: options.allowedDomains ?? ["betway.co.za"],
    now: () => now,
  } as unknown as OddsDeps;
  return { deps, inserted, records, extract };
}

describe("runOddsSync", () => {
  it("stores a complete, source-attributed pre-match market from an authorised domain", async () => {
    const { deps, inserted, records } = makeDeps();
    const report = await runOddsSync(deps, { only: ["Betway Premiership"], maxCompetitions: 1 });
    expect(report.competitions).toEqual([
      { competition: "Betway Premiership", ok: true, fixtures: 1, stored: 3 },
    ]);
    expect(inserted).toHaveLength(3);
    expect(inserted.every((row) => row.sourceDomain === "betway.co.za")).toBe(true);
    expect(inserted.every((row) => row.sourceUrl === "https://www.betway.co.za/soccer/odds")).toBe(
      true,
    );
    expect(records[0]?.ok).toBe(true);
  });

  it("does not read or store prices from an unauthorised bookmaker domain", async () => {
    const { deps, inserted, extract, records } = makeDeps({ allowedDomains: [] });
    const report = await runOddsSync(deps, { only: ["Betway Premiership"], maxCompetitions: 1 });
    expect(report.competitions[0]?.ok).toBe(false);
    expect(report.competitions[0]?.error).toBe("no licensed bookmaker page found");
    expect(extract).not.toHaveBeenCalled();
    expect(inserted).toHaveLength(0);
    expect(records[0]?.ok).toBe(false);
  });

  it("rejects a stale/unavailable page read instead of falling back to search snippets", async () => {
    const { deps, inserted, records } = makeDeps({ extractedPage: null });
    const report = await runOddsSync(deps, { only: ["Betway Premiership"], maxCompetitions: 1 });
    expect(report.competitions[0]?.ok).toBe(false);
    expect(report.competitions[0]?.error).toBe("no licensed bookmaker page found");
    expect(inserted).toHaveLength(0);
    expect(records[0]?.ok).toBe(false);
  });
});
