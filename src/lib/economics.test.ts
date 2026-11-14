import { describe, expect, it } from "vitest";
import {
  PACKS,
  PRO_FAIR_USE,
  USD_ZAR,
  USD_ZAR_STRESS,
  maxProCap,
  minPackPrice,
  packEconomics,
  payfastFee,
  proEconomics,
  worstAiCostPerCredit,
} from "./economics";

/** Floors the owner set: modest margins are fine, margins eaten by usage or fees are not. */
const PACK_MARGIN_FLOOR = 0.6; // after PayFast, VAT on fees, payout share and worst-case AI on every credit
const PRO_WORST_MARGIN_FLOOR = 0.4; // Pro payment, after fees, if the member uses the whole fair-use cap on the dearest model

describe("PAYG packs", () => {
  for (const method of ["card", "eft"] as const) {
    for (const fx of [USD_ZAR, USD_ZAR_STRESS]) {
      it(`every pack keeps ${PACK_MARGIN_FLOOR * 100}% (${method}, R${fx}/USD, dearest model, all credits spent)`, () => {
        for (const pack of PACKS) {
          const e = packEconomics(pack, { method, fx });
          expect(
            e.margin,
            `${pack.name} margin ${(e.margin * 100).toFixed(1)}%`,
          ).toBeGreaterThanOrEqual(PACK_MARGIN_FLOOR);
        }
      });
    }
  }

  it("bigger packs never cost the member more per credit, and the cheapest pack still clears the floor price", () => {
    const per = PACKS.map((p) => p.price / p.credits);
    expect([...per].sort((a, b) => b - a)).toEqual(per);
    for (const p of PACKS)
      expect(p.price).toBeGreaterThanOrEqual(minPackPrice(p.credits, PACK_MARGIN_FLOOR));
  });

  it("fixed fees weigh most on the smallest pack", () => {
    const small = payfastFee(25, "card") / 25;
    const big = payfastFee(120, "card") / 120;
    expect(small).toBeGreaterThan(big);
  });

  it("AI cost per credit is small next to the credit price", () => {
    expect(worstAiCostPerCredit("gemini-3.5-flash")).toBeLessThan(0.2);
  });
});

describe("Puntr Pro", () => {
  it("fair-use cap keeps the worst-case margin above the floor", () => {
    const e = proEconomics(PRO_FAIR_USE.monthlyAiActions);
    expect(e.worstMargin).toBeGreaterThanOrEqual(PRO_WORST_MARGIN_FLOOR);
    expect(
      proEconomics(PRO_FAIR_USE.monthlyAiActions, USD_ZAR_STRESS).worstMargin,
    ).toBeGreaterThanOrEqual(PRO_WORST_MARGIN_FLOOR - 0.1);
  });

  it("the recommended cap is not above the largest cap the floor allows", () => {
    expect(PRO_FAIR_USE.monthlyAiActions).toBeLessThanOrEqual(maxProCap(0.5));
  });

  it("the daily burst limit is below the monthly cap; the monthly cap is what bounds cost", () => {
    expect(PRO_FAIR_USE.dailyAiActions).toBeLessThan(PRO_FAIR_USE.monthlyAiActions);
  });
});
