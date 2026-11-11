import { describe, expect, it } from "vitest";

import { settlePracticePicks } from "./settle";

const fixtures = [
  { id: "f1", home_score: 2, away_score: 1 },
  { id: "f2", home_score: 0, away_score: 0 },
];
const pick = (id: string, fixture_id: string, market: string, selection: string, odds = 2) => ({
  id,
  fixture_id,
  user_id: "u1",
  market,
  selection,
  odds,
});

describe("practice settlement", () => {
  it("grades with the real rules and units", () => {
    const r = settlePracticePicks(
      [
        pick("a", "f1", "1X2", "home", 2.5),
        pick("b", "f1", "1X2", "away", 3),
        pick("c", "f1", "OU25", "over", 1.9),
        pick("d", "f1", "BTTS", "yes", 1.8),
        pick("e", "f2", "DC", "12", 1.5),
        pick("f", "f2", "OU25", "under", 1.7),
      ],
      fixtures,
    );
    const by = Object.fromEntries(r.map((x) => [x.id, x]));
    expect(by["a"]).toMatchObject({ result: "won", units: 1.5 });
    expect(by["b"]).toMatchObject({ result: "lost", units: -1 });
    expect(by["c"]).toMatchObject({ result: "won", units: 0.9 });
    expect(by["d"]).toMatchObject({ result: "won", units: 0.8 });
    expect(by["e"]).toMatchObject({ result: "lost", units: -1 });
    expect(by["f"]).toMatchObject({ result: "won", units: 0.7 });
  });

  it("leaves picks on unfinished fixtures and unknown markets alone", () => {
    const r = settlePracticePicks(
      [pick("x", "f9", "1X2", "home"), pick("y", "f1", "HCP", "home")],
      fixtures,
    );
    expect(r).toEqual([]);
  });
});
