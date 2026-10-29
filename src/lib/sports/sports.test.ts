import { describe, expect, it, vi } from "vitest";

import { normaliseFootball, normaliseRugby } from "./apisports.normalise";
import { ApiSportsProvider } from "./apisports.server";
import { competitions, parseLeagueIds, seasonFor } from "./competitions";
import { csvProviderRef, parseFixtureCsv } from "./csv";
import { mapFootballStatus, mapRugbyStatus } from "./status";
import { syncFixtures, syncResults, type FixtureStore } from "./sync.server";
import type { NormalisedFixture } from "./types";

const psl = competitions.find((c) => c.key === "psl")!;
const springboks = competitions.find((c) => c.key === "springbok-tests")!;

describe("status mapping", () => {
  it("maps API-Football codes", () => {
    expect(mapFootballStatus("NS")).toBe("scheduled");
    expect(mapFootballStatus("2H")).toBe("live");
    expect(mapFootballStatus("FT")).toBe("finished");
    expect(mapFootballStatus("AET")).toBe("finished");
    expect(mapFootballStatus("PEN")).toBe("finished");
    expect(mapFootballStatus("PST")).toBe("postponed");
    expect(mapFootballStatus("ABD")).toBe("abandoned");
    expect(mapFootballStatus("CANC")).toBe("cancelled");
    expect(mapFootballStatus("AWD")).toBe("cancelled");
    expect(mapFootballStatus("WO")).toBe("cancelled");
    expect(mapFootballStatus("???")).toBeNull();
  });
  it("maps API-Rugby codes", () => {
    expect(mapRugbyStatus("NS")).toBe("scheduled");
    expect(mapRugbyStatus("HT")).toBe("live");
    expect(mapRugbyStatus("FT")).toBe("finished");
    expect(mapRugbyStatus("PST")).toBe("postponed");
    expect(mapRugbyStatus("CANC")).toBe("cancelled");
    expect(mapRugbyStatus(undefined)).toBeNull();
  });
});

describe("normalisation", () => {
  const footballItem = (
    short: string,
    fulltime: [number, number] | null,
    goals: [number, number],
  ) => ({
    fixture: { id: 99, date: "2026-11-07T17:30:00+02:00", status: { short } },
    teams: { home: { name: "Orlando Pirates" }, away: { name: "Kaizer Chiefs" } },
    goals: { home: goals[0], away: goals[1] },
    score: {
      fulltime: fulltime ? { home: fulltime[0], away: fulltime[1] } : { home: null, away: null },
    },
  });

  it("uses the 90-minute score for a match that went to penalties", () => {
    const f = normaliseFootball(footballItem("PEN", [1, 1], [4, 3]), psl)!;
    expect(f.status).toBe("finished");
    expect([f.homeScore, f.awayScore]).toEqual([1, 1]);
  });
  it("holds no score until the match is finished", () => {
    const f = normaliseFootball(footballItem("2H", null, [1, 0]), psl)!;
    expect([f.status, f.homeScore, f.awayScore]).toEqual(["live", null, null]);
  });
  it("stores kick-off as UTC ISO and a stable provider ref", () => {
    const f = normaliseFootball(footballItem("NS", null, [0, 0]), psl)!;
    expect(f.kickoffAt).toBe("2026-11-07T15:30:00.000Z");
    expect(f.providerRef).toBe("football:99");
    expect(f.competition).toBe("Betway Premiership");
  });
  it("drops items with a missing id, team or unknown status", () => {
    expect(
      normaliseFootball(
        {
          ...footballItem("NS", null, [0, 0]),
          fixture: { date: "2026-11-07T17:30:00+02:00", status: { short: "NS" } },
        },
        psl,
      ),
    ).toBeNull();
    expect(normaliseFootball(footballItem("??", null, [0, 0]), psl)).toBeNull();
  });
  it("keeps only Springbok fixtures for the Springbok Tests competition", () => {
    const item = (home: string, away: string) => ({
      id: 5,
      date: "2026-11-14T16:10:00+02:00",
      status: { short: "NS" },
      teams: { home: { name: home }, away: { name: away } },
      scores: { home: null, away: null },
    });
    expect(normaliseRugby(item("South Africa", "Wales"), springboks)).not.toBeNull();
    expect(normaliseRugby(item("France", "Wales"), springboks)).toBeNull();
  });
});

