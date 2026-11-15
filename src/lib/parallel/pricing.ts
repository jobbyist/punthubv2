/**
 * Parallel prices and provider keys (docs.parallel.ai/getting-started/pricing, checked 15 Nov 2026).
 *
 * The same prices are seeded in `api_unit_prices` (migration 20261115010000), which is what the database budget
 * guard uses. This copy is for estimates in code and tests; a test keeps the two keys in step with the plan in
 * docs/PARALLEL_ARCHITECTURE.md.
 */

export type TaskProcessor = "lite" | "base" | "core" | "pro";
export type ChatEffort = "low" | "medium";
export type MonitorProcessor = "lite" | "base";

/** USD per unit (one request, one URL, one task run or one monitor execution). */
export const PARALLEL_UNIT_PRICES_USD: Readonly<Record<string, number>> = {
  parallel: 0.001, // Search, fast mode (10 results)
  "parallel-extract": 0.001, // per URL
  "parallel-task:lite": 0.005,
  "parallel-task:base": 0.01,
  "parallel-task:core": 0.025,
  "parallel-task:pro": 0.1,
  "parallel-chat:low": 0.01,
  "parallel-chat:medium": 0.05,
  "parallel-monitor:lite": 0.003,
  "parallel-monitor:base": 0.01,
};

export const taskProvider = (p: TaskProcessor) => `parallel-task:${p}` as const;
export const chatProvider = (e: ChatEffort) => `parallel-chat:${e}` as const;
export const monitorProvider = (p: MonitorProcessor) => `parallel-monitor:${p}` as const;

/** Cost of `units` calls to `provider`, or null when the provider has no known price (callers must refuse). */
export function costUsd(provider: string, units = 1): number | null {
  const price = PARALLEL_UNIT_PRICES_USD[provider];
  if (price === undefined || !Number.isFinite(units) || units < 0) return null;
  return Math.round(price * units * 1_000_000) / 1_000_000;
}

/** Budget family a provider belongs to: `parallel-task:lite` and `parallel-extract` are both `parallel`. */
export function budgetFamily(provider: string): string {
  return provider.split(":")[0]!.split("-")[0]!;
}
