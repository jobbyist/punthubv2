import { describe, expect, it } from "vitest";

import { hasFavourites, rankForMember } from "./preferences";

const fx = (home: string, away: string, competition: string, day: number) => ({
  home,
  away,
  competition,
  kickoff_at: `2026-11-${day}T15:00:00Z`,
});

describe("rankForMember", () => {
  const key = (n: string) =>
    n === "Premier League" ? "epl" : n === "Betway Premiership" ? "psl" : null;
  const list = [
    fx("Arsenal", "Chelsea", "Premier League", 21),
    fx("Kaizer Chiefs", "Orlando Pirates", "Betway Premiership", 25),
    fx("Getafe", "Sevilla", "La Liga", 20),
  ];
  it("puts favourite teams first, then competitions, then kick-off order", () => {
    const r = rankForMember(
      list,
      { sports: [], competitions: ["epl"], teams: ["orlando pirates"] },
      key,
    );
    expect(r.map((x) => [x.fixture.home, x.reason])).toEqual([
      ["Kaizer Chiefs", "team"],
      ["Arsenal", "competition"],
      ["Getafe", null],
    ]);
  });
  it("keeps kick-off order without favourites", () => {
    expect(
      rankForMember(list, { sports: [], competitions: [], teams: [] }, key)[0]!.fixture.home,
    ).toBe("Getafe");
  });
  it("knows when favourites are set", () => {
    expect(hasFavourites({ sports: ["soccer"], competitions: [], teams: [] })).toBe(false);
    expect(hasFavourites({ sports: [], competitions: ["psl"], teams: [] })).toBe(true);
  });
});
