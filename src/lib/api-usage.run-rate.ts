export interface DailySpend {
  day: string;
  spendUsd: number;
}

export interface SpendRunRate {
  periodStart: string;
  periodEnd: string;
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  daysRemaining: number;
  observedDays: number;
  requiredDailyUsd: number;
  observedDailyUsd: number;
  last7DayAverageUsd: number;
  currentDaySpendUsd: number;
  projectedTotalUsd: number;
  projectedOverageUsd: number;
  daysToExhaustion: number | null;
  provisional: boolean;
}

const DAY_MS = 86_400_000;

function utcDay(value: string): number {
  return Date.parse(value.slice(0, 10) + "T00:00:00.000Z");
}

/** Calculate the remaining-period spend runway using UTC calendar days and observed usage. */
export function calculateSpendRunRate(input: {
  periodStart: string;
  periodEnd: string;
  today: string;
  limitUsd: number;
  spentUsd: number;
  dailySpend: DailySpend[];
}): SpendRunRate {
  const start = utcDay(input.periodStart);
  const end = utcDay(input.periodEnd);
  const today = utcDay(input.today);
  const daysRemaining = Math.max(0, Math.floor((end - today) / DAY_MS) + 1);
  const observedDays = Math.max(0, Math.floor((today - start) / DAY_MS) + 1);
  const remainingUsd = Math.max(0, input.limitUsd - input.spentUsd);
  const requiredDailyUsd = daysRemaining > 0 ? remainingUsd / daysRemaining : 0;
  const observedDailyUsd = observedDays > 0 ? input.spentUsd / observedDays : 0;
  const rateWindowDays = Math.min(7, observedDays);
  const rateWindowStart = today - Math.max(0, rateWindowDays - 1) * DAY_MS;
  const last7Spend = input.dailySpend
    .filter((row) => utcDay(row.day) >= rateWindowStart && utcDay(row.day) <= today)
    .reduce((sum, row) => sum + row.spendUsd, 0);
  const last7DayAverageUsd = rateWindowDays > 0 ? last7Spend / rateWindowDays : 0;
  const currentDaySpendUsd =
    input.dailySpend.find((row) => row.day.slice(0, 10) === input.today.slice(0, 10))?.spendUsd ?? 0;
  const projectedTotalUsd =
    observedDays > 0
      ? input.spentUsd + observedDailyUsd * Math.max(0, daysRemaining - 1)
      : input.spentUsd;

  return {
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    limitUsd: input.limitUsd,
    spentUsd: input.spentUsd,
    remainingUsd,
    daysRemaining,
    observedDays,
    requiredDailyUsd,
    observedDailyUsd,
    last7DayAverageUsd,
    currentDaySpendUsd,
    projectedTotalUsd,
    projectedOverageUsd: Math.max(0, projectedTotalUsd - input.limitUsd),
    daysToExhaustion: observedDailyUsd > 0 ? remainingUsd / observedDailyUsd : null,
    provisional: observedDays < 7,
  };
}