describe("seasons and league ids", () => {
  it("names a season for the year it starts in", () => {
    expect(seasonFor("july", new Date("2026-10-29T00:00:00Z"))).toBe(2026);
    expect(seasonFor("july", new Date("2027-03-01T00:00:00Z"))).toBe(2026);
    expect(seasonFor("calendar", new Date("2027-03-01T00:00:00Z"))).toBe(2027);
  });
  it("only accepts known keys with positive integer ids", () => {
    expect(parseLeagueIds('{"psl":12,"epl":"x","nope":3,"urc":-1}')).toEqual({ psl: 12 });
    expect(parseLeagueIds("not json")).toEqual({});
    expect(parseLeagueIds(undefined)).toEqual({});
  });
});

describe("parseFixtureCsv", () => {
  const head = "sport,competition,home,away,kickoff_at";
  it("parses valid rows and converts kick-off to UTC", () => {
    const r = parseFixtureCsv(
      `${head}\nsoccer,Betway Premiership,Sundowns,"Chippa, United",2026-11-07T17:30:00+02:00\n`,
    );
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      {
        sport: "soccer",
        competition: "Betway Premiership",
        home: "Sundowns",
        away: "Chippa, United",
        kickoffAt: "2026-11-07T15:30:00.000Z",
      },
    ]);
  });
  it("rejects a kick-off without an offset", () => {
    const r = parseFixtureCsv(`${head}\nsoccer,PSL,A,B,2026-11-07T17:30:00\n`);
    expect(r.rows).toEqual([]);
    expect(r.errors[0]?.message).toMatch(/offset/);
  });
  it("rejects bad sports, identical teams and a wrong header", () => {
    expect(parseFixtureCsv(`${head}\ncricket,X,A,B,2026-11-07T17:30:00+02:00`).errors).toHaveLength(
      1,
    );
    expect(parseFixtureCsv(`${head}\nsoccer,X,A,A,2026-11-07T17:30:00+02:00`).errors).toHaveLength(
      1,
    );
    expect(parseFixtureCsv("a,b\n1,2").errors[0]?.message).toMatch(/Header/);
    expect(parseFixtureCsv("").errors).toHaveLength(1);
  });
  it("gives re-imports the same provider ref", () => {
    const row = {
      sport: "rugby" as const,
      competition: "URC",
      home: "Bulls",
      away: "Stormers",
      kickoffAt: "2026-11-07T15:30:00.000Z",
    };
    expect(csvProviderRef(row)).toBe(csvProviderRef({ ...row }));
  });
});

function fakeStore(
  over: Partial<FixtureStore> = {},
): FixtureStore & { upsert: ReturnType<typeof vi.fn> } {
  return {
    finishedRefs: vi.fn().mockResolvedValue(new Set<string>()),
    upsert: vi.fn().mockResolvedValue(undefined),
    openSince: vi.fn().mockResolvedValue([]),
    ...over,
  } as never;
}
const fx = (ref: string, status: NormalisedFixture["status"] = "scheduled"): NormalisedFixture => ({
  provider: "apisports",
  providerRef: ref,
  sport: "soccer",
  competition: "Betway Premiership",
  home: "A",
  away: "B",
  kickoffAt: "2026-11-07T15:30:00.000Z",
  status,
  homeScore: null,
  awayScore: null,
});

