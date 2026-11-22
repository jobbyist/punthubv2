import { describe, expect, it } from "vitest";

import { needsBackfill, verifyHistory } from "./history";
import { tierOf } from "./provider";
import { normaliseTeam, resolveTeam } from "./teams";
import {
  STANDINGS_COMPETITIONS,
  STANDINGS_LAUNCH_KEYS,
  chooseTable,
  independentSourceKey,
  parseStandings,
  standingsRequest,
  standingsDisagreementHint,
  tableRegression,
  validateTables,
  type RawStandingRow,
} from "./standings";
import { DEFAULT_PFIE_MODELS } from "@/lib/content/config";
import {
  retryDue,
  runTablesSync,
  seasonQueries,
  seasonWindows,
  standingsDue,
  type SyncStatusRow,
} from "./tables";
import type { Observation, PfieSource } from "./types";

const teams = ["Alpha FC", "Bravo United", "Charlie City", "Delta Rovers"];
const page = (
  domain: string,
  tier: PfieSource["tier"],
  index: number,
  rows: string[],
): PfieSource => ({
  index,
  url: `https://${domain}/table`,
  domain,
  tier,
  text: rows.join("\n"),
  via: "extract",
});
// position, team, P W D L GF GA Pts
const data: [number, string, number, number, number, number, number, number, number][] = [
  [1, "Alpha FC", 10, 7, 2, 1, 20, 8, 23],
  [2, "Bravo United", 10, 6, 2, 2, 15, 9, 20],
  [3, "Charlie City", 10, 3, 3, 4, 11, 13, 12],
  [4, "Delta Rovers", 10, 0, 3, 7, 5, 21, 3],
];
const lines = data.map((d) => `${d[0]} ${d[1]} ${d.slice(2).join(" ")}`);
const raw = (source: number, tweak?: (r: RawStandingRow) => RawStandingRow): RawStandingRow[] =>
  data.map((d, i) => {
    const r: RawStandingRow = {
      source,
      position: d[0],
      team: d[1],
      played: d[2],
      won: d[3],
      drawn: d[4],
      lost: d[5],
      goalsFor: d[6],
      goalsAgainst: d[7],
      points: d[8],
      quote: lines[i]!,
    };
    return tweak ? tweak(r) : r;
  });

