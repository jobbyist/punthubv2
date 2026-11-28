import { describe, expect, it } from "vitest";

import {
  isConfirmedNoMatchesInWindow,
  historyRefreshDue,
  seasonArchiveUrls,
  isStandingsBaselineFresh,
  preferAuthoritativeSources,
  shouldIncludeSecondaryStandingsSources,
  seasonQueries,
} from "./tables";
import { parseStandingsMarkdown, validateTables, STANDINGS_COMPETITIONS } from "./standings";
import type { PfieSource } from "./types";

describe("PFIE deterministic standings extraction", () => {
  it("parses plain-text full tables and preserves a verified points deduction", () => {
    const text = [
      "Championship 2026/27 Overall Table",
      "Pos Team P W D L GF GA GD Pts",
      "1 Middlesbrough 18 10 5 3 34 22 12 35",
      "2 Stoke City 17 11 2 4 27 19 8 35",
      "3 Southampton 18 10 5 3 34 16 18 31",
      "4 Wolverhampton Wanderers 17 10 4 3 31 19 12 34",
    ].join("\n");
    const source: PfieSource = {
      index: 1,
      url: "https://www.sportsmole.co.uk/football/championship/table.html",
      domain: "sportsmole.co.uk",
      tier: "trusted",
      text,
      via: "extract",
    };

    const parsed = parseStandingsMarkdown(text, source.index);
    expect(parsed).toHaveLength(4);
    expect(parsed?.find((row) => row.team === "Southampton")).toMatchObject({
      played: 18,
      won: 10,
      drawn: 5,
      lost: 3,
      points: 31,
    });
    const validation = validateTables(parsed ?? [], [source], 4, [], new Date("2026-11-28T09:00:00Z"));
    expect(validation.tables).toHaveLength(1);
    expect(validation.rejected).toHaveLength(0);
  });

  it("pins Sports Mole as a configured Championship source", () => {
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://www.sportsmole.co.uk/football/championship/table.html",
    );
  });
});

describe("PFIE standings source selection", () => {
  it("enables secondary publishers only for the ten pre-launch competitions", () => {
    for (const key of [
      "psl",
      "epl",
      "championship",
      "laliga",
      "ucl",
      "uecl",
      "bundesliga",
      "seriea",
      "ligue1",
      "caf-cc",
    ] as const) {
      expect(shouldIncludeSecondaryStandingsSources(key)).toBe(true);
    }
    expect(shouldIncludeSecondaryStandingsSources("saudi-pro")).toBe(false);
    expect(shouldIncludeSecondaryStandingsSources("primeira")).toBe(false);
  });

  it("keeps independent trusted publishers available alongside official pages", () => {
    const sources = [
      { url: "https://www.efl.com/embeds/league-table/" },
      { url: "https://www.skysports.com/championship-table" },
      { url: "https://www.bbc.com/sport/football/championship/table" },
    ];
    expect(preferAuthoritativeSources(sources, ["efl.com"])).toEqual([sources[0]]);
    expect(preferAuthoritativeSources(sources, ["efl.com"], true)).toEqual(sources);
  });
});

describe("PFIE historical season windows", () => {
  it("does not treat an empty extraction as proof that a window had no matches", () => {
    expect(
      isConfirmedNoMatchesInWindow({
        parsedSources: 1,
        parseFailures: 0,
        extracted: 0,
        reasons: {},
      }),
    ).toBe(false);
  });

  it("confirms an empty window only when every extracted observation is outside its date range", () => {
    expect(
      isConfirmedNoMatchesInWindow({
        parsedSources: 2,
        parseFailures: 0,
        extracted: 4,
        reasons: { outside_date_range: 4 },
      }),
    ).toBe(true);
    expect(
      isConfirmedNoMatchesInWindow({
        parsedSources: 2,
        parseFailures: 0,
        extracted: 4,
        reasons: { outside_date_range: 3, quote_not_on_page: 1 },
      }),
    ).toBe(false);
  });

  it("reads trusted fallback pages directly when official cup pages are empty", () => {
    const ucl = seasonArchiveUrls("UEFA Champions League", "2026-10-15");
    const uecl = seasonArchiveUrls("UEFA Conference League", "2026-10-15");
    const caf = seasonArchiveUrls("CAF Confederation Cup", "2026-10-16");

    expect(ucl).toContain("https://www.bbc.com/sport/football/champions-league/scores-fixtures");
    expect(ucl).toContain("https://fbref.com/en/comps/8/schedule/Champions-League-Scores-and-Fixtures");
    expect(uecl).toContain("https://www.bbc.com/sport/football/europa-conference-league/scores-fixtures");
    expect(uecl).toContain("https://www.espn.com/soccer/scoreboard/_/league/uefa.europa.conf");
    expect(caf).toContain("https://www.vavel.com/en-us/data/caf-confederation-cup/results");
    expect(caf).toContain("https://foot-africa.com/en/leagues/international/caf-confederations-cup/");
  });

  it("discovers trusted secondary sources for UEFA and CAF historical backfills", () => {
    const ucl = seasonQueries("UEFA Champions League", "2026-10-01", "2026-10-07");
    const uecl = seasonQueries("UEFA Conference League", "2026-10-01", "2026-10-07");
    const caf = seasonQueries("CAF Confederation Cup", "2026-10-16", "2026-10-22");

    expect(ucl.some((query) => query.includes("bbc.com/sport/football/champions-league"))).toBe(
      true,
    );
    expect(
      uecl.some((query) => query.includes("bbc.com/sport/football/europa-conference-league")),
    ).toBe(true);
    expect(uecl.some((query) => query.includes("espn.com/soccer/scoreboard"))).toBe(true);
    expect(caf.some((query) => query.includes("vavel.com"))).toBe(true);
    expect(caf.some((query) => query.includes("foot-africa.com"))).toBe(true);
  });
});

