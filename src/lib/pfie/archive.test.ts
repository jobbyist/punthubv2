import { describe, expect, it } from "vitest";

import {
  archiveUrls,
  ARCHIVE_SOURCES,
  corroborateTable,
  parseFbrefSchedule,
  parseResultsMatrix,
  parseScore,
  parseWikiTable,
  reconcileSeason,
} from "./archive";
import { archiveJobsDue } from "./archive-run";

// Shapes copied from real Parallel Extract output (Nov 2026), shortened to three clubs.
const FBREF = `
# 2025-2026 Test League Scores & Fixtures
| Wk | Day | Date | Time | Home | Score | Away | Attendance | Venue | Referee | Match Report | Notes |
| 1 | Sun | [2025-08-17](https://fbref.com/en/matches/2025-08-17) | 14:00 (09:00) | [Nottingham](https://fbref.com/en/squads/e4a775cb/2025-2026/Nottingham-Forest-Stats) | [3–1](https://fbref.com/en/matches/855f8b5e/x) | [Wolves](https://fbref.com/en/squads/8cec06e1/2025-2026/Wolverhampton-Wanderers-Stats) | 29,949 | The City Ground | P | [Match Report](https://fbref.com/x) |  |
| 1 | Sun | [2025-08-17](https://fbref.com/en/matches/2025-08-17) | 14:00 (09:00) | [Sundowns](https://fbref.com/en/squads/97d80fef/2025-2026/Mamelodi-Sundowns-Stats) | [0–0](https://fbref.com/x) | [Nottingham](https://fbref.com/en/squads/e4a775cb/2025-2026/Nottingham-Forest-Stats) | 1 | V | R | [Match Report](https://fbref.com/x) |  |
|  |  |  |  |  |  |  |  |  |  |  |  |
| Wk | Day | Date | Time | Home | Score | Away | Attendance | Venue | Referee | Match Report | Notes |
| 2 | Sat | [2025-08-23](https://fbref.com/en/matches/2025-08-23) | 15:00 (10:00) | [Wolves](https://fbref.com/en/squads/8cec06e1/2025-2026/Wolverhampton-Wanderers-Stats) | [2–2](https://fbref.com/x) | [Sundowns](https://fbref.com/en/squads/97d80fef/2025-2026/Mamelodi-Sundowns-Stats) | 1 | V | R | [Match Report](https://fbref.com/x) |  |
| 2 | Sat | [2025-08-23](https://fbref.com/en/matches/2025-08-23) | 15:00 (10:00) | [Nottingham](https://fbref.com/en/squads/e4a775cb/2025-2026/Nottingham-Forest-Stats) | [1–0](https://fbref.com/x) | [Sundowns](https://fbref.com/en/squads/97d80fef/2025-2026/Mamelodi-Sundowns-Stats) | 1 | V | R | [Match Report](https://fbref.com/x) |  |
| 3 | Sat | [2025-08-30](https://fbref.com/en/matches/2025-08-30) | 15:00 (10:00) | [Wolves](https://fbref.com/en/squads/8cec06e1/2025-2026/Wolverhampton-Wanderers-Stats) |  | [Nottingham](https://fbref.com/en/squads/e4a775cb/2025-2026/Nottingham-Forest-Stats) |  | V | R |  |  |
`;

const WIKI = `
# League table
| Pos | Team | Pld | W | D | L | GF | GA | GD | Pts | Qualification or relegation |
| 1 | [Nottingham Forest](https://en.wikipedia.org/wiki/Nottingham_Forest_F.C. "Nottingham Forest F.C.") (C) | 3 | 2 | 1 | 0 | 4 | 1 | +3 | 7 | x |
| 2 | [Wolverhampton Wanderers](https://en.wikipedia.org/wiki/Wolverhampton_Wanderers_F.C. "Wolverhampton Wanderers F.C.") | 2 | 0 | 1 | 1 | 3 | 5 | − 2 | 1 |  |
| 3 | [Mamelodi Sundowns](https://en.wikipedia.org/wiki/Mamelodi_Sundowns_F.C. "Mamelodi Sundowns F.C.") (R) | 3 | 0 | 2 | 1 | 2 | 3 | − 1 | 2 |  |

# Results
| Home \\ Away | [MSU](https://en.wikipedia.org/wiki/Mamelodi_Sundowns_F.C. "Mamelodi Sundowns F.C.") | [NFO](https://en.wikipedia.org/wiki/Nottingham_Forest_F.C. "Nottingham Forest F.C.") | [WOL](https://en.wikipedia.org/wiki/Wolverhampton_Wanderers_F.C.
"Wolverhampton Wanderers F.C.") |
| [Mamelodi Sundowns](https://en.wikipedia.org/wiki/Mamelodi_Sundowns_F.C. "Mamelodi Sundowns F.C.") | — | 0–0 |  |
| [Nottingham Forest](https://en.wikipedia.org/wiki/Nottingham_Forest_F.C. "Nottingham Forest F.C.") | 1–0 | — | [3–1](https://en.wikipedia.org/wiki/Derby "Derby") |
| [Wolverhampton Wanderers](https://en.wikipedia.org/wiki/Wolverhampton_Wanderers_F.C. "Wolverhampton Wanderers F.C.") | 2–2 | a | — |
Legend: Blue = home team win.
`;