describe("PFIE standings extraction model order", () => {
  it("uses the strongest free Flash models before Flash-Lite fallbacks", () => {
    expect(DEFAULT_PFIE_MODELS.slice(0, 3)).toEqual([
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ]);
    expect(DEFAULT_PFIE_MODELS.slice(3)).toEqual([
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]);
  });
});
describe("trusted standings publisher domains", () => {
  it("recognises the two South African table publishers as trusted", () => {
    expect(tierOf("stats.ladumaanalytics.co.za", ["psl.co.za"])).toBe("trusted");
    expect(tierOf("45min.co.za", ["psl.co.za"])).toBe("trusted");
    expect(tierOf("vi.nl", [])).toBe("trusted");
    expect(tierOf("skysports.com", [])).toBe("trusted");
    expect(tierOf("espn.com", [])).toBe("trusted");
    expect(tierOf("transfermarkt.com", [])).toBe("trusted");
    expect(tierOf("cbssports.com", [])).toBe("trusted");
    expect(tierOf("rotascore.com", [])).toBe("trusted");
    expect(tierOf("statz.ai", [])).toBe("trusted");
    expect(tierOf("sportmetrics.org", [])).toBe("trusted");
    expect(tierOf("tribuna.com", [])).toBe("trusted");
    expect(tierOf("ninetyminutesplus.com", [])).toBe("trusted");
    expect(tierOf("tntsports.co.uk", [])).toBe("trusted");
  });
});
describe("launch standings coverage", () => {
  it("keeps the eight competitions with existing validated tables and temporarily hides empty ones", () => {
    expect(STANDINGS_LAUNCH_KEYS).toEqual([
      "psl",
      "epl",
      "laliga",
      "seriea",
      "bundesliga",
      "primeira",
      "championship",
      "saudi-pro",
    ]);
    expect(STANDINGS_LAUNCH_KEYS).not.toContain("eredivisie");
    expect(STANDINGS_LAUNCH_KEYS).not.toContain("ligue1");
    expect(STANDINGS_LAUNCH_KEYS).not.toContain("sa-championship");
    expect(STANDINGS_LAUNCH_KEYS).not.toContain("ucl");
  });
});
describe("configured direct standings sources", () => {
  it("includes the official Bundesliga table and independent DFB data centre", () => {
    expect(STANDINGS_COMPETITIONS.bundesliga?.pages).toContain(
      "https://www.bundesliga.com/en/bundesliga/table?view=full",
    );
    expect(STANDINGS_COMPETITIONS.bundesliga?.pages).toContain(
      "https://datencenter.dfb.de/en/competitions/12/seasons/current/current_matchweek?datacenter_name=data-center",
    );
  });
  it("includes independent full-table sources for leagues that previously had no baseline", () => {
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.sportsmole.co.uk/football/ligue-1/table.html",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.tntsports.co.uk/football/ligue-1/standings.shtml",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.cbssports.com/soccer/ligue-1/standings/",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.ninetyminutesplus.com/league/ligue-1/standings",
    );
    expect(STANDINGS_COMPETITIONS.eredivisie?.pages).toContain(
      "https://www.vi.nl/competities/eredivisie/stand",
    );
    expect(STANDINGS_COMPETITIONS.eredivisie?.pages).toContain(
      "https://statz.ai/competitions/eredivisie",
    );
    expect(STANDINGS_COMPETITIONS.eredivisie?.pages).toContain(
      "https://sportmetrics.org/league/netherlands-eredivisie-75672/2026-27/",
    );
    expect(STANDINGS_COMPETITIONS.eredivisie?.pages).toContain(
      "https://www.flashscore.com/football/netherlands/eredivisie/standings/",
    );
    expect(STANDINGS_COMPETITIONS.primeira?.pages).toContain(
      "https://www.ligaportugal.pt/competition/618/liga-portugal-betclic/round/20262027?tab=standings",
    );
    expect(STANDINGS_COMPETITIONS["sa-championship"]?.pages).toContain(
      "https://treble.co.za/motsepe-championship/log/",
    );
    expect(STANDINGS_COMPETITIONS.ucl?.pages).toContain(
      "https://www.uefa.com/uefachampionsleague/standings/",
    );
  });
  it("keeps La Liga direct tables within the five-source cap using independent publishers", () => {
    const pages = STANDINGS_COMPETITIONS.laliga?.pages ?? [];
    expect(pages).toHaveLength(5);
    expect(pages.length).toBeLessThanOrEqual(5);
    expect(pages).toEqual(
      expect.arrayContaining([
        "https://www.laliga.com/en-US/laliga-easports/standing",
        "https://www.skysports.com/football/competitions/la-liga/table",
        "https://www.tactix.football/standings?country=spain&league=140&season=2026",
        "https://footballedgelab.com/la-liga",
        "https://www.transfermarkt.com/laliga/tabelle/wettbewerb/ES1",
      ]),
    );
    expect(STANDINGS_COMPETITIONS.laliga?.queries).toHaveLength(5);
    const publisherKeys = ["laliga.com", "skysports.com", "tactix.football", "footballedgelab.com", "transfermarkt.com"].map(
      independentSourceKey,
    );
    expect(new Set(publisherKeys).size).toBe(4);
  });
});
describe("La Liga live source configuration", () => {
  it("includes the official La Liga table and independent publisher candidates", () => {
    expect(STANDINGS_COMPETITIONS.laliga?.pages).toContain(
      "https://www.laliga.com/en-US/laliga-easports/standing",
    );
    expect(STANDINGS_COMPETITIONS.laliga?.pages).toContain(
      "https://www.skysports.com/football/competitions/la-liga/table",
    );
    expect(STANDINGS_COMPETITIONS.laliga?.pages).toContain(
      "https://www.tactix.football/standings?country=spain&league=140&season=2026",
    );
    expect(STANDINGS_COMPETITIONS.laliga?.pages).toContain("https://footballedgelab.com/la-liga");
    expect(STANDINGS_COMPETITIONS.laliga?.pages).toContain(
      "https://www.transfermarkt.com/laliga/tabelle/wettbewerb/ES1",
    );
    expect(tierOf("skysports.com", ["laliga.com"])).toBe("trusted");
    expect(tierOf("tactix.football", ["laliga.com"])).toBe("trusted");
    expect(tierOf("footballedgelab.com", ["laliga.com"])).toBe("trusted");
    expect(tierOf("transfermarkt.com", ["laliga.com"])).toBe("trusted");
  });
});

