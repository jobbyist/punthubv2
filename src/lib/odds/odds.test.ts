import { describe, expect, it, vi } from "vitest";

import type { LlmProvider, SearchProvider } from "@/lib/content/types";

import {
  DEFAULT_ODDS_SOURCE_DOMAINS,
  type OddsSource,
  type RawPrice,
  type UpcomingFixture,
  isOddsSource,
  isOddsUnverified,
  oddsSourceDomains,
  parsePrices,
  priceTokens,
  settleOdds,
  validatePrices,
} from "./reference";
import { type OddsStatus, type OddsStore, oddsDue, runOddsSync } from "./sync";

const fixtures: UpcomingFixture[] = [
  { id: "f1", home: "Orlando Pirates", away: "Kaizer Chiefs", kickoffAt: "2026-11-21T15:30:00Z" },
  { id: "f2", home: "Mamelodi Sundowns", away: "Stellenbosch", kickoffAt: "2026-11-22T13:00:00Z" },
];
const allowed = [...DEFAULT_ODDS_SOURCE_DOMAINS];
const page =
  "Soweto Derby Orlando Pirates v Kaizer Chiefs 1 2.10 X 3.20 2 3.60 | Over 2.5 1.95 Under 2.5 1.80 | " +
  "Both teams to score Yes 1.85 No 1.90 | Prices are pre-match and may change. Betting is for 18+ only.";
const src = (index: number, domain: string, text = page): OddsSource => ({
  index,
  url: `https://${domain}/soccer/psl`,
  domain,
  text,
});
const p = (over: Partial<RawPrice>): RawPrice => ({
  source: 1,
  home: "Orlando Pirates",
  away: "Kaizer Chiefs",
  market: "1X2",
  selection: "home",
  price: 2.1,
  quote: "Orlando Pirates v Kaizer Chiefs 1 2.10",
  ...over,
});
const x12 = (source = 1, h = 2.1, d = 3.2, a = 3.6): RawPrice[] => [
  p({ source, selection: "home", price: h, quote: `1 ${h.toFixed(2)}` }),
  p({ source, selection: "draw", price: d, quote: `X ${d.toFixed(2)}` }),
  p({ source, selection: "away", price: a, quote: `2 ${a.toFixed(2)}` }),
];

describe("member-odds rule", () => {
  it("marks odds more than 25% above the reference, matching the database trigger", () => {
    expect(isOddsUnverified(1.6, 1.2)).toBe(true); // 1.20 x 1.25 = 1.50
    expect(isOddsUnverified(1.5, 1.2)).toBe(false); // exactly at the threshold
    expect(isOddsUnverified(4, null)).toBe(false); // no reference: member odds stand
  });

  it("settles unverified picks at the lower price only", () => {
    expect(settleOdds(1.6, 1.2, true)).toBe(1.2);
    expect(settleOdds(1.6, 1.2, false)).toBe(1.6);
    expect(settleOdds(1.1, 1.2, true)).toBe(1.1);
    expect(settleOdds(1.6, null, true)).toBe(1.6);
  });
});

describe("sources", () => {
  it("accepts listed bookmakers and their subdomains only", () => {
    expect(isOddsSource("sport.hollywoodbets.net", allowed)).toBe(true);
    expect(isOddsSource("www.betway.co.za", allowed)).toBe(true);
    expect(isOddsSource("oddschecker.com", allowed)).toBe(false);
    expect(isOddsSource("notbetway.co.za", allowed)).toBe(false);
  });

  it("reads an override list and ignores junk", () => {
    expect(oddsSourceDomains("betway.co.za, www.gbets.co.za ,bad")).toEqual([
      "betway.co.za",
      "gbets.co.za",
    ]);
    expect(oddsSourceDomains("")).toEqual(allowed);
  });
});

