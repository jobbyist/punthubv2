export interface ProviderUsageRow {
  provider: string;
  calls: number;
  refused: number;
}

export interface ProviderQuotaRow {
  provider: string;
  daily_cap: number;
}

/** Refused claims count as attempts; they must not be retried as if quota were still available. */
export function mapProviderUsage(
  usage: readonly ProviderUsageRow[],
  quotas: readonly ProviderQuotaRow[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of usage) out[row.provider] = row.calls + row.refused;
  for (const row of quotas) out[`cap:${row.provider}`] = row.daily_cap;
  return out;
}

/** Translate provider usage into the model router's per-model attempt and daily-cap maps. */
export function modelQuotaOptions(
  models: readonly string[],
  usage: Record<string, number>,
  configuredCaps: Record<string, number> = {},
): { usedToday: Record<string, number>; dailyCap: Record<string, number> } {
  const usedToday: Record<string, number> = {};
  const dailyCap: Record<string, number> = {};
  for (const model of models) {
    const effort = /^parallel-(low|medium|high)$/.exec(model)?.[1];
    const provider = effort ? `parallel-chat:${effort}` : `gemini:${model}`;
    usedToday[model] = usage[provider] ?? 0;
    dailyCap[model] = usage[`cap:${provider}`] ?? configuredCaps[model] ?? 0;
  }
  return { usedToday, dailyCap };
}
