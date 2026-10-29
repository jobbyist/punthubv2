import { describe, expect, it } from "vitest";

import { groupFixturesByDay, type UpcomingFixture } from "./fixtures";

const fx = (id: string, kickoff: string): UpcomingFixture => ({
  id,
  sport: "soccer",
  competition: "Betway Premiership",
  home: "A",
  away: "B",
  kickoff_at: kickoff,
  status: "scheduled",
});

describe("groupFixturesByDay", () => {
  it("groups by South African calendar day, not UTC day", () => {
    // 22:30 UTC on the 31st is 00:30 SAST on 1 Nov.
    const days = groupFixturesByDay([
      fx("1", "2026-10-31T09:00:00Z"),
      fx("2", "2026-10-31T15:30:00Z"),
      fx("3", "2026-10-31T22:30:00Z"),
      fx("4", "2026-11-01T10:00:00Z"),
    ]);
    expect(days.map((d) => [d.label, d.fixtures.map((f) => f.id)])).toEqual([
      ["Sat 31 Oct 2026", ["1", "2"]],
      ["Sun 1 Nov 2026", ["3", "4"]],
    ]);
  });
  it("returns nothing for no fixtures", () => {
    expect(groupFixturesByDay([])).toEqual([]);
  });
});