describe("parse and validate", () => {
  it("parses the model answer and rejects junk", () => {
    expect(parsePrices(JSON.stringify({ prices: [p({})] }))?.[0]?.price).toBe(2.1);
    expect(parsePrices("not json")).toBeNull();
    expect(parsePrices(JSON.stringify({ prices: [p({ price: 0.5 })] }))).toBeNull();
  });

  it("writes prices the ways a page shows them", () => {
    expect(priceTokens(2.1)).toEqual(["2.10", "2.1", "2,10"]);
    expect(priceTokens(3)).toContain("3");
  });

  it("keeps a complete, plausible market from a listed bookmaker", () => {
    const { prices, rejected } = validatePrices(x12(), [src(1, "betway.co.za")], fixtures, allowed);
    expect(rejected).toEqual([]);
    expect(prices.map((r) => [r.fixtureId, r.selection, r.price])).toEqual(
      expect.arrayContaining([
        ["f1", "home", 2.1],
        ["f1", "draw", 3.2],
        ["f1", "away", 3.6],
      ]),
    );
    expect(prices[0]?.sourceDomain).toBe("betway.co.za");
  });

  it("rejects unlisted sites, unknown fixtures, invented prices and incomplete markets", () => {
    const sources = [src(1, "betway.co.za"), src(2, "oddschecker.com")];
    const r = validatePrices(
      [
        ...x12(2),
        p({ home: "Arsenal", away: "Chelsea" }),
        p({ selection: "home", price: 2.5, quote: "1 2.50" }), // not on the page
        p({ market: "OU25", selection: "over", price: 1.95, quote: "Over 2.5 1.95" }), // no under
      ],
      sources,
      fixtures,
      allowed,
    );
    expect(r.prices).toEqual([]);
    const reasons = r.rejected.map((x) => x.reason).join(" | ");
    expect(reasons).toMatch(/not a listed bookmaker/);
    expect(reasons).toMatch(/no fixture/);
    expect(reasons).toMatch(/quote not on page/);
    expect(reasons).toMatch(/incomplete or conflicting OU25/);
  });

  it("rejects an implausible margin and a page with two prices for one selection", () => {
    const margin = validatePrices(
      x12(1, 1.5, 1.5, 1.5),
      [src(1, "betway.co.za", "1 1.50 X 1.50 2 1.50")],
      fixtures,
      allowed,
    );
    expect(margin.prices).toEqual([]);
    expect(margin.rejected[0]?.reason).toMatch(/implausible 1X2 margin/);

    const twice = validatePrices(
      [...x12(), p({ selection: "home", price: 1.95, quote: "Over 2.5 1.95" })],
      [src(1, "betway.co.za")],
      fixtures,
      allowed,
    );
    expect(twice.prices).toEqual([]);
  });

  it("uses the median across bookmakers and keeps every domain for audit", () => {
    const pageB = "Orlando Pirates v Kaizer Chiefs 1 2.20 X 3.10 2 3.40";
    const pageC = "Orlando Pirates v Kaizer Chiefs 1 2.00 X 3.30 2 3.80";
    const { prices } = validatePrices(
      [...x12(1), ...x12(2, 2.2, 3.1, 3.4), ...x12(3, 2.0, 3.3, 3.8)],
      [src(1, "betway.co.za"), src(2, "gbets.co.za", pageB), src(3, "supabets.co.za", pageC)],
      fixtures,
      allowed,
    );
    const home = prices.find((r) => r.selection === "home")!;
    expect(home.price).toBe(2.1);
    expect(home.sourceDomain.split(",").sort()).toEqual([
      "betway.co.za",
      "gbets.co.za",
      "supabets.co.za",
    ]);
  });
});

describe("runOddsSync", () => {
  const now = new Date("2026-11-20T05:00:00Z");

  function deps(overrides: { statuses?: OddsStatus[]; llmText?: string } = {}) {
    const inserted: unknown[] = [];
    const records: { scope: string; ok: boolean; error: string | null }[] = [];
    const store: OddsStore = {
      upcoming: async () => fixtures.map((f) => ({ ...f, competition: "Betway Premiership" })),
      statuses: async () => overrides.statuses ?? [],
      insert: async (rows) => {
        inserted.push(...rows);
        return rows.length;
      },
      record: async (scope, ok, error) => {
        records.push({ scope, ok, error });
      },
    };
    const search: SearchProvider = {
      name: "parallel",
      search: vi.fn(async () => [
        {
          url: "https://www.betway.co.za/sport/soccer/psl",
          title: "",
          excerpt: page,
          publishedAt: null,
        },
        { url: "https://oddschecker.com/psl", title: "", excerpt: page, publishedAt: null },
      ]),
    };
    const extract = {
      name: "parallel-extract",
      extract: vi.fn(async () => ({ markdown: page, title: null })),
    };
    const llm: LlmProvider = {
      name: "gemini",
      generate: vi.fn(async (model: string) => ({
        model,
        text: overrides.llmText ?? JSON.stringify({ prices: x12() }),
      })),
    };
    return {
      deps: { search, extract, llm, store, allowedDomains: allowed, now: () => now },
      inserted,
      records,
      search,
      extract,
    };
  }

  it("stores validated prices and records success; reads only licensed pages", async () => {
    const d = deps();
    const report = await runOddsSync(d.deps);
    expect(report.competitions[0]).toMatchObject({
      competition: "Betway Premiership",
      ok: true,
      stored: 3,
    });
    expect(d.inserted).toHaveLength(3);
    expect(d.records[0]).toMatchObject({ ok: true });
    expect(d.extract.extract).toHaveBeenCalledTimes(1); // oddschecker.com is never read
  });

  it("skips a competition tried in this refresh window", async () => {
    const d = deps({
      statuses: [
        {
          scope: "Betway Premiership",
          lastAttemptAt: "2026-11-20T03:00:00Z",
          lastSuccessAt: null,
          consecutiveFailures: 0,
        },
      ],
    });
    const report = await runOddsSync(d.deps);
    expect(report.competitions).toEqual([]);
    expect(d.search.search).not.toHaveBeenCalled();
  });

  it("records a failure when nothing passes the checks", async () => {
    const d = deps({ llmText: JSON.stringify({ prices: [p({ price: 9.99, quote: "1 9.99" })] }) });
    const report = await runOddsSync(d.deps);
    expect(report.competitions[0]?.ok).toBe(false);
    expect(d.records[0]).toMatchObject({ ok: false, error: "no price passed the checks" });
  });

  it("waits longer after repeated failures", () => {
    const base = { scope: "x", lastSuccessAt: null };
    expect(oddsDue(undefined, now)).toBe(true);
    expect(
      oddsDue({ ...base, lastAttemptAt: "2026-11-20T00:30:00Z", consecutiveFailures: 0 }, now),
    ).toBe(true);
    expect(
      oddsDue({ ...base, lastAttemptAt: "2026-11-20T00:30:00Z", consecutiveFailures: 3 }, now),
    ).toBe(false);
  });
});
