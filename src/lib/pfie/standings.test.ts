import { describe, expect, it } from "vitest";

import { needsBackfill, verifyHistory } from "./history";
import { chooseTable, parseStandings, validateTables, type RawStandingRow } from "./standings";
import { retryDue, standingsDue, type SyncStatusRow } from "./tables";
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

describe("validateTables", () => {
  const official = page("league.com", "official", 1, lines);
  it("accepts a complete, consistent table", () => {
    const { tables, rejected } = validateTables(raw(1), [official], 4, teams);
    expect(rejected).toEqual([]);
    expect(tables[0]!.rows.map((r) => r.team)).toEqual(teams);
  });
  it("rejects bad arithmetic, wrong team counts and quotes not on the page", () => {
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
        raw(1, (r) => ({ ...r, quote: "invented row" })),
        [official],
        4,
      ).rejected[0]!.reason,
    ).toMatch(/quote_not_on_page/);
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

describe("chooseTable", () => {
  const a = page("site-a.com", "trusted", 1, lines);
  const b = page("site-b.com", "other", 2, lines);
  it("needs the official site or two agreeing sites", () => {
    const one = validateTables(raw(1), [a], 4).tables;
    expect(chooseTable(one)).toBeNull();
    const two = validateTables([...raw(1), ...raw(2)], [a, b], 4).tables;
    expect(chooseTable(two)).toMatchObject({ verdict: "two_sources" });
  });
  it("does not accept two sites that disagree", () => {
    const b2 = page(
      "site-b.com",
      "other",
      2,
      lines.map((l) => l.replace("10 7 2 1 20 8 23", "11 8 2 1 22 8 26")),
    );
    const rows = [
      ...raw(1),
      ...raw(2, (r) =>
        r.team === "Alpha FC"
          ? { ...r, played: 11, won: 8, goalsFor: 22, points: 26, quote: b2.text.split("\n")[0]! }
          : r,
      ),
    ];
    expect(chooseTable(validateTables(rows, [a, b2], 4).tables)).toBeNull();
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
  it("refreshes only after a finished match or weekly", () => {
    const fresh = s({
      lastSuccessAt: "2026-11-14T02:10:00Z",
      lastAttemptAt: "2026-11-14T02:10:00Z",
    });
    expect(standingsDue(fresh, undefined, now)).toBe(false);
    expect(standingsDue(fresh, Date.parse("2026-11-13T15:00:00Z"), now)).toBe(false);
    expect(standingsDue(fresh, Date.parse("2026-11-14T15:00:00Z"), now)).toBe(true);
  });
});