describe("validateTables", () => {
  const official = page("league.com", "official", 1, lines);
  it("accepts a complete, consistent table", () => {
    const { tables, rejected } = validateTables(raw(1), [official], 4, teams);
    expect(rejected).toEqual([]);
    expect(tables[0]!.rows.map((r) => r.team)).toEqual(teams);
  });
  it("rejects bad arithmetic, wrong team counts and unsupported row statistics", () => {
    expect(
      validateTables(
        raw(1, (r) => (r.team === "Alpha FC" ? { ...r, points: 24 } : r)),
        [official],
        4,
      ).rejected[0]!.reason,
    ).toBe("points_Alpha FC");
    expect(validateTables(raw(1).slice(0, 3), [official], 4).rejected[0]!.reason).toMatch(
      /team_count/,
    );
    expect(
      validateTables(
        raw(1, (r) => ({ ...r, quote: "invented row", goalsFor: r.goalsFor + 1 })),
        [official],
        4,
      ).rejected[0]!.reason,
    ).toMatch(/row_evidence_not_on_page/);
  });
  it("matches accentless source rows when the model includes a three-letter team code", () => {
    const sourceLines = [...lines];
    sourceLines[0] = "1 Atletico de Madrid 10 7 2 1 20 8 23";
    const source = page("league.com", "official", 1, sourceLines);
    const rows = raw(1, (r) =>
      r.team === "Alpha FC"
        ? { ...r, team: "ATM Atlético de Madrid", quote: "unmatched model quote" }
        : r,
    );
    const result = validateTables(rows, [source], 4);
    expect(result.rejected).toEqual([]);
    expect(result.tables[0]!.rows[0]!.team).toBe("ATM Atlético de Madrid");
  });
  it("accepts points-first source columns used by LaLiga", () => {
    const source = page("laliga.com", "official", 1, [
      "1 ATM Atlético de Madrid 28 12 9 1 2 23 10 +13",
      ...lines.slice(1),
    ]);
    const rows = raw(1, (r) =>
      r.team === "Alpha FC"
        ? {
            ...r,
            team: "ATM Atlético de Madrid",
            played: 12,
            won: 9,
            drawn: 1,
            lost: 2,
            goalsFor: 23,
            goalsAgainst: 10,
            points: 28,
            quote: "model quote",
          }
        : r,
    );
    const result = validateTables(rows, [source], 4);
    expect(result.rejected).toEqual([]);
    expect(result.tables).toHaveLength(1);
  });
  it("rejects incorrect statistics even when the copied quote itself is present", () => {
    const wrong = raw(1, (r) => (r.team === "Alpha FC" ? { ...r, goalsFor: r.goalsFor + 1 } : r));
    const result = validateTables(wrong, [official], 4, teams);
    expect(result.rejected[0]!.reason).toBe("row_evidence_not_on_page_Alpha FC");
  });
  it("rejects explicitly dated tables older than 72 hours", () => {
    const dateQuote = "Updated: 2026-11-17";
    const dated = page("league.com", "official", 1, [...lines, dateQuote]);
    const rows = raw(1, (r) => ({ ...r, tableDate: "2026-11-17", tableDateQuote: dateQuote }));
    const result = validateTables(rows, [dated], 4, teams, new Date("2026-11-22T12:00:00Z"));
    expect(result.rejected[0]!.reason).toBe("table_date_older_than_72h");
  });
  it("accepts a row when normalized quote formatting differs but the full numeric row is present", () => {
    const rows = raw(1, (r) => ({ ...r, quote: `Source row for ${r.team}` }));
    expect(validateTables(rows, [official], 4).tables).toHaveLength(1);
  });
  it("ignores an unverified model-extracted table date instead of rejecting an otherwise valid page", () => {
    const rows = raw(1, (r) => ({
      ...r,
      tableDate: "2026-11-17",
      tableDateQuote: "Updated 17 November 2026",
    }));
    const result = validateTables(rows, [official], 4, teams, new Date("2026-11-22T12:00:00Z"));
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]!.tableDate).toBeNull();
  });
  it("treats the current SAST calendar date as today when UTC has not rolled over", () => {
    const dated = page("league.com", "official", 1, [...lines, "Updated: 22 November 2026"]);
    const rows = raw(1, (r) => ({ ...r, tableDate: "2026-11-22" }));
    const result = validateTables(rows, [dated], 4, teams, new Date("2026-11-21T23:30:00Z"));
    expect(result.rejected).toEqual([]);
    expect(result.tables).toHaveLength(1);
  });
  it("rejects a table date more than one day ahead in SAST", () => {
    const dated = page("league.com", "official", 1, [...lines, "Updated: 24 November 2026"]);
    const rows = raw(1, (r) => ({ ...r, tableDate: "2026-11-24" }));
    const result = validateTables(rows, [dated], 4, teams, new Date("2026-11-21T23:30:00Z"));
    expect(result.rejected[0]!.reason).toBe("table_date_in_future");
  });
  it("uses known team aliases when validating source row evidence", () => {
    const sourceLines = lines.map((line) => line.replace("Alpha FC", "Atletico Madrid"));
    const source = page("laliga.com", "official", 1, sourceLines);
    const rows = raw(1, (r) =>
      r.team === "Alpha FC"
        ? { ...r, team: "ATM Atlético de Madrid", quote: "unmatched quote" }
        : r,
    );
    const result = validateTables(rows, [source], 4, ["Atletico Madrid"]);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]!.rows[0]!.team).toBe("Atletico Madrid");
  });
  it("collapses exact duplicate rows from responsive page layouts but rejects conflicting duplicates", () => {
    const duplicateRows = [...raw(1), { ...raw(1)[0]!, team: "ALP Alpha FC" }];
    const duplicatePage = page("league.com", "official", 1, [...lines, lines[0]!]);
    expect(validateTables(duplicateRows, [duplicatePage], 4).tables).toHaveLength(1);
    const conflicting = [
      ...raw(1),
      {
        ...raw(1)[0]!,
        played: 9,
        won: 8,
        drawn: 0,
        lost: 1,
        goalsFor: 21,
        goalsAgainst: 8,
        points: 24,
        quote: "conflicting Alpha row",
      },
    ];
    expect(validateTables(conflicting, [duplicatePage], 4).rejected[0]!.reason).toBe(
      "duplicate_team_Alpha FC_10/7/2/1/20/8/23_vs_9/8/0/1/21/8/24",
    );
  });
  it("prefers the cumulative overall row over a home or away subset", () => {
    const overall = raw(1)[0]!;
    const subset = {
      ...overall,
      team: "ALP Alpha FC",
      position: 3,
      played: 5,
      won: 3,
      drawn: 1,
      lost: 1,
      goalsFor: 8,
      goalsAgainst: 4,
      points: 10,
      quote: "ALP Alpha FC 5 3 1 1 8 4 10",
    };
    const duplicatePage = page("league.com", "official", 1, [...lines, subset.quote]);
    const result = validateTables([...raw(1), subset], [duplicatePage], 4);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]!.rows.find((r) => r.team === "Alpha FC")).toMatchObject({
      played: 10,
      won: 7,
      points: 23,
    });
  });
  it("canonicalizes a known team alias before collapsing a repeated overall subset row", () => {
    const overall = raw(1)[0]!;
    const aliasSubset = {
      ...overall,
      team: "Alpha",
      position: 3,
      played: 5,
      won: 3,
      drawn: 1,
      lost: 1,
      goalsFor: 8,
      goalsAgainst: 4,
      points: 10,
      quote: "Alpha 5 3 1 1 8 4 10",
    };
    const aliasPage = page("league.com", "official", 1, [...lines, aliasSubset.quote]);
    const result = validateTables([...raw(1), aliasSubset], [aliasPage], 4, teams);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]!.rows.find((r) => r.team === "Alpha FC")).toMatchObject({
      played: 10,
      points: 23,
    });
  });
  it("accepts official competition ranking ties when explicitly enabled", () => {
    const tied = raw(1, (r) => (r.team === "Charlie City" ? { ...r, position: 2 } : r));
    expect(validateTables(tied, [official], 4).rejected[0]!.reason).toBe("positions_not_1_to_n");
    expect(validateTables(tied, [official], 4, teams, new Date(), true).tables).toHaveLength(1);
  });
  it("rejects duplicate positions", () => {
    expect(
      validateTables(
        raw(1, (r) => (r.position === 2 ? { ...r, position: 1 } : r)),
        [official],
        4,
      ).rejected[0]!.reason,
    ).toBe("positions_not_1_to_n");
  });
});

