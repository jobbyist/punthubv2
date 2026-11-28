import { describe, expect, it } from "vitest";

import {
  isNotLive,
  netOfFee,
  offeredPlans,
  priceError,
  streakShare,
  tipsterErrorKey,
  unlockStage,
  winsToGo,
} from "./tipster-support";

const progress = (streak: number, target = 10) => ({
  streak,
  target,
  window_days: 30,
  min_odds: 1.4,
  recent: [],
});

describe("tipster support helpers", () => {
  it("measures streak progress", () => {
    expect(streakShare(progress(5))).toBe(0.5);
    expect(streakShare(progress(14))).toBe(1);
    expect(streakShare(progress(3, 0))).toBe(0);
    expect(winsToGo(progress(7))).toBe(3);
    expect(winsToGo(progress(12))).toBe(0);
  });

  it("picks the unlock stage", () => {
    expect(unlockStage({ progress: progress(2), verified: false, tipster: null })).toBe("building");
    expect(unlockStage({ progress: progress(8), verified: false, tipster: null })).toBe("close");
    expect(unlockStage({ progress: progress(10), verified: false, tipster: null })).toBe("verify");
    const row = (status: "qualified" | "active" | "paused") =>
      ({ status }) as unknown as NonNullable<Parameters<typeof unlockStage>[0]["tipster"]>;
    expect(unlockStage({ progress: progress(0), verified: false, tipster: row("qualified") })).toBe(
      "verify",
    );
    expect(unlockStage({ progress: progress(0), verified: true, tipster: row("qualified") })).toBe(
      "pending",
    );
    expect(unlockStage({ progress: progress(10), verified: true, tipster: null })).toBe("pending");
    expect(unlockStage({ progress: progress(0), verified: true, tipster: row("active") })).toBe(
      "unlocked",
    );
    expect(unlockStage({ progress: progress(0), verified: true, tipster: row("paused") })).toBe(
      "paused",
    );
  });

  it("lists offered plans in order", () => {
    expect(offeredPlans({ price_pick: null, price_week: 50, price_month: 150 })).toEqual([
      { plan: "week", price: 50 },
      { plan: "month", price: 150 },
    ]);
    expect(offeredPlans({ price_pick: 10 })).toEqual([{ plan: "pick", price: 10 }]);
  });

  it("applies the platform fee by rounding the fee down", () => {
    expect(netOfFee(15, 10)).toBe(14);
    expect(netOfFee(100, 10)).toBe(90);
    expect(netOfFee(100, 0)).toBe(100);
  });

  it("validates prices", () => {
    expect(priceError("", [5, 100])).toBeNull();
    expect(priceError("20", [5, 100])).toBeNull();
    expect(priceError("2", [5, 100])).toBe("invalid");
    expect(priceError("7.5", [5, 100])).toBe("invalid");
  });

  it("maps errors and detects an unapplied migration", () => {
    expect(tipsterErrorKey("spend_cap")).toBe("errors.spend_cap");
    expect(tipsterErrorKey("boom")).toBe("errors.generic");
    expect(isNotLive({ code: "PGRST202", message: "x" })).toBe(true);
    expect(isNotLive({ message: "Could not find the function public.my_tipster_support" })).toBe(
      true,
    );
    expect(isNotLive({ code: "P0001", message: "spend_cap" })).toBe(false);
    expect(isNotLive(null)).toBe(false);
  });
});