describe("PFIE rolling history refresh cadence", () => {
  const now = new Date("2026-11-28T12:00:00.000Z");
  it("schedules first-time history jobs immediately", () => {
    expect(historyRefreshDue(undefined, now)).toBe(true);
  });
  it("waits 72 hours after a successful rolling refresh", () => {
    expect(historyRefreshDue({ job: "history", scope: "epl", lastAttemptAt: now.toISOString(), lastSuccessAt: new Date(now.getTime() - 48 * 3600000).toISOString(), consecutiveFailures: 0 }, now)).toBe(false);
    expect(historyRefreshDue({ job: "history", scope: "epl", lastAttemptAt: now.toISOString(), lastSuccessAt: new Date(now.getTime() - 73 * 3600000).toISOString(), consecutiveFailures: 0 }, now)).toBe(true);
  });
  it("honours failure back-off even after the refresh interval", () => {
    expect(historyRefreshDue({ job: "history", scope: "epl", lastAttemptAt: new Date(now.getTime() - 5 * 60000).toISOString(), lastSuccessAt: new Date(now.getTime() - 100 * 3600000).toISOString(), consecutiveFailures: 1 }, now)).toBe(false);
  });
});

describe("PFIE standings baseline freshness", () => {
  const now = new Date("2026-11-28T12:00:00.000Z");
  it("ignores snapshots older than 72 hours", () => {
    expect(isStandingsBaselineFresh(new Date(now.getTime() - 10 * 86400000).toISOString(), now)).toBe(false);
  });
  it("uses a recent successful snapshot as the regression baseline", () => {
    expect(isStandingsBaselineFresh(new Date(now.getTime() - 24 * 3600000).toISOString(), now)).toBe(true);
  });
  it("does not trust missing or future-dated success timestamps", () => {
    expect(isStandingsBaselineFresh(null, now)).toBe(false);
    expect(isStandingsBaselineFresh(new Date(now.getTime() + 60000).toISOString(), now)).toBe(false);
  });
});

describe("manual history refresh cooldown", () => {
  it("requires the 72-hour refresh interval unless force is explicitly enabled", () => {
    const recent = { job: "history" as const, scope: "epl", lastSuccessAt: "2026-11-28T10:00:00.000Z", lastAttemptAt: "2026-11-28T10:00:00.000Z", consecutiveFailures: 0 };
    const now = new Date("2026-11-28T12:00:00.000Z");
    expect(historyRefreshDue(recent, now)).toBe(false);
    expect(retryDue(recent, now)).toBe(true);
  });
});

describe("rolling history source coverage", () => {
  it("uses two independent archive sources for Serie A and other domestic launch leagues", () => {
    const serieA = seasonArchiveUrls("Serie A", "2026-10-17");
    expect(serieA).toContain("https://fbref.com/en/comps/11/2026-2027/schedule/2026-2027-Serie-A-Scores-and-Fixtures");
    expect(serieA.some((url) => url.startsWith("https://en.wikipedia.org/wiki/"))).toBe(true);
    expect(seasonArchiveUrls("EFL Championship", "2026-10-17")).toHaveLength(2);
  });

  it("does not add archive URLs for competitions outside the pre-launch allowlist", () => {
    expect(seasonArchiveUrls("Saudi Pro League", "2026-10-17")).toEqual([]);
    expect(seasonArchiveUrls("Liga Portugal", "2026-10-17")).toEqual([]);
  });
});