describe("ambiguous Paris team shorthand", () => {
  it("does not silently map Paris to PSG when Paris FC is also a known club", () => {
    expect(resolveTeam("Paris", ["Paris Saint-Germain", "Paris FC"])).toBeNull();
    expect(resolveTeam("Paris FC", ["Paris Saint-Germain", "Paris FC"])).toBe("Paris FC");
  });
});
describe("La Liga cross-publisher team aliases", () => {
  it("normalizes official LaLiga names to independent publisher names", () => {
    expect(normaliseTeam("Atlético de Madrid")).toBe(normaliseTeam("Atletico Madrid"));
    expect(normaliseTeam("Deportivo Alavés")).toBe(normaliseTeam("Alaves"));
    expect(normaliseTeam("Athletic")).toBe(normaliseTeam("Athletic Bilbao"));
    expect(normaliseTeam("Espanyol Barcelona")).toBe(normaliseTeam("Espanyol"));
    expect(normaliseTeam("RCD Espanyol de Barcelona")).toBe(normaliseTeam("Espanyol"));
    expect(normaliseTeam("Espanyol de Barcelona")).toBe(normaliseTeam("Espanyol"));
    expect(normaliseTeam("RC Deportivo")).toBe(normaliseTeam("Deportivo La Coruna"));
    expect(normaliseTeam("R. Racing Club")).toBe(normaliseTeam("Racing Santander"));
    expect(normaliseTeam("Celta")).toBe(normaliseTeam("Celta Vigo"));
    expect(normaliseTeam("CA Osasuna")).toBe(normaliseTeam("Osasuna"));
    expect(normaliseTeam("Levante UD")).toBe(normaliseTeam("Levante"));
    expect(normaliseTeam("RAC R. Racing Club")).toBe(normaliseTeam("Racing Santander"));
    expect(normaliseTeam("Dépor")).toBe(normaliseTeam("Deportivo La Coruna"));
    expect(normaliseTeam("ATM Atlético de Madrid")).toBe(normaliseTeam("Atletico Madrid"));
    expect(normaliseTeam("FC Barcelona")).toBe(normaliseTeam("Barcelona"));
  });
});
describe("standingsDisagreementHint", () => {
  it("names only teams and columns that need a source-local recheck", () => {
    const a = validateTables(raw(1), [page("a.com", "official", 1, lines)], 4).tables[0]!;
    const b = validateTables(raw(2), [page("b.com", "trusted", 2, lines)], 4).tables[0]!;
    const changed = {
      ...b,
      rows: b.rows.map((r) => (r.team === "Alpha FC" ? { ...r, goalsFor: r.goalsFor + 1 } : r)),
    };
    const hint = standingsDisagreementHint([a, changed]);
    expect(hint).toContain("Alpha FC");
    expect(hint).toContain("goals for");
    expect(hint).not.toContain("21");
  });
});
describe("chooseTable", () => {
  const a = page("site-a.com", "official", 1, lines);
  const b = page("site-b.com", "trusted", 2, lines);
  it("needs the official site or two agreeing sites", () => {
    const one = validateTables(raw(1), [a], 4).tables;
    expect(chooseTable(one)).toBeNull();
    const two = validateTables([...raw(1), ...raw(2)], [a, b], 4).tables;
    expect(chooseTable(two)).toMatchObject({ verdict: "two_sources" });
  });
  it("does not accept two sites that disagree on any full-table statistic", () => {
    const b2 = page(
      "site-b.com",
      "trusted",
      2,
      lines.map((l) => l.replace("10 7 2 1 20 8 23", "10 6 3 1 20 8 21")),
    );
    const rows = [
      ...raw(1),
      ...raw(2, (r) =>
        r.team === "Alpha FC"
          ? { ...r, won: 6, drawn: 3, points: 21, quote: b2.text.split("\n")[0]! }
          : r,
      ),
    ];
    expect(chooseTable(validateTables(rows, [a, b2], 4).tables)).toBeNull();
  });

  it("requires an official source to be independently corroborated", () => {
    expect(chooseTable(validateTables(raw(1), [a], 4).tables)).toBeNull();
  });

  it("does not count mirrored BBC domains as independent publishers", () => {
    expect(independentSourceKey("bbc.com")).toBe(independentSourceKey("bbc.co.uk"));
    expect(independentSourceKey("datencenter.dfb.de")).toBe(independentSourceKey("dfb.de"));
    expect(independentSourceKey("products.bundesliga.com")).toBe(
      independentSourceKey("bundesliga.com"),
    );
    expect(independentSourceKey("sports.espn.com")).toBe(independentSourceKey("espn.com"));
    expect(independentSourceKey("news.skysports.com")).toBe(independentSourceKey("skysports.com"));
    expect(independentSourceKey("www.premierleague.com")).toBe(
      independentSourceKey("premierleague.com"),
    );
    expect(independentSourceKey("www.tactix.football")).toBe(
      independentSourceKey("tactix.football"),
    );
    expect(independentSourceKey("stats.footballedgelab.com")).toBe(
      independentSourceKey("footballedgelab.com"),
    );
    const bbcCom = page("bbc.com", "trusted", 1, lines);
    const bbcUk = page("bbc.co.uk", "trusted", 2, lines);
    const tables = validateTables([...raw(1), ...raw(2)], [bbcCom, bbcUk], 4).tables;
    expect(chooseTable(tables)).toBeNull();
  });
  it("rejects Wikipedia as a live standings source", () => {
    const wiki = page("en.wikipedia.org", "trusted", 1, lines);
    expect(validateTables(raw(1), [wiki], 4).rejected[0]!.reason).toBe(
      "wikipedia_not_allowed_for_live_standings",
    );
  });
});

