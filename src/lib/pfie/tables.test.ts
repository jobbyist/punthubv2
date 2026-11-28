import { describe, expect, it } from "vitest";

import {
  isConfirmedNoMatchesInWindow,
  preferAuthoritativeSources,
  shouldIncludeSecondaryStandingsSources,
  seasonArchiveUrls,
  seasonQueries,
} from "./tables";

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
