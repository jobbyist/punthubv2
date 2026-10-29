import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Redemption = Tables<"redemptions"> & { reward: { title: string; kind: string } | null };

export async function fetchRewardsStatus(): Promise<{ points: boolean; rewards: boolean }> {
  const { data } = await supabase.rpc("rewards_status");
  const row = data?.[0];
  return { points: !!row?.points_enabled, rewards: !!row?.rewards_enabled };
}

export async function fetchBalance(): Promise<number> {
  const { data, error } = await supabase.rpc("my_puntpoints");
  if (error) throw error;
  return data ?? 0;
}

export async function fetchRules() {
  const { data, error } = await supabase.rpc("point_rules_public");
  if (error) throw error;
  return data ?? [];
}

export async function fetchRewards() {
  const { data, error } = await supabase.rpc("list_rewards");
  if (error) throw error;
  return data ?? [];
}

export async function fetchHistory(limit = 20) {
  const { data, error } = await supabase
    .from("puntpoints_ledger")
    .select("id, kind, rule_code, points, reason, created_at")
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchRedemptions(): Promise<Redemption[]> {
  const { data, error } = await supabase
    .from("redemptions")
    .select("*, reward:rewards(title, kind)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as Redemption[];
}

export async function fetchReferralOverview() {
  const { data } = await supabase.rpc("my_referral_overview");
  return (
    data?.[0] ?? {
      signed_up: 0,
      qualified: 0,
      pending: 0,
      vested: 0,
      reversed: 0,
      next_threshold: null,
      next_title: null,
    }
  );
}

export const POINTS_CHANGED = "puntr:points-changed";
export const notifyPointsChanged = () => window.dispatchEvent(new Event(POINTS_CHANGED));
