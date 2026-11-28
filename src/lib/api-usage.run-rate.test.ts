import { describe, expect, it } from "vitest";
import { calculateSpendRunRate } from "./api-usage.run-rate";

describe("calculateSpendRunRate", () => {
  it("shows the daily allowance and provisional launch-day projection", () => {
    const result = calculateSpendRunRate({
      periodStart: "2026-11-28",
      periodEnd: "2027-03-31",
      today: "2026-11-28",
      limitUsd: 200,
      spentUsd: 7.684,
      dailySpend: [{ day: "2026-11-28", spendUsd: 7.684 }],
    });

    expect(result.daysRemaining).toBe(124);
    expect(result.observedDays).toBe(1);
    expect(result.remainingUsd).toBeCloseTo(192.316, 3);
    expect(result.requiredDailyUsd).toBeCloseTo(1.5517, 3);
    expect(result.observedDailyUsd).toBeCloseTo(7.684, 3);
    expect(result.projectedTotalUsd).toBeCloseTo(952.816, 3);
    expect(result.projectedOverageUsd).toBeCloseTo(752.816, 3);
    expect(result.daysToExhaustion).toBeCloseTo(25.03, 1);
    expect(result.provisional).toBe(true);
  });

  it("uses zero-spend days in the seven-day average and handles a depleted budget", () => {
    const result = calculateSpendRunRate({
      periodStart: "2026-11-22",
      periodEnd: "2026-11-28",
      today: "2026-11-28",
      limitUsd: 10,
      spentUsd: 10,
      dailySpend: [{ day: "2026-11-28", spendUsd: 2 }],
    });

    expect(result.daysRemaining).toBe(1);
    expect(result.requiredDailyUsd).toBe(0);
    expect(result.last7DayAverageUsd).toBeCloseTo(2 / 7, 5);
    expect(result.projectedTotalUsd).toBe(10);
    expect(result.projectedOverageUsd).toBe(0);
    expect(result.provisional).toBe(true);
  });
});