describe("tableRegression", () => {
  it("rejects a table that moves played matches or statistics backwards", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!
      .rows;
    const stale = previous.map((r) =>
      r.team === "Alpha FC" ? { ...r, played: 9, won: 6, points: 20 } : r,
    );
    expect(tableRegression(stale, previous)).toBe("played_regressed_Alpha FC");
  });
  it("accepts a snapshot that includes additional completed matches without reducing existing totals", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!
      .rows;
    const newer = previous.map((r) =>
      r.team === "Alpha FC" ? { ...r, played: 11, won: 8, points: 26 } : r,
    );
    expect(tableRegression(newer, previous)).toBeNull();
  });
});
describe("standingsRequest", () => {
  it("pins extraction to one source and includes targeted retry guidance", () => {
    const request = standingsRequest({
      competition: "Premier League",
      season: "2026/27",
      sources: [page("premierleague.com", "official", 2, lines)],
      retryHint: "wdl_Aston Villa",
    });
    expect(request.system).toContain("every row must use that exact source n value");
    expect(request.prompt).toContain("wdl_Aston Villa");
    expect(request.prompt).toContain("Copy exact values from this page only");
    expect(request.system).toContain("extract only the Total/Overall league table");
    expect(request.system).toContain("Ignore projected, predicted, simulated, modelled");
    expect(request.system).toContain("return each club exactly once");
  });
});
describe("team aliases", () => {
  it("normalizes Atlético de Madrid to the same identity as Atletico Madrid", () => {
    expect(normaliseTeam("Atlético de Madrid")).toBe(normaliseTeam("Atletico Madrid"));
  });
});
describe("parseStandings", () => {
  it("rejects invalid JSON", () => expect(parseStandings("nope")).toBeNull());
});

