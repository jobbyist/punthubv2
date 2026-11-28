import { describe, expect, it } from "vitest";

import { needsBackfill, verifyHistory } from "./history";
import { validateObservations } from "./extract";
import { tierOf } from "./provider";
import { normaliseTeam, resolveTeam } from "./teams";
import {
  STANDINGS_COMPETITIONS,
  STANDINGS_LAUNCH_KEYS,
  STANDINGS_POST_LAUNCH_KEYS,
  chooseTable,
  chooseTables,
  independentSourceKey,
  parseStandings,
  standingsRequest,
  standingsDisagreementHint,
  tableRegression,
  validateTables,
  type RawStandingRow,
  type StandingRow,
} from "./standings";
import { DEFAULT_PFIE_MODELS } from "@/lib/content/config";
import {
  retryDue,
  runTablesSync,
  seasonQueries,
  seasonWindows,
  standingsDue,
  buildCafGroupStandings,
  preferAuthoritativeSources,
  type CafGroupStageResult,
  type SyncStatusRow,
} from "./tables";
import type { Observation, PfieSource, RawObservation } from "./types";

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

describe("PFIE standings extraction model", () => {
  it("uses Parallel Responses low effort as its only structured extraction model", () => {
    expect(DEFAULT_PFIE_MODELS).toEqual(["parallel-low"]);
  });
});
describe("trusted standings publisher domains", () => {
  it("recognises the two South African table publishers as trusted", () => {
    expect(tierOf("stats.ladumaanalytics.co.za", ["psl.co.za"])).toBe("trusted");
    expect(tierOf("45min.co.za", ["psl.co.za"])).toBe("trusted");
    expect(tierOf("vi.nl", [])).toBe("trusted");
    expect(tierOf("skysports.com", [])).toBe("trusted");
    expect(tierOf("tntsports.co.uk", [])).toBe("trusted");
    expect(tierOf("foxsports.com", [])).toBe("trusted");
    expect(tierOf("espn.com", [])).toBe("trusted");
    expect(tierOf("transfermarkt.com", [])).toBe("trusted");
    expect(tierOf("cbssports.com", [])).toBe("trusted");
    expect(tierOf("rotascore.com", [])).toBe("trusted");
    expect(tierOf("statz.ai", [])).toBe("trusted");
    expect(tierOf("sportmetrics.org", [])).toBe("trusted");
    expect(tierOf("tribuna.com", [])).toBe("trusted");
    expect(tierOf("ninetyminutesplus.com", [])).toBe("trusted");
    expect(tierOf("theanalyst.com", [])).toBe("trusted");
    expect(tierOf("smartsoccerstats.eu", [])).toBe("trusted");
    expect(tierOf("scoremondo.com", [])).toBe("trusted");
    expect(tierOf("zeanball.online", [])).toBe("trusted");
    expect(tierOf("statsfera.com.tr", [])).toBe("trusted");
    expect(tierOf("ligue1schedule.com", [])).toBe("trusted");
    expect(tierOf("sportnewsafrica.com", [])).toBe("trusted");
    expect(tierOf("swissfootballdata.com", [])).toBe("trusted");
    expect(tierOf("keepstandings.com", [])).toBe("trusted");
    expect(tierOf("365scores.com", [])).toBe("trusted");
    expect(tierOf("tntsports.co.uk", [])).toBe("trusted");
  });
});
describe("launch standings coverage", () => {
  it("keeps the restoration competitions in the agreed launch order", () => {
    expect(STANDINGS_LAUNCH_KEYS).toEqual([
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
    ]);
    expect(STANDINGS_LAUNCH_KEYS).toHaveLength(10);
    expect(STANDINGS_POST_LAUNCH_KEYS).toContain("sa-championship");
    expect(STANDINGS_POST_LAUNCH_KEYS).toContain("caf-cl");
  });
});
describe("configured direct standings sources", () => {
  it("includes BBC as an independent EFL Championship table source", () => {
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://www.cbssports.com/soccer/efl-championship/standings/",
    );
    expect(STANDINGS_COMPETITIONS.championship?.queries).toContain(
      "site:cbssports.com/soccer/efl-championship/standings EFL Championship 2026/27 full table",
    );
    expect(tierOf("cbssports.com", [])).toBe("trusted");
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://www.sportsmole.co.uk/football/championship/table.html",
    );
    expect(tierOf("sportsmole.co.uk", [])).toBe("trusted");
  });
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
      "https://www.ninetyminutesplus.com/league/ligue-1/standings",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://footballedgelab.com/ligue-1/tables/2026-27",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://smartsoccerstats.eu/leagues/france-ligue-1-2026-27",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.ligue1schedule.com/table/2026-27",
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
      "https://globalsportsarchive.com/en/soccer/competition/motsepe-foundation-championship-2026-2027/80295",
    );
    expect(STANDINGS_COMPETITIONS.ucl?.pages).toContain(
      "https://www.uefa.com/uefachampionsleague/standings/",
    );
    expect(STANDINGS_COMPETITIONS.ucl?.pages?.indexOf(
      "https://www.cbssports.com/soccer/champions-league/standings/",
    )).toBe(1);
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
    expect(new Set(publisherKeys).size).toBe(5);
  });
});
  it("configures official and independent Conference League standings sources", () => {
    expect(STANDINGS_COMPETITIONS.uecl?.teams).toBe(36);
    expect(STANDINGS_COMPETITIONS.uecl?.pages).toContain(
      "https://www.uefa.com/uefaconferenceleague/standings/",
    );
    expect(STANDINGS_COMPETITIONS.uecl?.pages).toContain(
      "https://standings.nz/conference-league/",
    );
    expect(STANDINGS_COMPETITIONS.uecl?.pages).toContain(
      "https://www.keepstandings.com/conference-league/table",
    );
    expect(tierOf("standings.nz", ["uefa.com"])).toBe("trusted");
    expect(tierOf("globalsportsarchive.com", ["psl.co.za"])).toBe("trusted");
    expect(STANDINGS_COMPETITIONS.uecl?.pages).not.toContain(
      "https://www.tntsports.co.uk/football/uefa-europa-conference-league/standings.shtml",
    );
  });