describe("sync", () => {
  const provider = (fixtures: NormalisedFixture[], calls = 1) => ({
    name: "apisports",
    listFixtures: vi.fn().mockResolvedValue({ fixtures, calls, skipped: [] }),
    listResults: vi.fn().mockResolvedValue({ fixtures, calls, skipped: [] }),
  });

  it("upserts fixtures but never overwrites one that is already finished", async () => {
    const store = fakeStore({ finishedRefs: vi.fn().mockResolvedValue(new Set(["football:2"])) });
    const report = await syncFixtures(provider([fx("football:1"), fx("football:2")]), store);
    expect(report).toMatchObject({ ok: true, calls: 1, upserted: 1 });
    expect(store.upsert.mock.calls[0]![0].map((r: NormalisedFixture) => r.providerRef)).toEqual([
      "football:1",
    ]);
  });

  it("makes no provider call for results when nothing is open", async () => {
    const p = provider([]);
    const report = await syncResults(p, fakeStore());
    expect(report).toMatchObject({ calls: 0, upserted: 0 });
    expect(p.listResults).not.toHaveBeenCalled();
  });

  it("asks only for competitions that have open fixtures and updates only those fixtures", async () => {
    const p = provider([fx("football:1", "finished"), fx("football:9", "finished")]);
    const store = fakeStore({
      openSince: vi.fn().mockResolvedValue([
        {
          provider: "apisports",
          providerRef: "football:1",
          competition: "Betway Premiership",
          kickoffAt: "2026-11-07T15:30:00.000Z",
        },
      ]),
    });
    const report = await syncResults(p, store, new Date("2026-11-07T19:00:00Z"));
    expect(p.listResults).toHaveBeenCalledWith(expect.any(Date), expect.any(Date), {
      only: ["psl"],
    });
    expect(report.upserted).toBe(1);
    expect(store.upsert.mock.calls[0]![0][0].providerRef).toBe("football:1");
  });
});

describe("ApiSportsProvider", () => {
  const ok = (response: unknown[]) =>
    new Response(JSON.stringify({ errors: [], response }), { status: 200 });

  it("skips competitions without a league id and spends no calls on them", async () => {
    const fetchImpl = vi.fn();
    const p = new ApiSportsProvider("key", { psl: 288 }, fetchImpl as never);
    fetchImpl.mockResolvedValue(ok([]));
    const out = await p.listFixtures(
      new Date("2026-10-29T00:00:00Z"),
      new Date("2026-11-12T00:00:00Z"),
    );
    expect(out.calls).toBe(1);
    expect(out.skipped.map((s) => s.key).sort()).toEqual(["epl", "springbok-tests", "ucl", "urc"]);
    const url = new URL(fetchImpl.mock.calls[0]![0]);
    expect(url.pathname).toBe("/fixtures");
    expect(url.searchParams.get("league")).toBe("288");
    expect(url.searchParams.get("season")).toBe("2026");
    expect(fetchImpl.mock.calls[0]![1].headers["x-apisports-key"]).toBe("key");
  });

  it("reports an API error as a skipped competition instead of failing the run", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: { requests: "limit reached" }, response: [] }), {
        status: 200,
      }),
    );
    const p = new ApiSportsProvider("key", { psl: 288 }, fetchImpl as never);
    const out = await p.listFixtures(
      new Date("2026-10-29T00:00:00Z"),
      new Date("2026-11-12T00:00:00Z"),
      { only: ["psl"] },
    );
    expect(out.fixtures).toEqual([]);
    expect(out.skipped[0]?.reason).toMatch(/limit reached/);
  });

  it("filters rugby games to the requested window", async () => {
    const game = (id: number, date: string) => ({
      id,
      date,
      status: { short: "NS" },
      teams: { home: { name: "Bulls" }, away: { name: "Stormers" } },
      scores: {},
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        ok([game(1, "2026-11-01T15:00:00+02:00"), game(2, "2027-02-01T15:00:00+02:00")]),
      );
    const p = new ApiSportsProvider("key", { urc: 76 }, fetchImpl as never);
    const out = await p.listFixtures(
      new Date("2026-10-29T00:00:00Z"),
      new Date("2026-11-12T00:00:00Z"),
      { only: ["urc"] },
    );
    expect(out.fixtures.map((f) => f.providerRef)).toEqual(["rugby:1"]);
  });
});
