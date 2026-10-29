import { describe, expect, it } from "vitest";

import { affordability, needsGamblingLabels, redeemErrorKey, ruleLimit } from "./rewards";
import { points } from "./format";

describe("redeemErrorKey", () => {
  it("maps the database errors", () => {
    expect(redeemErrorKey({ message: "insufficient_points" })).toBe("insufficient_points");
    expect(redeemErrorKey({ message: "out_of_stock" })).toBe("out_of_stock");
    expect(redeemErrorKey({ message: "not_eligible" })).toBe("not_eligible");
  });
  it("falls back for anything else", () => {
    expect(redeemErrorKey({ message: "boom" })).toBe("generic");
    expect(redeemErrorKey(null)).toBe("generic");
  });
});

describe("affordability", () => {
  it("says how many points are missing", () => {
    expect(affordability(100, 100)).toEqual({ ok: true });
    expect(affordability(80, 100)).toEqual({ ok: false, short: 20 });
  });
});

describe("labels and limits", () => {
  it("flags betting vouchers for the gambling labels", () => {
    expect(needsGamblingLabels("betting_voucher")).toBe(true);
    expect(needsGamblingLabels("retail_voucher")).toBe(false);
  });
  it("reads a rule's cap", () => {
    expect(ruleLimit({ cap_per_day: 10, cap_per_month: null })).toEqual({ kind: "day", count: 10 });
    expect(ruleLimit({ cap_per_day: null, cap_per_month: 20 })).toEqual({
      kind: "month",
      count: 20,
    });
    expect(ruleLimit({ cap_per_day: null, cap_per_month: null })).toBeNull();
  });
});

describe("points()", () => {
  it("groups thousands with a non-breaking space", () => {
    expect(points(1250)).toBe("1\u00a0250");
    expect(points(0)).toBe("0");
    expect(points(-5)).toBe("-5");
    expect(points(NaN)).toBe("");
  });
});