describe("EFL Championship source configuration", () => {
  it("includes independent ESPN and Transfermarkt table candidates", () => {
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://www.espn.com/soccer/standings/_/league/eng.2",
    );
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://www.transfermarkt.com/championship/tabelle/wettbewerb/GB2",
    );
    expect(tierOf("espn.com", ["efl.com"])).toBe("trusted");
    expect(tierOf("transfermarkt.com", ["efl.com"])).toBe("trusted");
  });
});

describe("Serie A live source configuration", () => {
  it("includes independent current-table sources for cross-checking", () => {
    expect(STANDINGS_COMPETITIONS.seriea?.pages).toContain(
      "https://www.transfermarkt.com/serie-a/tabelle/wettbewerb/IT1",
    );
    expect(STANDINGS_COMPETITIONS.seriea?.pages).toContain(
      "https://www.flashscore.com/football/italy/serie-a/standings/",
    );
    expect(tierOf("transfermarkt.com", ["legaseriea.it"])).toBe("trusted");
    expect(tierOf("flashscore.com", ["legaseriea.it"])).toBe("trusted");
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

describe("restored standings source coverage", () => {
  it("adds current independent sources for the previously failing launch competitions", () => {
    expect(STANDINGS_COMPETITIONS.psl?.pages).toContain(
      "https://nasiscore.co.za/south-africa/psl/table",
    );
    expect(STANDINGS_COMPETITIONS.psl?.pages).toContain(
      "https://scoremondo.com/en/competition/south-africa-premier-league-2983/standings",
    );
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://zeanball.online/en/table/championship/",
    );
    expect(STANDINGS_COMPETITIONS.championship?.pages).toContain(
      "https://statsfera.com.tr/en/standings/ingiltere-championship",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://www.ninetyminutesplus.com/league/ligue-1/standings",
    );
    expect(STANDINGS_COMPETITIONS.ligue1?.pages).toContain(
      "https://theanalyst.com/competition/ligue-1/table",
    );
    expect(STANDINGS_COMPETITIONS.seriea?.allowVerifiedPlayedCorrections).toEqual(["Milan"]);
    expect(STANDINGS_COMPETITIONS.psl?.pages?.length).toBeLessThanOrEqual(6);
    expect(STANDINGS_COMPETITIONS.championship?.pages?.length).toBeLessThanOrEqual(6);
    expect(STANDINGS_COMPETITIONS.ligue1?.pages?.length).toBeLessThanOrEqual(6);
  });

  it("allows only the pending CAF Group C qualifier slot to expand from three to four teams", () => {
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.groupTeamRanges).toEqual({
      C: { min: 3, max: 4 },
    });
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.allowTeamCountIncrease).toBe(true);
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.groups).toEqual(["A", "B", "C", "D"]);
  });
});

