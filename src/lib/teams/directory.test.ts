import { describe, expect, it } from "vitest";

import { buildDirectory } from "./directory";

const row = (competition_key: string, competition: string, team: string, position: number) => ({
  competition_key,
  competition,
  team,
  position,
  played: 10,
  won: 6,
  drawn: 2,
  lost: 2,
  goals_for: 18,
  goals_against: 9,
  points: 20,
});

describe("team directory", () => {
  it("merges tables, fixtures and badges by normalised team name", () => {
    const teams = buildDirectory({
      standings: [
        row("epl", "Premier League", "Manchester City", 1),
        row("epl", "Premier League", "Arsenal", 2),
      ],
      fixtures: [
        {
          id: "f1",
          competition: "UEFA Champions League",
          home: "Man City",
          away: "Real Madrid",
          kickoff_at: "2026-12-02T20:00:00Z",
        },
        {
          id: "f0",
          competition: "Premier League",
          home: "Arsenal",
          away: "Manchester City",
          kickoff_at: "2026-11-30T16:30:00Z",
        },
      ],
      badges: [{ team_key: "manchester city", logo_url: "https://cdn.example/mci.png" }],
    });
    const city = teams.find((t) => t.key === "manchester city")!;
    expect(city.name).toBe("Manchester City");
    expect(city.slug).toBe("manchester-city");
    expect(city.badge).toBe("https://cdn.example/mci.png");
    expect(city.competitions.map((c) => c.key)).toEqual(["epl", "ucl"]);
    expect(city.standing?.position).toBe(1);
    expect(city.standing?.teams).toBe(2);
    expect(city.nextFixture).toMatchObject({ id: "f0", opponent: "Arsenal", venue: "A" });
    expect(city.upcoming).toBe(2);
    expect(teams.find((t) => t.name === "Real Madrid")?.competitions[0]?.key).toBe("ucl");
  });

  it("ignores competitions outside the coverage registry", () => {
    const teams = buildDirectory({
      standings: [row("urc", "United Rugby Championship", "Stormers", 1)],
      fixtures: [
        {
          id: "x",
          competition: "Friendly Cup",
          home: "A Team",
          away: "B Team",
          kickoff_at: "2026-12-01T10:00:00Z",
        },
      ],
      badges: [],
    });
    expect(teams).toEqual([]);
  });

  it("sorts teams alphabetically", () => {
    const teams = buildDirectory({
      standings: [
        row("psl", "Betway Premiership", "Orlando Pirates", 2),
        row("psl", "Betway Premiership", "Kaizer Chiefs", 5),
      ],
      fixtures: [],
      badges: [],
    });
    expect(teams.map((t) => t.name)).toEqual(["Kaizer Chiefs", "Orlando Pirates"]);
  });
});