const obs = (domain: string, tier: Observation["tier"], hs: number, as: number): Observation => ({
  source: 1,
  home: "Alpha FC",
  away: "Bravo United",
  date: "2026-11-01",
  time: null,
  tz: null,
  status: "finished",
  homeScore: hs,
  awayScore: as,
  quote: "Alpha FC 2-1 Bravo United",
  domain,
  tier,
  kickoffUtc: null,
});

describe("verifyHistory", () => {
  it("keeps a score confirmed by two sites or the official site", () => {
    expect(
      verifyHistory([obs("a.com", "other", 2, 1), obs("b.com", "other", 2, 1)], "epl").rows,
    ).toHaveLength(1);
    expect(verifyHistory([obs("league.com", "official", 2, 1)], "epl").rows).toHaveLength(1);
  });
  it("drops single-source and conflicting scores", () => {
    expect(verifyHistory([obs("a.com", "trusted", 2, 1)], "epl").rows).toHaveLength(0);
    expect(
      verifyHistory([obs("a.com", "other", 2, 1), obs("b.com", "other", 1, 1)], "epl").unverified,
    ).toBe(1);
  });
  it("needs a backfill when a quarter of teams have fewer than five results", () => {
    expect(needsBackfill(new Map([["alpha fc", 5]]), ["Alpha FC", "Bravo United"])).toBe(true);
    expect(
      needsBackfill(
        new Map([
          ["alpha fc", 5],
          ["bravo united", 6],
        ]),
        ["Alpha FC", "Bravo United"],
      ),
    ).toBe(false);
  });
});

