import { describe, expect, it } from "vitest";

import {
  isConfirmedNoMatchesInWindow,
  historyRefreshDue,
  cleanHistoryText,
  hasHistoryResultEvidence,
  retryDue,
  seasonArchiveUrls,
  isStandingsBaselineFresh,
  preferAuthoritativeSources,
  rankSyncSourceCandidates,
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
    expect(uecl).toContain("https://www.skysports.com/europa-conference-league-scores-fixtures");
    expect(uecl).toContain("https://www.flashscore.com/football/europe/conference-league/results/");
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
    expect(serieA).toContain("https://www.skysports.com/serie-a-scores-fixtures");
    expect(serieA.some((url) => url.startsWith("https://en.wikipedia.org/wiki/"))).toBe(true);
    expect(seasonArchiveUrls("EFL Championship", "2026-10-17")).toContain("https://www.skysports.com/championship-scores-fixtures");
  });

  it("does not add archive URLs for competitions outside the pre-launch allowlist", () => {
    expect(seasonArchiveUrls("Saudi Pro League", "2026-10-17")).toEqual([]);
    expect(seasonArchiveUrls("Liga Portugal", "2026-10-17")).toEqual([]);
  });
});

describe("flattened Stat-Football Championship extraction", () => {
  it("parses all 24 teams with combined goals and escaped signed goal differences", () => {
    const text = [
      "EFL Championship table 2026/27 season updated 2026-11-28 Overall Home Away",
      "The EFL Championship table covers 24 clubs over 18 matches each.",
      "Club P W D L Goals GD Pts --- --- --- --- --- --- ---",
      "1 Middlesbrough 18 10 5 3 34 ~~:~~ 22 \\+12 35",
      "2 Stoke City 17 11 2 4 27 ~~:~~ 19 \\+8 35",
      "3 Wolverhampton Wanderers 17 10 4 3 31 ~~:~~ 19 \\+12 34",
      "4 Birmingham City 17 9 5 3 30 ~~:~~ 15 \\+15 32",
      "5 West Bromwich Albion 17 9 5 3 28 ~~:~~ 18 \\+10 32",
      "6 Southampton 18 10 5 3 34 ~~:~~ 16 \\+18 31",
      "7 Queens Park Rangers 17 7 7 3 26 ~~:~~ 19 \\+7 28",
      "8 Swansea City 17 8 3 6 25 ~~:~~ 22 \\+3 27",
      "9 Sheffield United 17 7 5 5 26 ~~:~~ 20 \\+6 26",
      "10 Portsmouth 17 7 5 5 22 ~~:~~ 19 \\+3 26",
      "11 Norwich City 17 8 1 8 35 ~~:~~ 26 \\+9 25",
      "12 Blackburn Rovers 17 7 4 6 25 ~~:~~ 25 0 25",
      "13 West Ham United 17 6 6 5 38 ~~:~~ 25 \\+13 24",
      "14 Wrexham 17 5 7 5 20 ~~:~~ 21 \\-1 22",
      "15 Charlton Athletic 17 5 5 7 18 ~~:~~ 25 \\-7 20",
      "16 Bristol City 17 5 4 8 17 ~~:~~ 27 \\-10 19",
      "17 Cardiff City 17 4 6 7 28 ~~:~~ 33 \\-5 18",
      "18 Millwall 17 5 3 9 24 ~~:~~ 30 \\-6 18",
      "19 Bolton Wanderers 17 5 3 9 22 ~~:~~ 33 \\-11 18",
      "20 Watford 17 4 3 10 13 ~~:~~ 28 \\-15 15",
      "21 Lincoln City 17 4 3 10 15 ~~:~~ 31 \\-16 15",
      "22 Preston North End 17 3 3 11 18 ~~:~~ 31 \\-13 12",
      "23 Burnley 17 1 8 8 24 ~~:~~ 35 \\-11 11",
      "24 Derby County 17 2 4 11 14 ~~:~~ 35 \\-21 10",
      "Top of the table",
    ].join(" ");
    const parsed = parseStandingsMarkdown(text, 3);
    expect(parsed).toHaveLength(24);
    expect(parsed?.[0]).toMatchObject({ team: "Middlesbrough", goalsFor: 34, goalsAgainst: 22, points: 35 });
    expect(parsed?.[23]).toMatchObject({ team: "Derby County", goalsFor: 14, goalsAgainst: 35, points: 10 });
  });
});