describe("validateTables", () => {
  const official = page("league.com", "official", 1, lines);
  it("accepts a complete, consistent table", () => {
    const { tables, rejected } = validateTables(raw(1), [official], 4, teams);
    expect(rejected).toEqual([]);
    expect(tables[0]!.rows.map((r) => r.team)).toEqual(teams);
  });
  it("accepts source-published points below the WDL total when a deduction is applied", () => {
    const deductionQuote = "1 Alpha FC 10 7 2 1 20 8 20";
    const sourceLines = lines.map((line) => line.startsWith("1 Alpha FC") ? deductionQuote : line);
    const source = page("league.com", "official", 1, sourceLines);
    const rows = raw(1, (row) =>
      row.team === "Alpha FC" ? { ...row, points: 20, quote: deductionQuote } : row,
    );
    const result = validateTables(rows, [source], 4, teams);
    expect(result.rejected).toEqual([]);
    expect(result.tables[0]!.rows[0]!.points).toBe(20);
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
  it("rejects placeholder clubs instead of inventing a missing group entrant", () => {
    const placeholder = raw(1, (row) =>
      row.team === "Delta Rovers"
        ? { ...row, team: "TBC", quote: "4 TBC 10 0 0 0 0 0 0" }
        : row,
    );
    const source = page("league.com", "official", 1, [
      ...lines.slice(0, 3),
      "4 TBC 10 0 0 0 0 0 0",
    ]);
    const result = validateTables(placeholder, [source], 4);
    expect(result.rejected.some((item) => item.reason === "placeholder_team_not_allowed")).toBe(true);
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

describe("pre-launch standings selection", () => {
  it("prioritises the ten agreed competitions and defers Motsepe", () => {
    expect(STANDINGS_LAUNCH_KEYS).toEqual([
      "psl", "epl", "championship", "laliga", "ucl", "uecl", "bundesliga", "seriea", "ligue1", "caf-cc",
    ]);
    expect(STANDINGS_LAUNCH_KEYS).not.toContain("sa-championship");
    expect(STANDINGS_POST_LAUNCH_KEYS).toContain("sa-championship");
    expect(STANDINGS_COMPETITIONS.championship?.teams).toBe(24);
  });
});

describe("CAF Confederation Cup group standings", () => {
  const groups = ["A", "B", "C", "D"] as const;
  const groupedRaw = (source: number) =>
    groups.flatMap((group) =>
      teams.map((team, i) => ({
        source,
        group,
        position: i + 1,
        team: `${group} ${team}`,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        quote: `${i + 1} ${group} ${team} 0 0 0 0 0 0 0`,
      })),
    );
  const groupedPage = (domain: string, index: number) =>
    page(
      domain,
      "trusted",
      index,
      groups.flatMap((group) => [
        `Group ${group}`,
        ...teams.map((team, i) => `${i + 1} ${group} ${team} 0 0 0 0 0 0 0`),
      ]),
    );

  it("configures four independent four-team group tables for launch", () => {
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.teams).toBe(16);
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.groups).toEqual(groups);
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.teamsPerGroup).toBe(4);
    expect(STANDINGS_COMPETITIONS["caf-cc"]?.pages).toEqual(
      expect.arrayContaining([
        "https://www.365scores.com/football/league/caf-confederation-cup-627/standings",
        "https://globalsportsarchive.com/en/soccer/competition/totalenergies-caf-confederation-cup-2026-2027/81259",
      ]),
    );
  });

  it("validates and corroborates each group independently", () => {
    const first = validateTables(groupedRaw(1), [groupedPage("365scores.com", 1)], 16, [], new Date(), false, groups, 4);
    const second = validateTables(groupedRaw(2), [groupedPage("globalsportsarchive.com", 2)], 16, [], new Date(), false, groups, 4);
    expect(first.rejected).toEqual([]);
    expect(first.tables).toHaveLength(4);
    expect(first.tables.map((table) => table.group)).toEqual(groups);
    expect(first.tables.every((table) => table.rows.length === 4)).toBe(true);
    const chosen = chooseTables([...first.tables, ...second.tables], groups);
    expect(chosen).toHaveLength(4);
    expect(chosen?.map((selection) => selection.table.group)).toEqual(groups);
  });

  it("rejects a source that omits any one of the four groups", () => {
    const incomplete = groupedRaw(1).filter((row) => row.group !== "D");
    const result = validateTables(incomplete, [groupedPage("365scores.com", 1)], 16, [], new Date(), false, groups, 4);
    expect(result.tables).toEqual([]);
    expect(result.rejected).toContainEqual({ source: 1, reason: "missing_groups_D" });
  });

  it("requires every group to have two independent publishers", () => {
    const first = validateTables(groupedRaw(1), [groupedPage("365scores.com", 1)], 16, [], new Date(), false, groups, 4);
    const incompleteSecond = validateTables(groupedRaw(2).filter((row) => row.group !== "C"), [groupedPage("globalsportsarchive.com", 2)], 16, [], new Date(), false, groups, 4);
    expect(chooseTables([...first.tables, ...incompleteSecond.tables], groups)).toBeNull();
  });
});

describe("EFL Championship team aliases", () => {
  it("reconciles common EFL table abbreviations", () => {
    expect(normaliseTeam("QPR")).toBe(normaliseTeam("Queens Park Rangers"));
    expect(normaliseTeam("Sheffield Utd")).toBe(normaliseTeam("Sheffield United"));
    expect(normaliseTeam("Sheffield Wed")).toBe(normaliseTeam("Sheffield Wednesday"));
    expect(normaliseTeam("Birmingham")).toBe(normaliseTeam("Birmingham City"));
    expect(normaliseTeam("West Brom")).toBe(normaliseTeam("West Bromwich Albion"));
    expect(normaliseTeam("Blackburn")).toBe(normaliseTeam("Blackburn Rovers"));
    expect(normaliseTeam("Swansea")).toBe(normaliseTeam("Swansea City"));
    expect(normaliseTeam("Bolton")).toBe(normaliseTeam("Bolton Wanderers"));
  });
});

describe("ambiguous Paris team shorthand", () => {
  it("does not silently map Paris to PSG when Paris FC is also a known club", () => {
    expect(resolveTeam("Paris", ["Paris Saint-Germain", "Paris FC"])).toBeNull();
    expect(resolveTeam("Paris FC", ["Paris Saint-Germain", "Paris FC"])).toBe("Paris FC");
  });
});
describe("UEFA Conference League participant aliases", () => {
  it("reconciles known duplicate fixture labels without broad ambiguous matching", () => {
    expect(normaliseTeam("Hearts")).toBe(normaliseTeam("Heart of Midlothian"));
    expect(normaliseTeam("AGF")).toBe(normaliseTeam("Aarhus"));
    expect(normaliseTeam("AGF Aarhus")).toBe(normaliseTeam("Aarhus"));
    expect(normaliseTeam("ST St.Truiden")).toBe(normaliseTeam("Sint-Truidense"));
    expect(normaliseTeam("L. Red Imps")).toBe(normaliseTeam("Lincoln Red Imps"));
    expect(normaliseTeam("Univ. Craiova")).toBe(normaliseTeam("Universitatea Craiova"));
    expect(normaliseTeam("Inter Club d Escaldes")).toBe(normaliseTeam("Inter Escaldes"));
    expect(normaliseTeam("FC Iberia 1999 Tiflis")).toBe(normaliseTeam("Iberia Tbilisi"));
    expect(normaliseTeam("FK Kairat")).toBe(normaliseTeam("Kairat Almaty"));
    expect(normaliseTeam("Borac Banja Luka")).toBe(normaliseTeam("Borac"));
    expect(normaliseTeam("Roter Stern Belgrad")).toBe(normaliseTeam("Crvena Zvezda"));
    expect(normaliseTeam("FC Kopenhagen")).toBe(normaliseTeam("Copenhagen"));
    expect(normaliseTeam("ZSKA Sofia")).toBe(normaliseTeam("CSKA Sofia"));
    expect(normaliseTeam("Paphos FC")).toBe(normaliseTeam("Pafos"));
    expect(normaliseTeam("FC Iberia 1999")).toBe(normaliseTeam("Iberia Tbilisi"));
  });
});
describe("UEFA Champions League cross-publisher team aliases", () => {
  it("reconciles CBS and FOX Sports abbreviations for the same UCL participants", () => {
    expect(normaliseTeam("LASK")).toBe(normaliseTeam("Linz"));
    expect(normaliseTeam("LASK Linz")).toBe(normaliseTeam("Linz"));
    expect(normaliseTeam("Manchester United")).toBe(normaliseTeam("Manchester Utd"));
    expect(normaliseTeam("PSV")).toBe(normaliseTeam("PSV Eindhoven"));
    expect(normaliseTeam("Slavia Praha")).toBe(normaliseTeam("Slavia Prague"));
    expect(normaliseTeam("Slovan Bratislava")).toBe(normaliseTeam("Slovan Bratisl."));
  });
});
describe("Bundesliga cross-publisher team aliases", () => {
  it("reconciles Bayer 04 Leverkusen and Bayer Leverkusen", () => {
    expect(normaliseTeam("Bayer 04 Leverkusen")).toBe(normaliseTeam("Bayer Leverkusen"));
    expect(normaliseTeam("Leverkusen")).toBe(normaliseTeam("Bayer Leverkusen"));
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

describe("CAF Confederation Cup group validation", () => {
  const groups = ["A", "B", "C", "D"];
  const groupMembers: Record<string, string[]> = {
    A: ["Alpha A", "Bravo A", "Charlie A", "Delta A"],
    B: ["Alpha B", "Bravo B", "Charlie B", "Delta B"],
    C: ["Alpha C", "Bravo C", "Charlie C"],
    D: ["Alpha D", "Bravo D", "Charlie D", "Delta D"],
  };
  const rows: RawStandingRow[] = [];
  const sourceLines: string[] = [];
  for (const group of groups) {
    groupMembers[group]!.forEach((team, index) => {
      const quote = `${index + 1} ${team} 0 0 0 0 0 0 0`;
      sourceLines.push(quote);
      rows.push({
        source: 1,
        group,
        position: index + 1,
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        quote,
      });
    });
  }
  const source = page("cafonline.com", "official", 1, sourceLines);
  const known = Object.values(groupMembers).flat();

  it("accepts all four groups while Group C has three confirmed teams", () => {
    const result = validateTables(rows, [source], 16, known, new Date("2026-11-27T12:00:00Z"), false, groups, 4, {
      C: { min: 3, max: 4 },
    });
    expect(result.rejected).toEqual([]);
    expect(result.tables.map((table) => table.group).sort()).toEqual(groups);
    expect(result.tables.find((table) => table.group === "C")?.rows).toHaveLength(3);
  });

  it("rejects Group C if it falls below three confirmed teams", () => {
    const incomplete = rows.filter((row) => !(row.group === "C" && row.position === 3));
    const result = validateTables(incomplete, [source], 16, known, new Date("2026-11-27T12:00:00Z"), false, groups, 4, {
      C: { min: 3, max: 4 },
    });
    expect(result.rejected.some((item) => item.reason.includes("team_count_2_expected_3-4"))).toBe(true);
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
  it("allows goals-only corrections when two independent tables corroborate them", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!
      .rows;
    const corrected = previous.map((r) =>
      r.team === "Alpha FC" ? { ...r, goalsFor: r.goalsFor + 2 } : r,
    );
    expect(tableRegression(corrected, previous)).toBe("goalsFor_changed_without_new_matches_Alpha FC");
    expect(tableRegression(corrected, previous, true)).toBeNull();
  });
  it("allows two-source-corroborated goal and record corrections when no matches were added", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!.rows;
    const corrected = previous.map((row) =>
      row.team === "Alpha FC"
        ? { ...row, won: 8, drawn: 1, lost: 1, goalsFor: row.goalsFor + 2, points: 25 }
        : row,
    );
    expect(tableRegression(corrected, previous, true, [], false, true)).toBeNull();
  });
  it("still rejects points and win/draw/loss changes without additional matches", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!
      .rows;
    const changedPoints = previous.map((r) =>
      r.team === "Alpha FC" ? { ...r, points: r.points + 3 } : r,
    );
    expect(tableRegression(changedPoints, previous, true)).toBe("points_changed_without_new_matches_Alpha FC");
  });
  it("allows a verified points-deduction correction without changing match records", () => {
    const previous = validateTables(raw(1), [page("old.com", "trusted", 1, lines)], 4).tables[0]!.rows;
    const deductionQuote = "1 Alpha FC 10 7 2 1 20 8 20";
    const sourceLines = lines.map((line) => line.startsWith("1 Alpha FC") ? deductionQuote : line);
    const rows = raw(1, (row) =>
      row.team === "Alpha FC" ? { ...row, points: 20, quote: deductionQuote } : row,
    );
    const candidate = validateTables(rows, [page("new.com", "trusted", 1, sourceLines)], 4).tables[0]!.rows;
    expect(tableRegression(candidate, previous, false, [], false, true)).toBeNull();
  });

  it("allows one verified new team when a pending group qualifier is confirmed", () => {
    const previous: StandingRow[] = [
      { group: "C", position: 1, team: "Alpha C", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      { group: "C", position: 2, team: "Bravo C", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
      { group: "C", position: 3, team: "Charlie C", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    ];
    const candidate = [...previous, {
      group: "C", position: 4, team: "Delta C", played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0,
    }];
    expect(tableRegression(candidate, previous)).toBe("team_count_changed_from_previous_snapshot");
    expect(tableRegression(candidate, previous, false, [], true)).toBeNull();
  });

  it("allows a corroborated one-match correction for the configured Serie A team only", () => {
    const previous: StandingRow[] = [
      { position: 1, team: "Milan", played: 13, won: 8, drawn: 4, lost: 1, goalsFor: 32, goalsAgainst: 18, points: 28 },
    ];
    const corrected: StandingRow[] = [
      { position: 1, team: "Milan", played: 12, won: 8, drawn: 3, lost: 1, goalsFor: 28, goalsAgainst: 14, points: 27 },
    ];
    expect(tableRegression(corrected, previous)).toBe("played_regressed_Milan");
    expect(tableRegression(corrected, previous, false, ["Milan"])).toBeNull();
    expect(tableRegression(corrected, previous, false, ["Inter"])).toBe("played_regressed_Milan");
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
  it("includes group-specific notes so a pending qualifier is not invented or omitted", () => {
    const request = standingsRequest({
      competition: "CAF Confederation Cup",
      season: "2026/27",
      sources: [page("365scores.com", "trusted", 1, lines)],
      groups: ["A", "B", "C", "D"],
      groupNotes: "Group C currently has three confirmed teams; the fourth place is pending.",
    });
    expect(request.system).toContain("Group C currently has three confirmed teams");
  });
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

  it("keeps three seasons for the launch cup competitions without expanding unrelated leagues", () => {
    const now = new Date("2026-11-15T02:00:00Z");
    for (const key of ["ucl", "uecl", "caf-cc"] as const) {
      expect(seasonWindows(now, key).at(-1)!.start).toBe("2024-08-01");
    }
    expect(seasonWindows(now, "epl").at(-1)!.start).toBe("2025-08-01");
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

describe("history sync", () => {
  it("uses the requested history window start when selecting official archive sources", async () => {
    const pageText = `CAF Confederation Cup results 20 October 2026. Al Ahly 1-0 Raja Casablanca. ${"Match report and final score. ".repeat(20)}`;
    const answer = JSON.stringify({
      matches: [{
        source: 1,
        home: "Al Ahly",
        away: "Raja Casablanca",
        date: "2026-10-20",
        time: null,
        tz: null,
        status: "finished",
        homeScore: 1,
        awayScore: 0,
        quote: "Al Ahly 1-0 Raja Casablanca",
      }],
    });
    const inserted: unknown[] = [];
    const records: { ok: boolean; error: string | null }[] = [];
    const deps = {
      search: {
        name: "fake",
        search: async () => [{
          url: "https://www.cafonline.com/caf-confederation-cup/news/results",
          title: "Official CAF results",
          excerpt: pageText,
          publishedAt: null,
        }],
      },
      extract: { name: "fake", extract: async () => ({ markdown: pageText }) },
      llm: { name: "fake", generate: async () => ({ text: answer, model: "m" }) },
      models: DEFAULT_PFIE_MODELS.slice(0, 1),
      now: () => new Date("2026-11-28T03:00:00Z"),
      store: {
        statuses: async (): Promise<SyncStatusRow[]> => [],
        latestFinished: async () => new Map(),
        knownTeams: async () => ["Al Ahly", "Raja Casablanca"],
        completedCounts: async () => new Map(),
        replaceStandings: async () => 0,
        insertHistory: async (rows: unknown[]) => { inserted.push(...rows); return rows.length; },
        record: async (
          _job: string,
          _scope: string,
          ok: boolean,
          error: string | null,
          _meta: Record<string, unknown>,
        ) => { records.push({ ok, error }); },
      },
    };
    const report = await runTablesSync(deps as never, { job: "history", only: ["caf-cc"], maxJobs: 1 });
    expect(report.ran[0]?.ok).toBe(true);
    expect(records.at(-1)).toEqual({ ok: true, error: null });
    expect(inserted).toHaveLength(1);
  });
});

describe("PFIE match evidence validation", () => {
  const source: PfieSource = {
    index: 1, url: "https://www.uefa.com/results", domain: "uefa.com", tier: "official",
    text: "Tuesday 13 October 2026\\nArsenal 3-0 Lille\\nWednesday 14 October 2026\\nRoma 3-4 Real Madrid",
    via: "extract",
  };
  const window = { from: new Date("2026-10-13T00:00:00Z"), to: new Date("2026-10-14T23:59:59Z"), now: new Date("2026-11-28T00:00:00Z") };
  const observation = (overrides: Partial<RawObservation> = {}): RawObservation => ({
    source: 1, home: "Arsenal", away: "Lille", date: "2026-10-13", time: null, tz: null,
    status: "finished", homeScore: 3, awayScore: 0, quote: "Arsenal 3-0 defeated Lille", ...overrides,
  });
  it("accepts adjacent team and exact score evidence when a page splits table cells", () => {
    const result = validateObservations([observation()], [source], window);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toEqual([]);
  });
  it("rejects a score that does not appear with the named teams on the page", () => {
    const result = validateObservations([observation({ homeScore: 2, quote: "Arsenal 2-0 Lille" })], [source], window);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0]?.reason).toBe("quote_not_on_page");
  });
  it("resolves a known short team name before checking source evidence", () => {
    const psgSource: PfieSource = { ...source, text: "Tuesday 13 October 2026\\nParis Saint-Germain 2-0 Lille" };
    const result = validateObservations([
      observation({ home: "PSG", homeScore: 2, awayScore: 0, quote: "PSG beat Lille" }),
    ], [psgSource], { ...window, knownTeams: ["Paris Saint-Germain", "Lille"] });
    expect(result.accepted).toHaveLength(1);
  });
  it("accepts a non-verbatim quote only when exact teams and score are independently visible", () => {
    const result = validateObservations([
      observation({ quote: "Arsenal defeated Lille", homeScore: 3, awayScore: 0 }),
    ], [source], window);
    expect(result.accepted).toHaveLength(1);
  });
  it("continues to accept an exact verbatim source quote", () => {
    const result = validateObservations([observation({ quote: "Arsenal 3-0 Lille" })], [source], window);
    expect(result.accepted).toHaveLength(1);
  });
});
describe("official history source preference", () => {
  it("uses the official competition archive alone when it is available", () => {
    const hits = [
      { url: "https://www.uefa.com/results", title: "Official results" },
      { url: "https://www.theguardian.com/football/results", title: "News results" },
    ];
    expect(preferAuthoritativeSources(hits, ["uefa.com"])).toEqual([hits[0]]);
  });
  it("includes secondary sources for a controlled corroboration retry", () => {
    const hits = [
      { url: "https://www.uefa.com/results", title: "Official results" },
      { url: "https://www.theguardian.com/football/results", title: "News results" },
    ];
    expect(preferAuthoritativeSources(hits, ["uefa.com"], true)).toEqual(hits);
  });
  it("retains trusted sources when no official result page is found", () => {
    const hits = [
      { url: "https://www.theguardian.com/football/results", title: "News results" },
      { url: "https://www.cbssports.com/soccer/results", title: "Scores" },
    ];
    expect(preferAuthoritativeSources(hits, ["uefa.com"])).toEqual(hits);
  });
});

describe("official cup history search targets", () => {
  it("targets the current and prior UEFA season result archives", () => {
    expect(seasonQueries("UEFA Champions League", "2026-10-09", "2026-10-15")).toContain("https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-league-phase-fixtures-and-results/");
    expect(seasonQueries("UEFA Conference League", "2025-10-02", "2025-10-08")).toContain("https://www.uefa.com/uefaconferenceleague/news/029c-1e9ad66c8169-aaecb38941a7-1000--2025-26-conference-league-all-the-league-phase-results/");
  });
  it("targets official CAF match-result archives across both seasons", () => {
    const queries = seasonQueries("CAF Confederation Cup", "2026-10-16", "2026-10-22");
    expect(queries).toContain("https://www.cafonline.com/caf-confederation-cup/news/surprise-results-shake-up-totalenergies-caf-confederation-cup-group-stage-race/");
    expect(queries).toContain("https://www.cafonline.com/caf-confederation-cup/news/full-results-of-first-leg-of-first-preliminary-stage-of-202526-totalenergies-caf-confederation-cup/");
  });
});

describe("CAF 2026/27 derived group standings", () => {
  it("calculates a provisional 15-team table from verified group-stage results and keeps Group C at three confirmed clubs", () => {
    const results: CafGroupStageResult[] = [{
      home: "Azam", away: "Ahli Tripoli", kickoffAt: "2026-11-27T13:00:00Z", homeScore: 1, awayScore: 2,
    }];
    const rows = buildCafGroupStandings(results);
    expect(rows).toHaveLength(15);
    expect(["A", "B", "C", "D"].map((group) => rows.filter((row) => row.group === group).length)).toEqual([4, 4, 3, 4]);
    expect(rows.find((row) => row.team === "Al Ahly Tripoli")).toMatchObject({ group: "B", played: 1, won: 1, points: 3, goalsFor: 2, goalsAgainst: 1 });
    expect(rows.find((row) => row.team === "Azam FC")).toMatchObject({ group: "B", played: 1, lost: 1, points: 0, goalsFor: 1, goalsAgainst: 2 });
    expect(rows.filter((row) => row.group === "C").every((row) => row.played === 0)).toBe(true);
  });

  it("does not count preliminary-round matches or cross-group fixtures", () => {
    const rows = buildCafGroupStandings([{
      home: "CR Belouizdad", away: "AC Douane", kickoffAt: "2026-11-27T19:00:00Z", homeScore: 1, awayScore: 0,
    }]);
    expect(rows.every((row) => row.played === 0)).toBe(true);
  });
});

describe("Ligue 1 team aliases", () => {
  it("normalises Stade Rennais to Rennes across table publishers", () => {
    expect(normaliseTeam("Stade Rennais")).toBe("rennes");
  });
});

describe("cup history source attribution", () => {
  it("extracts sources separately and accepts only two-domain score agreement when official extraction is empty", async () => {
    const replies = [
      JSON.stringify({ matches: [] }), // official-only attempt
      JSON.stringify({ matches: [] }), // official page in corroboration retry
      JSON.stringify({ matches: [{
        source: 1, home: "Alpha FC", away: "Bravo United", date: "2026-10-20",
        time: null, tz: null, status: "finished", homeScore: 2, awayScore: 1,
        quote: "Alpha FC 2-1 Bravo United",
      }] }),
      JSON.stringify({ matches: [{
        source: 1, home: "Alpha FC", away: "Bravo United", date: "2026-10-20",
        time: null, tz: null, status: "finished", homeScore: 2, awayScore: 1,
        quote: "Alpha FC 2-1 Bravo United",
      }] }),
    ];
    let calls = 0;
    const inserted: unknown[] = [];
    const records: { ok: boolean; meta: Record<string, unknown> }[] = [];
    const long = "UEFA Champions League results. Tuesday 20 October 2026. Alpha FC 2-1 Bravo United. ";
    const deps = {
      search: {
        name: "fake",
        search: async () => [
          { url: "https://www.uefa.com/uefachampionsleague/news/results", title: "Official", excerpt: long, publishedAt: null },
          { url: "https://www.theguardian.com/football/results", title: "Guardian", excerpt: long, publishedAt: null },
          { url: "https://www.cbssports.com/soccer/results", title: "CBS", excerpt: long, publishedAt: null },
        ],
      },
      extract: {
        name: "fake",
        extract: async (url: string) => ({ markdown: long + url }),
      },
      llm: {
        name: "fake",
        generate: async () => ({ text: replies[Math.min(calls++, replies.length - 1)]!, model: "parallel-low" }),
      },
      models: ["parallel-low"],
      now: () => new Date("2026-11-28T02:00:00Z"),
      store: {
        statuses: async (): Promise<SyncStatusRow[]> => [],
        latestFinished: async () => new Map(),
        knownTeams: async () => ["Alpha FC", "Bravo United"],
        completedCounts: async () => new Map(),
        replaceStandings: async () => 0,
        insertHistory: async (rows: unknown[]) => { inserted.push(...rows); return rows.length; },
        record: async (
          _job: string, _scope: string, ok: boolean, _error: string | null, meta: Record<string, unknown>,
        ) => { records.push({ ok, meta }); },
      },
    };
    const report = await runTablesSync(deps as never, { job: "season", only: ["ucl"], maxJobs: 1 });
    expect(calls).toBe(4);
    expect(report.ran[0]?.ok).toBe(true);
    expect(inserted).toHaveLength(1);
    expect(records.at(-1)?.ok).toBe(true);
    expect(records.at(-1)?.meta.sources).toEqual(["uefa.com", "theguardian.com", "cbssports.com"]);
  });
});

describe("official standings fallback", () => {
  it("retries an invalid official table using independent full-table sources", async () => {
    const teamNames = [
      "Club 01", "Club 02", "Club 03", "Club 04", "Club 05",
      "Club 06", "Club 07", "Club 08", "Club 09", "Club 10",
      "Club 11", "Club 12", "Club 13", "Club 14", "Club 15",
      "Club 16", "Club 17", "Club 18", "Club 19", "Club 20",
    ];
    const makeRows = (source: number, count: number) => teamNames.slice(0, count).map((team, index) => {
      const won = 20 - index;
      const lost = 20 - won;
      const goalsFor = won * 3;
      const goalsAgainst = lost * 2;
      const position = index + 1;
      const quote = `${position} ${team} 20 ${won} 0 ${lost} ${goalsFor} ${goalsAgainst} ${won * 3}`;
      return {
        source,
        position,
        team,
        played: 20,
        won,
        drawn: 0,
        lost,
        goalsFor,
        goalsAgainst,
        points: won * 3,
        quote,
      };
    });
    const validRows = makeRows(1, 20);
    const pageText = validRows.map((row) => row.quote).join("\n") + "\nUpdated 28 November 2026";
    const records: { ok: boolean; meta: Record<string, unknown> }[] = [];
    const deps = {
      search: { name: "fake", search: async () => [] },
      extract: { name: "fake", extract: async () => ({ markdown: pageText }) },
      llm: {
        name: "fake",
        generate: async (request: { prompt?: string }) => {
          const source = Number(request.prompt?.match(/<source n="(\d+)"/)?.[1] ?? 1);
          const isOfficial = request.prompt?.includes("premierleague.com") ?? false;
          return {
            text: JSON.stringify({ rows: makeRows(source, isOfficial ? 19 : 20) }),
            model: "mock-model",
          };
        },
      },
      models: ["parallel-low"],
      now: () => new Date("2026-11-28T03:00:00Z"),
      store: {
        statuses: async (): Promise<SyncStatusRow[]> => [],
        latestFinished: async () => new Map(),
        knownTeams: async () => teamNames,
        currentStandings: async () => [],
        replaceStandings: async (input: { rows: unknown[] }) => input.rows.length,
        record: async (
          _job: string,
          _scope: string,
          ok: boolean,
          _error: string | null,
          meta: Record<string, unknown>,
        ) => { records.push({ ok, meta }); },
      },
    };
    const report = await runTablesSync(deps as never, { job: "standings", only: ["epl"], maxJobs: 1 });
    expect(report.ran[0]?.ok).toBe(true);
    expect(records.at(-1)?.ok).toBe(true);
    expect(records.at(-1)?.meta.fallbackFromOfficial).toBe(true);
    expect(records.at(-1)?.meta.sourceCount).toBeGreaterThanOrEqual(2);
  });
});

describe("empty historical windows", () => {
  it("marks a week with only out-of-window results as complete without a redundant secondary read", async () => {
    const pageText = `UEFA Champions League historical results. Alpha FC 2-1 Bravo United. ${"Match report and final score. ".repeat(20)}`;
    const answer = JSON.stringify({
      matches: [{
        source: 1,
        home: "Alpha FC",
        away: "Bravo United",
        date: "2026-10-20",
        time: null,
        tz: null,
        status: "finished",
        homeScore: 2,
        awayScore: 1,
        quote: "Alpha FC 2-1 Bravo United",
      }],
    });
    let calls = 0;
    const records: { ok: boolean; meta: Record<string, unknown> }[] = [];
    const deps = {
      search: {
        name: "fake",
        search: async () => [{
          url: "https://www.uefa.com/uefachampionsleague/news/results",
          title: "Official UEFA results",
          excerpt: pageText,
          publishedAt: null,
        }],
      },
      extract: { name: "fake", extract: async () => ({ markdown: pageText }) },
      llm: {
        name: "fake",
        generate: async () => { calls += 1; return { text: answer, model: "m" }; },
      },
      models: ["m"],
      now: () => new Date("2026-11-28T02:00:00Z"),
      store: {
        statuses: async (): Promise<SyncStatusRow[]> => [],
        latestFinished: async () => new Map(),
        knownTeams: async () => ["Alpha FC", "Bravo United"],
        completedCounts: async () => new Map(),
        replaceStandings: async () => 0,
        insertHistory: async () => 0,
        record: async (
          _job: string,
          _scope: string,
          ok: boolean,
          _error: string | null,
          meta: Record<string, unknown>,
        ) => { records.push({ ok, meta }); },
      },
    };
    const report = await runTablesSync(deps as never, { job: "season", only: ["ucl"], maxJobs: 1 });
    expect(calls).toBe(1);
    expect(report.ran[0]?.ok).toBe(true);
    expect(records.at(-1)?.ok).toBe(true);
    expect(records.at(-1)?.meta.noMatchesInWindow).toBe(true);
  });
});

describe("verified standings record corrections", () => {
  it("allows a corroborated W/D/L correction when played count is unchanged and the new points total is valid", () => {
    const previous = [{ team: "Genoa", position: 10, played: 12, won: 4, drawn: 1, lost: 7, goalsFor: 13, goalsAgainst: 16, points: 13 }];
    const corrected = [{ team: "Genoa", position: 10, played: 12, won: 5, drawn: 1, lost: 6, goalsFor: 13, goalsAgainst: 16, points: 16 }];
    expect(tableRegression(corrected, previous)).toBe("won_changed_without_new_matches_Genoa");
    expect(tableRegression(corrected, previous, false, [], false, true)).toBeNull();
  });
});
