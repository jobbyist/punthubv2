import { describe, expect, it } from "vitest";

import { parseWallet, sendableNow, transferErrorCode } from "./wallet";

const raw = {
  mvp_open: true,
  points: 400,
  points_transferable: 150,
  credits: 12,
  account_type: "payg",
  limits: {
    min: 10,
    max: 200,
    daily: 200,
    monthly: 1000,
    min_account_days: 14,
    hold_days: 7,
    sent_today: 120,
    sent_month: 900,
  },
  prices: [{ feature: "match_insight", title: "Match intelligence report", credits: 2 }],
};

describe("wallet", () => {
  it("parses the database answer", () => {
    const w = parseWallet(raw)!;
    expect(w).toMatchObject({ points: 400, credits: 12, accountType: "payg" });
    expect(w.limits.sentToday).toBe(120);
    expect(parseWallet(null)).toBeNull();
  });
  it("can send the smallest of the caps and the transferable balance", () => {
    expect(sendableNow(parseWallet(raw)!)).toBe(80);
    expect(sendableNow(parseWallet({ ...raw, limits: { ...raw.limits, sent_month: 990 } })!)).toBe(
      10,
    );
    expect(sendableNow(parseWallet({ ...raw, points_transferable: 0 })!)).toBe(0);
  });
  it("maps refusal codes", () => {
    expect(transferErrorCode("daily_cap")).toBe("daily_cap");
    expect(transferErrorCode("something odd")).toBe("unknown");
  });
});
