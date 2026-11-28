export interface ProviderUsageRow {
  provider: string;
  calls: number;
  refused: number;
}

export interface ProviderQuotaRow {
  provider: string;
  daily_cap: number;
}

/** Include quota refusals in attempts so a failed provider is not hammered again in the same run/day. */
export function mapProviderUsage(
  usage: readonly ProviderUsageRow[],
  quotas: readonly ProviderQuotaRow[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of usage) out[row.provider] = row.calls + row.refused;
  for (const row of quotas) out[`cap:${row.provider}`] = row.daily_cap;
  return out;
}

/** Translate API provider names into the model-router's per-model used/cap maps. */
export function modelQuotaOptions(
  models: readonly string[],
  usage: Record<string, number>,
): { usedToday: Record<string, number>; dailyCap: Record<string, number> } {
  const usedToday: Record<string, number> = {};
  const dailyCap: Record<string, number> = {};
  for (const model of models) {
    const effort = /^parallel-(low|medium|high)$/.exec(model)?.[1];
    if (!effort) {
      usedToday[model] = usage[model] ?? 0;
      continue;
    }
    const provider = `parallel-chat:${effort}`;
    usedToday[model] = usage[provider] ?? 0;
    dailyCap[model] = usage[`cap:${provider}`] ?? 0;
  }
  return { usedToday, dailyCap };
}
