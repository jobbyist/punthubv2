import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ApiUsageSnapshot {
  limits: { provider: string; dailyCap: number; monthlyCap: number; note: string | null; updatedAt: string }[];
  budgets: { family: string; monthlyUsd: number; spentUsd: number; note: string | null }[];
  spendLimits: { family: string; periodStart: string; periodEnd: string; limitUsd: number; note: string | null }[];
  prices: { provider: string; usdPerUnit: number; note: string | null }[];
  today: { provider: string; calls: number; errors: number; refused: number }[];
  last7Days: { provider: string; feature: string; calls: number; estimatedUsd: number; lastCall: string }[];
  events: { id: number; provider: string; feature: string; consumer: string | null; operation: string | null; status: string; estimatedUsd: number | null; claimedAt: string; metadata: Record<string, unknown> }[];
  generatedAt: string;
}

export const adminApiUsage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ApiUsageSnapshot | null> => {
    const { data: allowed } = await context.supabase.rpc("is_admin");
    if (allowed !== true) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

    const [limits, budgets, spendLimits, prices, todayUsage, recentEvents, weeklyUsage] = await Promise.all([
      db.from("api_quota_limits").select("provider,daily_cap,monthly_cap,note,updated_at").order("provider"),
      db.from("api_budgets").select("family,monthly_usd,note").order("family"),
      db.from("api_spend_period_limits").select("family,period_start,period_end,limit_usd,note").order("family"),
      db.from("api_unit_prices").select("provider,usd_per_unit,note").order("provider"),
      db.from("content_api_usage").select("provider,calls,errors,refused").eq("day", today).order("provider"),
      db.from("api_call_events").select("id,provider,feature,consumer,operation,status,estimated_cost_usd,claimed_at,metadata").gte("claimed_at", sevenDaysAgo).order("claimed_at", { ascending: false }).limit(150),
      db.from("content_api_usage").select("provider,day,calls,errors,refused").gte("day", sevenDaysAgo.slice(0, 10)).order("day", { ascending: false }),
    ]);
    for (const result of [limits, budgets, spendLimits, prices, todayUsage, recentEvents, weeklyUsage]) {
      if (result.error) throw new Error("API usage data unavailable: " + result.error.message);
    }

    const budgetRows = (budgets.data ?? []) as { family: string; monthly_usd: number; note: string | null }[];
    const spent = await Promise.all(budgetRows.map(async (row) => {
      const { data, error } = await db.rpc("api_family_spend_usd", { p_family: row.family });
      if (error) throw new Error("API budget spend unavailable: " + error.message);
      return [row.family, Number(data ?? 0)] as const;
    }));
    const spentByFamily = new Map(spent);

    const priceByProvider = new Map(((prices.data ?? []) as { provider: string; usd_per_unit: number }[]).map((p) => [p.provider, Number(p.usd_per_unit)]));
    // Replace the provider-level roll-up with the feature-level claim ledger wherever attribution exists.
    const eventGroups = new Map<string, { provider: string; feature: string; calls: number; estimatedUsd: number; lastCall: string }>();
    for (const event of (recentEvents.data ?? []) as { provider: string; feature: string; estimated_cost_usd: number | null; claimed_at: string }[]) {
      const key = event.provider + "|" + event.feature;
      const current = eventGroups.get(key) ?? { provider: event.provider, feature: event.feature, calls: 0, estimatedUsd: 0, lastCall: event.claimed_at };
      current.calls += 1;
      current.estimatedUsd += Number(event.estimated_cost_usd ?? priceByProvider.get(event.provider) ?? 0);
      if (event.claimed_at > current.lastCall) current.lastCall = event.claimed_at;
      eventGroups.set(key, current);
    }

    return {
      limits: ((limits.data ?? []) as Record<string, unknown>[]).map((r) => ({
        provider: String(r["provider"]), dailyCap: Number(r["daily_cap"]), monthlyCap: Number(r["monthly_cap"]),
        note: (r["note"] as string | null) ?? null, updatedAt: String(r["updated_at"]),
      })),
      budgets: budgetRows.map((r) => ({ family: r.family, monthlyUsd: Number(r.monthly_usd), spentUsd: spentByFamily.get(r.family) ?? 0, note: r.note })),
      spendLimits: ((spendLimits.data ?? []) as Record<string, unknown>[]).map((r) => ({
        family: String(r["family"]), periodStart: String(r["period_start"]), periodEnd: String(r["period_end"]),
        limitUsd: Number(r["limit_usd"]), note: (r["note"] as string | null) ?? null,
      })),
      prices: ((prices.data ?? []) as Record<string, unknown>[]).map((r) => ({
        provider: String(r["provider"]), usdPerUnit: Number(r["usd_per_unit"]), note: (r["note"] as string | null) ?? null,
      })),
      today: ((todayUsage.data ?? []) as Record<string, unknown>[]).map((r) => ({
        provider: String(r["provider"]), calls: Number(r["calls"]), errors: Number(r["errors"]), refused: Number(r["refused"]),
      })),
      last7Days: [...eventGroups.values()].sort((a, b) => b.calls - a.calls).slice(0, 50),
      events: ((recentEvents.data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: Number(r["id"]), provider: String(r["provider"]), feature: String(r["feature"]),
        consumer: (r["consumer"] as string | null) ?? null, operation: (r["operation"] as string | null) ?? null,
        status: String(r["status"] ?? "claimed"), estimatedUsd: r["estimated_cost_usd"] == null ? null : Number(r["estimated_cost_usd"]),
        claimedAt: String(r["claimed_at"]), metadata: (r["metadata"] as Record<string, unknown>) ?? {},
      })),
      generatedAt: now.toISOString(),
    };
  });