describe("scheduling", () => {
  const now = new Date("2026-11-15T02:10:00Z");
  const s = (over: Partial<SyncStatusRow>): SyncStatusRow => ({
    job: "standings",
    scope: "epl",
    lastAttemptAt: null,
    lastSuccessAt: null,
    consecutiveFailures: 0,
    ...over,
  });
  it("runs a first sync and backs off after failures", () => {
    expect(standingsDue(undefined, undefined, now)).toBe(true);
    expect(
      retryDue(s({ lastAttemptAt: "2026-11-15T02:00:00Z", consecutiveFailures: 1 }), now),
    ).toBe(false);
    expect(
      retryDue(s({ lastAttemptAt: "2026-11-15T01:40:00Z", consecutiveFailures: 1 }), now),
    ).toBe(true);
    expect(
      retryDue(s({ lastAttemptAt: "2026-11-15T00:00:00Z", consecutiveFailures: 3 }), now),
    ).toBe(false);
  });
  it("refreshes priority tables every 12 hours and other tables every 24 hours", () => {
    const fresh = s({
      lastSuccessAt: "2026-11-14T20:10:00Z",
      lastAttemptAt: "2026-11-14T20:10:00Z",
    });
    expect(standingsDue(fresh, undefined, now, 12)).toBe(false);
    expect(standingsDue(fresh, undefined, now, 24)).toBe(false);
    const due12h = s({
      lastSuccessAt: "2026-11-14T14:10:00Z",
      lastAttemptAt: "2026-11-14T14:10:00Z",
    });
    expect(standingsDue(due12h, undefined, now, 12)).toBe(true);
    expect(standingsDue(due12h, undefined, now, 24)).toBe(false);
    expect(standingsDue(fresh, Date.parse("2026-11-15T01:00:00Z"), now, 12)).toBe(true);
  });
});

describe("seasonWindows", () => {
  it("covers last season and this season up to the form window, newest first, skipping the close season", () => {
    const w = seasonWindows(new Date("2026-11-15T02:00:00Z"));
    expect(w[0]!.end <= "2026-10-04").toBe(true);
    expect(w.at(-1)!.start).toBe("2025-08-01");
    expect(w.every((x) => x.start <= x.end)).toBe(true);
    expect(w.every((x) => Date.parse(x.end) - Date.parse(x.start) <= 6 * 86_400_000)).toBe(true);
    expect(w.some((x) => x.start.startsWith("2026-07") && x.end.slice(5, 7) === "07")).toBe(false);
    expect(new Set(w.map((x) => x.start)).size).toBe(w.length);
  });
});

