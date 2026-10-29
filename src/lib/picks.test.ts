import { describe, expect, it } from "vitest";

import {
  MARKETS_BY_SPORT,
  countdownTo,
  crowdSplit,
  formatSpan,
  lockedBefore,
  parseLine,
  parseOdds,
  pickErrorKey,
  signedLine,
  validatePick,
  type PickInput,
} from "./picks";

const base: PickInput = {
  market: "1X2",
  selection: "home",
  line: "",
  odds: "2.10",
  confidence: 3,
  reasoning: "",
};

describe("parseOdds", () => {
  it("accepts 1.01 to 50 with at most two decimals", () => {
    expect(parseOdds("2.10")).toBe(2.1);
    expect(parseOdds("1.01")).toBe(1.01);
    expect(parseOdds("50")).toBe(50);
    expect(parseOdds("2,5")).toBe(2.5);
  });
  it("rejects out of range and badly formatted prices", () => {
    for (const bad of ["1", "1.00", "0.99", "50.01", "51", "2.123", "abc", "", "-2", "1e1"]) {
      expect(parseOdds(bad), bad).toBeNull();
    }
  });
});

describe("parseLine", () => {
  it("accepts signed lines with up to two decimals", () => {
    expect(parseLine("-6.5")).toBe(-6.5);
    expect(parseLine("+3")).toBe(3);
    expect(parseLine("−2.5")).toBe(-2.5);
    expect(parseLine("0")).toBe(0);
  });
  it("rejects nonsense and out-of-range lines", () => {
    for (const bad of ["", "abc", "61", "-61", "1.234", "--2"])
      expect(parseLine(bad), bad).toBeNull();
  });
});

describe("validatePick", () => {
  it("passes a good pick", () => expect(validatePick(base)).toBeNull());
  it("needs a selection that belongs to the market", () => {
    expect(validatePick({ ...base, selection: null })).toBe("selection");
    expect(validatePick({ ...base, market: "OU25", selection: "home" })).toBe("selection");
    expect(validatePick({ ...base, market: "DC", selection: "12" })).toBeNull();
  });
  it("needs a line only for handicap", () => {
    expect(validatePick({ ...base, market: "HCP", selection: "home", line: "" })).toBe("line");
    expect(validatePick({ ...base, market: "HCP", selection: "home", line: "-6.5" })).toBeNull();
    expect(validatePick({ ...base, line: "" })).toBeNull();
  });
  it("checks odds, confidence and reasoning length", () => {
    expect(validatePick({ ...base, odds: "1.00" })).toBe("odds");
    expect(validatePick({ ...base, confidence: null })).toBe("confidence");
    expect(validatePick({ ...base, confidence: 6 })).toBe("confidence");
    expect(validatePick({ ...base, reasoning: "x".repeat(281) })).toBe("reasoning");
    expect(validatePick({ ...base, reasoning: "x".repeat(280) })).toBeNull();
  });
});

describe("markets by sport", () => {
  it("matches the launch scope", () => {
    expect(MARKETS_BY_SPORT.soccer).toEqual(["1X2", "DC", "OU25", "BTTS"]);
    expect(MARKETS_BY_SPORT.rugby).toEqual(["1X2", "HCP"]);
  });
});

describe("pickErrorKey", () => {
  it("maps an unconfirmed email to its own message", () => {
    expect(pickErrorKey({ message: "email_not_confirmed" })).toBe("email_not_confirmed");
  });
  it("maps the database's reasons", () => {
    expect(pickErrorKey({ message: "kickoff_passed" })).toBe("kickoff_passed");
    expect(pickErrorKey({ message: "daily_limit" })).toBe("daily_limit");
    expect(
      pickErrorKey({ code: "23505", message: "duplicate key value violates unique constraint" }),
    ).toBe("duplicate");
    expect(
      pickErrorKey({
        message:
          'duplicate key value violates unique constraint "predictions_user_id_fixture_id_market_key"',
      }),
    ).toBe("duplicate");
  });
  it("hides anything unknown", () => {
    expect(pickErrorKey({ message: "relation foo does not exist" })).toBe("generic");
    expect(pickErrorKey(null)).toBe("generic");
  });
});

describe("countdown", () => {
  const kick = "2026-11-07T15:30:00Z";
  it("counts down while open", () => {
    const c = countdownTo(kick, new Date("2026-11-07T13:16:00Z"));
    expect(c).toEqual({ state: "open", days: 0, hours: 2, minutes: 14 });
    expect(formatSpan(c)).toBe("2h 14m");
  });
  it("switches to locked at kick-off", () => {
    expect(countdownTo(kick, new Date("2026-11-07T15:30:00Z")).state).toBe("locked");
    expect(countdownTo(kick, new Date("2026-11-07T16:00:00Z")).state).toBe("locked");
  });
  it("shows days for far-off fixtures and a floor under a minute", () => {
    expect(formatSpan(countdownTo(kick, new Date("2026-11-05T12:00:00Z")))).toBe("2d 3h");
    expect(formatSpan(countdownTo(kick, new Date("2026-11-07T15:29:30Z")))).toBe("<1m");
  });
});

describe("lockedBefore", () => {
  it("says how long before kick-off a pick was locked", () => {
    expect(lockedBefore("2026-11-07T12:18:00Z", "2026-11-07T15:30:00Z")).toBe("3h 12m");
    expect(lockedBefore("2026-11-05T15:30:00Z", "2026-11-07T15:30:00Z")).toBe("2d 0h");
  });
});

describe("crowdSplit", () => {
  it("is null with no Match result picks", () => {
    expect(crowdSplit([])).toBeNull();
    expect(crowdSplit([{ market: "BTTS", selection: "yes" }])).toBeNull();
  });
  it("counts only 1X2 picks and reports the sample size", () => {
    const s = crowdSplit([
      { market: "1X2", selection: "home" },
      { market: "1X2", selection: "home" },
      { market: "1X2", selection: "away" },
      { market: "BTTS", selection: "yes" },
    ])!;
    expect(s).toEqual({ total: 3, home: 67, draw: 0, away: 33 });
  });
});

describe("signedLine", () => {
  it("adds a plus for positive lines", () => {
    expect(signedLine(6.5)).toBe("+6.5");
    expect(signedLine(-6.5)).toBe("-6.5");
    expect(signedLine(0)).toBe("0");
  });
});
