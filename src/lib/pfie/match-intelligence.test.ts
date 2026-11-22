import { describe, expect, it } from "vitest";

import {
  validateMatchLineups,
  validateMatchStats,
  type IntelligenceFixture,
  type IntelligenceSource,
} from "./match-intelligence";

const fixture: IntelligenceFixture = {
  id: "fixture-1",
  sport: "soccer",
  competition: "Premier League",
  home: "Arsenal",
  away: "Chelsea",
  kickoffAt: "2026-11-22T15:00:00+02:00",
  status: "finished",
  homeScore: 2,
  awayScore: 1,
};

const statQuote =
  "Arsenal v Chelsea 2026-11-22 possession 55 45 shots 12 9 shots on target 5 3 corners 4 2";
const sources: IntelligenceSource[] = [
  { index: 1, url: "https://one.example/match", domain: "one.example", tier: "trusted", text: statQuote },
  { index: 2, url: "https://two.example/match", domain: "two.example", tier: "trusted", text: statQuote },
];

const stats = {
  possession: 55,
  shots: 12,
  shotsOnTarget: 5,
  corners: 4,
};

const statsAway = {
  possession: 45,
  shots: 9,
  shotsOnTarget: 3,
  corners: 2,
};

describe("validateMatchStats", () => {
  it("publishes only values agreed by two independent trusted sources", () => {
    const result = validateMatchStats(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
      ],
      sources,
      fixture,
    );
    expect(result?.homeStats).toMatchObject(stats);
    expect(result?.awayStats).toMatchObject(statsAway);
    expect(result?.sourceDomains).toEqual(["one.example", "two.example"]);
  });

  it("omits a conflicting metric while retaining metrics corroborated by both sources", () => {
    const secondQuote = statQuote.replace("shots 12", "shots 13");
    const secondSources = [
      sources[0]!,
      { ...sources[1]!, text: secondQuote },
    ];
    const result = validateMatchStats(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: { ...stats, shots: 13 }, awayStats: statsAway, quote: secondQuote },
      ],
      secondSources,
      fixture,
    );
    expect(result?.homeStats.shots).toBeUndefined();
    expect(result?.homeStats.possession).toBe(55);
    expect(result?.awayStats.shots).toBe(9);
  });

  it("uses the South African match date when the stored kickoff timestamp is UTC", () => {
    const overnightFixture = { ...fixture, kickoffAt: "2026-11-21T23:30:00Z" };
    const result = validateMatchStats(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
      ],
      sources,
      overnightFixture,
    );
    expect(result).not.toBeNull();
  });

  it("does not publish a single-source match-stat observation", () => {
    const result = validateMatchStats(
      [{ source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote }],
      sources.slice(0, 1),
      fixture,
    );
    expect(result).toBeNull();
  });

  it("does not count two subdomains of one publisher as independent sources", () => {
    const samePublisher: IntelligenceSource[] = [
      { index: 1, url: "https://espn.com/match", domain: "espn.com", tier: "trusted", text: statQuote },
      { index: 2, url: "https://sports.espn.com/match", domain: "sports.espn.com", tier: "trusted", text: statQuote },
    ];
    const result = validateMatchStats(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
      ],
      samePublisher,
      fixture,
    );
    expect(result).toBeNull();
  });

  it("rejects observations for the wrong home-away order", () => {
    const result = validateMatchStats(
      [
        { source: 1, home: "Chelsea", away: "Arsenal", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
        { source: 2, home: "Chelsea", away: "Arsenal", date: "2026-11-22", homeStats: stats, awayStats: statsAway, quote: statQuote },
      ],
      sources,
      fixture,
    );
    expect(result).toBeNull();
  });
});

const homePlayers = Array.from({ length: 11 }, (_, i) => ({
  name: "Arsenal Player " + (i + 1),
  position: i === 0 ? "GK" : "DF",
  role: "starter" as const,
}));
const awayPlayers = Array.from({ length: 11 }, (_, i) => ({
  name: "Chelsea Player " + (i + 1),
  position: i === 0 ? "GK" : "DF",
  role: "starter" as const,
}));
const lineupQuote =
  "Arsenal v Chelsea 2026-11-22 " +
  [...homePlayers, ...awayPlayers].map((player) => player.name).join(" ");

describe("validateMatchLineups", () => {
  it("publishes a starting XI only when two independent sources agree", () => {
    const result = validateMatchLineups(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homePlayers, awayPlayers, quote: lineupQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homePlayers, awayPlayers, quote: lineupQuote },
      ],
      sources,
      fixture,
    );
    expect(result?.homePlayers.filter((player) => player.role === "starter")).toHaveLength(11);
    expect(result?.awayPlayers.filter((player) => player.role === "starter")).toHaveLength(11);
    expect(result?.sourceDomains).toHaveLength(2);
  });

  it("requires a full starting XV for rugby line-ups", () => {
    const rugbyFixture = {
      ...fixture,
      sport: "rugby",
      home: "Vodacom Bulls",
      away: "DHL Stormers",
    };
    const rugbyHome = Array.from({ length: 15 }, (_, i) => ({
      name: "Bulls Player " + (i + 1),
      position: i < 8 ? "Forward" : "Back",
      role: "starter" as const,
    }));
    const rugbyAway = Array.from({ length: 15 }, (_, i) => ({
      name: "Stormers Player " + (i + 1),
      position: i < 8 ? "Forward" : "Back",
      role: "starter" as const,
    }));
    const quote = "Vodacom Bulls v DHL Stormers 2026-11-22 " +
      [...rugbyHome, ...rugbyAway].map((player) => player.name).join(" ");
    const rugbySources = sources.map((source) => ({ ...source, text: quote }));
    const result = validateMatchLineups(
      [
        { source: 1, home: "Vodacom Bulls", away: "DHL Stormers", date: "2026-11-22", homePlayers: rugbyHome, awayPlayers: rugbyAway, quote },
        { source: 2, home: "Vodacom Bulls", away: "DHL Stormers", date: "2026-11-22", homePlayers: rugbyHome, awayPlayers: rugbyAway, quote },
      ],
      rugbySources,
      rugbyFixture,
    );
    expect(result?.homePlayers.filter((player) => player.role === "starter")).toHaveLength(15);
    expect(result?.awayPlayers.filter((player) => player.role === "starter")).toHaveLength(15);
  });

  it("does not count two subdomains of one publisher as independent line-up sources", () => {
    const samePublisher: IntelligenceSource[] = [
      { index: 1, url: "https://espn.com/match", domain: "espn.com", tier: "trusted", text: lineupQuote },
      { index: 2, url: "https://sports.espn.com/match", domain: "sports.espn.com", tier: "trusted", text: lineupQuote },
    ];
    const result = validateMatchLineups(
      [
        { source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homePlayers, awayPlayers, quote: lineupQuote },
        { source: 2, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homePlayers, awayPlayers, quote: lineupQuote },
      ],
      samePublisher,
      fixture,
    );
    expect(result).toBeNull();
  });

  it("does not publish a single-source line-up", () => {
    const result = validateMatchLineups(
      [{ source: 1, home: "Arsenal", away: "Chelsea", date: "2026-11-22", homePlayers, awayPlayers, quote: lineupQuote }],
      sources.slice(0, 1),
      fixture,
    );
    expect(result).toBeNull();
  });
});