describe("history source retry evidence", () => {
  it("recognises scorelines and final-time markers in extracted result pages", () => {
    expect(hasHistoryResultEvidence("Middlesbrough 2–1 Stoke City FT")).toBe(true);
    expect(hasHistoryResultEvidence("Full Time: Mamelodi Sundowns 4-1 Durban City")).toBe(true);
    expect(hasHistoryResultEvidence("Final score 0-0")).toBe(true);
  });
  it("does not mistake a page with no results for a retry candidate", () => {
    expect(hasHistoryResultEvidence("Upcoming fixtures and league table only")).toBe(false);
  });
});

describe("history source candidate ordering", () => {
  it("prioritises result/archive URLs and excludes configured standings pages from history discovery", () => {
    const preferred = [
      { url: "https://fbref.com/en/comps/9/2026-2027/schedule/results" },
      { url: "https://www.skysports.com/premier-league-scores-fixtures" },
    ];
    const hits = [
      { url: "https://www.premierleague.com/en/tables/premier-league" },
      { url: "https://www.vavel.com/en/data/premier-league/results" },
    ];
    const configured = [{ url: "https://www.premierleague.com/en/tables/premier-league" }];
    const ranked = rankSyncSourceCandidates(true, preferred, hits, configured, ["premierleague.com"]);
    expect(ranked.slice(0, 2)).toEqual(preferred);
    expect(ranked).not.toContain(configured[0]);
  });

  it("retains configured official standings pages for standings syncs", () => {
    const configured = [{ url: "https://www.premierleague.com/en/tables/premier-league" }];
    const hits = [{ url: "https://www.skysports.com/premier-league-scores-fixtures" }];
    expect(rankSyncSourceCandidates(false, [], hits, configured, ["premierleague.com"])[0]).toEqual(configured[0]);
  });
});

describe("history result evidence precision", () => {
  it("accepts named scorelines and full-time result pages", () => {
    expect(hasHistoryResultEvidence("Middlesbrough 2-1 Stoke City")).toBe(true);
    expect(hasHistoryResultEvidence("Scores & Fixtures Nottingham Forest 3 8:00pm 2 Chelsea Full time")).toBe(true);
    expect(hasHistoryResultEvidence("Match Result Nottingham Forest 3 - 2 Chelsea FT")).toBe(true);
  });
  it("does not mistake standings goal difference and points for match scores", () => {
    expect(
      hasHistoryResultEvidence("Team P GD PTS 14 Wrexham 17 -1 22 15 Charlton Athletic 18 -7 21 Full Table Championship League One"),
    ).toBe(false);
    expect(hasHistoryResultEvidence("Premier League 2026/27 Table Pos Team Pl W D L GF GA GD Pts Form Next")).toBe(false);
  });
});

describe("history page truncation", () => {
  it("preserves both the start and latest end of long result pages", () => {
    const page = "EARLY_MATCH ".repeat(900) + "LATEST_MATCH 2-1 FINAL";
    const excerpt = cleanHistoryText(page, 1_000);
    expect(excerpt.length).toBeLessThanOrEqual(1_000);
    expect(excerpt).toContain("EARLY_MATCH");
    expect(excerpt).toContain("LATEST_MATCH 2-1 FINAL");
  });
  it("leaves short source pages unchanged apart from normal cleaning", () => {
    expect(cleanHistoryText("Recent result: Home 2-1 Away", 1_000)).toContain("Home 2-1 Away");
  });
});

describe("Flashscore history result evidence", () => {
  it("recognises round/date/time pages with separate home and away score cells", () => {
    expect(
      hasHistoryResultEvidence("Results Round 4 26.11. 20:00 Ajax Ajax Thun Thun 4 0 26.11. 20:00 Braga Braga KuPS KuPS 4 0"),
    ).toBe(true);
  });
  it("still rejects standings goal-difference rows without dated result rounds", () => {
    expect(hasHistoryResultEvidence("Premier League Table Wrexham 17 -1 22 Pts 35 Form")).toBe(false);
  });
});