describe("archive parsers", () => {
  it("reads scores in their usual forms", () => {
    expect(parseScore("2–1")).toEqual([2, 1]);
    expect(parseScore("[0–3](https://x)")).toEqual([0, 3]);
    expect(parseScore("3-0 [a]")).toEqual([3, 0]);
    expect(parseScore("—")).toBeNull();
    expect(parseScore("")).toBeNull();
    expect(parseScore("Awd")).toBeNull();
  });

  it("parses FBref rows with full names from the squad links, skipping unplayed matches", () => {
    const m = parseFbrefSchedule(FBREF);
    expect(m).toHaveLength(4);
    expect(m[0]).toEqual({
      date: "2025-08-17",
      home: "Nottingham Forest",
      away: "Wolverhampton Wanderers",
      homeScore: 3,
      awayScore: 1,
    });
  });

  it("maps matrix columns to rows by club link, joining wrapped link titles", () => {
    const mx = parseResultsMatrix(WIKI)!;
    expect(mx.teams).toEqual(["Mamelodi Sundowns", "Nottingham Forest", "Wolverhampton Wanderers"]);
    expect(mx.scores.get("1:2")).toEqual([3, 1]); // Forest (home) v Wolves
    expect(mx.scores.get("2:0")).toEqual([2, 2]);
    expect(mx.scores.has("2:1")).toBe(false); // "a" is not a score
  });

  it("parses the league table and strips (C)/(R)", () => {
    const t = parseWikiTable(WIKI);
    expect(t).toBeNull(); // fewer than 6 teams is not a league table
    const six = WIKI.replace(/\| 3 \| \[Mamelodi[^\n]+\n/, (row) =>
      [row, ...[4, 5, 6].map((p) => row.replace("| 3 |", `| ${p} |`))].join(""),
    );
    expect(parseWikiTable(six)?.[0]?.team).toBe("Nottingham Forest");
  });
});

describe("reconcileSeason", () => {
  it("keeps only matches both pages agree on", () => {
    const matrix = parseResultsMatrix(WIKI)!;
    const matches = parseFbrefSchedule(FBREF);
    const { rows, report } = reconcileSeason("psl", matches, matrix, ["Mamelodi Sundowns"]);
    expect(rows.map((r) => `${r.home} ${r.homeScore}-${r.awayScore} ${r.away}`)).toEqual([
      "Nottingham Forest 3-1 Wolverhampton Wanderers",
      "Mamelodi Sundowns 0-0 Nottingham Forest",
      "Wolverhampton Wanderers 2-2 Mamelodi Sundowns",
      "Nottingham Forest 1-0 Mamelodi Sundowns",
    ]);
    expect(rows[0]!.sourceDomains).toEqual(["fbref.com", "wikipedia.org"]);
    expect(report.disagreed).toBe(0);
  });

  it("drops a score the matrix contradicts", () => {
    const matrix = parseResultsMatrix(WIKI.replace("| 1–0 |", "| 2–0 |"))!;
    const { rows, report } = reconcileSeason("psl", parseFbrefSchedule(FBREF), matrix);
    expect(rows).toHaveLength(3);
    expect(report.disagreed).toBe(1);
  });
});

describe("corroborateTable", () => {
  const rows = reconcileSeason("psl", parseFbrefSchedule(FBREF), parseResultsMatrix(WIKI)!).rows;
  const table = [
    {
      position: 1,
      team: "Nottingham Forest",
      played: 3,
      won: 2,
      drawn: 1,
      lost: 0,
      goalsFor: 4,
      goalsAgainst: 1,
      points: 7,
    },
    {
      position: 2,
      team: "Mamelodi Sundowns",
      played: 3,
      won: 0,
      drawn: 2,
      lost: 1,
      goalsFor: 2,
      goalsAgainst: 3,
      points: 2,
    },
    {
      position: 3,
      team: "Wolverhampton Wanderers",
      played: 2,
      won: 0,
      drawn: 1,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 5,
      points: 1,
    },
  ];

  it("accepts a table that matches the verified results exactly", () => {
    expect(corroborateTable(table, rows)).toHaveProperty("rows");
  });

  it("rejects a table with a points deduction or a stats mismatch", () => {
    expect(
      corroborateTable(
        table.map((r, i) => (i === 0 ? { ...r, points: 4 } : r)),
        rows,
      ),
    ).toHaveProperty("reason");
    expect(
      corroborateTable(
        table.map((r, i) => (i === 1 ? { ...r, goalsFor: 9 } : r)),
        rows,
      ),
    ).toHaveProperty("reason");
  });
});

describe("archive jobs", () => {
  it("builds the page addresses", () => {
    const u = archiveUrls(ARCHIVE_SOURCES.epl!, 2025);
    expect(u.fbref).toBe(
      "https://fbref.com/en/comps/9/2025-2026/schedule/2025-2026-Premier-League-Scores-and-Fixtures",
    );
    expect(u.wikipedia).toBe("https://en.wikipedia.org/wiki/2025%E2%80%9326_Premier_League");
  });

  it("imports finished seasons once and refreshes the current one daily", () => {
    const now = new Date("2026-11-15T03:00:00Z");
    const deps = { now: () => now };
    const done = (scope: string, hoursAgo: number) => ({
      job: "archive" as const,
      scope,
      lastAttemptAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
      lastSuccessAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
      consecutiveFailures: 0,
    });
    const due = archiveJobsDue(deps, [done("epl:2025", 1), done("epl:2026", 2)], ["epl"]);
    expect(due).toEqual([{ key: "epl", year: 2024 }]);
    const later = archiveJobsDue(deps, [done("epl:2025", 100), done("epl:2026", 30)], ["epl"]);
    expect(later.map((j) => j.year)).toEqual([2026, 2024]);
  });
});