describe("seasonQueries", () => {
  it("uses exact dates, the month names and a weekend round-up phrasing", () => {
    const q = seasonQueries("Premier League", "2026-09-25", "2026-10-01");
    expect(q[0]).toBe("Premier League results 25 September 2026 to 1 October 2026");
    expect(q[1]).toContain("weekend round-up");
    expect(q[1]).toContain("September 2026 October 2026");
    expect(q.every((x) => x.startsWith("Premier League"))).toBe(true);
  });

  it("adds a club query only when clubs are known, capped at four", () => {
    expect(seasonQueries("Premier League", "2026-09-25", "2026-10-01")).toHaveLength(3);
    const q = seasonQueries("Betway Premiership", "2026-09-25", "2026-10-01", [
      "Kaizer Chiefs",
      "Orlando Pirates",
      "Mamelodi Sundowns",
      "Stellenbosch",
      "Cape Town City",
    ]);
    expect(q).toHaveLength(4);
    expect(q[3]).toBe(
      "Kaizer Chiefs Orlando Pirates Mamelodi Sundowns Stellenbosch results September 2026 October 2026",
    );
  });
});

describe("season backfill sync", () => {
  const long = Array.from(
    { length: 8 },
    (_, i) =>
      `Motsepe Foundation Championship historical results and final score table. Match ${i + 1}: Team A 2-1 Team B.`,
  ).join("\n");
  const answer = (matches: unknown[]) => JSON.stringify({ matches });
  const make = (replies: string[]) => {
    const recorded: { ok: boolean; error: string | null }[] = [];
    let calls = 0;
    const deps = {
      search: {
        name: "fake",
        search: async () => [
          { url: "https://www.psl.co.za/a", title: "a", excerpt: long, publishedAt: null },
        ],
      },
      extract: {
        name: "fake",
        extract: async () => ({ markdown: long }),
      },
      llm: {
        name: "fake",
        generate: async () => ({
          text: replies[Math.min(calls++, replies.length - 1)]!,
          model: "m",
        }),
      },
      models: DEFAULT_PFIE_MODELS.slice(0, 1),
      now: () => new Date("2026-11-15T02:00:00Z"),
      store: {
        statuses: async (): Promise<SyncStatusRow[]> => [],
        latestFinished: async () => new Map(),
        knownTeams: async () => [],
        completedCounts: async () => new Map(),
        replaceStandings: async () => 0,
        insertHistory: async (rows: unknown[]) => rows.length,
        record: async (
          _j: string,
          _s: string,
          ok: boolean,
          error: string | null,
          _meta: Record<string, unknown>,
        ) => {
          recorded.push({ ok, error });
        },
      },
    };
    return { deps, recorded, calls: () => calls };
  };

  it("retries once with fewer sources when the answer is not valid JSON", async () => {
    const { deps, recorded, calls } = make(["{ truncated", answer([])]);
    const out = await runTablesSync(deps as never, {
      job: "season",
      only: ["sa-championship"],
      maxJobs: 1,
    });
    expect(calls()).toBe(2);
    expect(out.ran[0]!.detail).toContain("no verified results");
    expect(recorded.at(-1)!.error).toBe("no verified results on the sources");
  });

  it("reports invalid JSON when the retry fails too", async () => {
    const { deps, recorded, calls } = make(["{ bad", "{ still bad"]);
    await runTablesSync(deps as never, { job: "season", only: ["sa-championship"], maxJobs: 1 });
    expect(calls()).toBe(2);
    expect(recorded.at(-1)!.error).toBe("extraction answer was not valid JSON");
  });

  it("skips leagues the archive import covers", async () => {
    const { deps } = make([answer([])]);
    const out = await runTablesSync(deps as never, { job: "season", only: ["psl"], maxJobs: 1 });
    expect(out.seasonDue).toBe(0);
  });

  it("leaves a window alone after six failures in a row", async () => {
    const { deps } = make([answer([])]);
    const windows = seasonWindows(deps.now());
    const failed = windows.map((w) => ({
      job: "season" as const,
      scope: `sa-championship:${w.start}`,
      lastAttemptAt: "2026-11-01T00:00:00Z",
      lastSuccessAt: null,
      consecutiveFailures: 6,
    }));
    deps.store.statuses = async () => failed;
    const out = await runTablesSync(deps as never, {
      job: "season",
      only: ["sa-championship"],
      maxJobs: 3,
    });
    expect(out.seasonDue).toBe(0);
  });
});
