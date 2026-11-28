import { describe, expect, it } from "vitest";

import { isConfirmedNoMatchesInWindow, seasonQueries } from "./tables";

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
