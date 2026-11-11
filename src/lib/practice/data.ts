import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { PracticeOdds } from "@/lib/practice/simulator";

export type PracticeFixture = Omit<Tables<"practice_fixtures">, "odds"> & { odds: PracticeOdds };
export type PracticePick = Tables<"practice_predictions">;
export type PracticeReward = Tables<"practice_rewards">;

export async function fetchPracticeStatus(): Promise<{ enabled: boolean; founding: boolean }> {
  const { data } = await supabase.rpc("practice_status");
  const row = data?.[0];
  return { enabled: !!row?.enabled, founding: !!row?.is_founding };
}

export async function fetchSeason() {
  const { data, error } = await supabase
    .from("practice_seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchFixtures(seasonId: string): Promise<PracticeFixture[]> {
  const { data, error } = await supabase
    .from("practice_fixtures")
    .select("*")
    .eq("season_id", seasonId)
    .order("kickoff_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PracticeFixture[];
}

export async function fetchMyPicks(): Promise<PracticePick[]> {
  const { data, error } = await supabase
    .from("practice_predictions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function fetchCrowd(seasonId: string) {
  const { data, error } = await supabase.rpc("practice_crowd", { p_season: seasonId });
  if (error) throw error;
  return data ?? [];
}

export async function fetchLeaderboard() {
  const { data, error } = await supabase.rpc("practice_leaderboard", { p_limit: 20 });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPracticeBalance(): Promise<number> {
  const { data, error } = await supabase.rpc("practice_balance");
  if (error) throw error;
  return data ?? 0;
}

export async function fetchPracticeRewards(): Promise<PracticeReward[]> {
  const { data, error } = await supabase
    .from("practice_rewards")
    .select("*")
    .eq("active", true)
    .order("sort", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function postPracticePick(input: {
  fixture: string;
  market: string;
  selection: string;
  confidence: number;
}) {
  const { data, error } = await supabase.rpc("practice_post_pick", {
    p_fixture: input.fixture,
    p_market: input.market,
    p_selection: input.selection,
    p_confidence: input.confidence,
  });
  if (error) throw error;
  return data;
}

export async function redeemDemoReward(rewardId: string) {
  const { data, error } = await supabase.rpc("practice_redeem_demo", { p_reward: rewardId });
  if (error) throw error;
  return data;
}

/** The markets and selections a practice pick can use, with the odds key to read the price from. */
export const PRACTICE_MARKETS: {
  market: "1X2" | "DC" | "OU25" | "BTTS";
  selections: { value: string; priceKey: string }[];
}[] = [
  {
    market: "1X2",
    selections: [
      { value: "home", priceKey: "home" },
      { value: "draw", priceKey: "draw" },
      { value: "away", priceKey: "away" },
    ],
  },
  {
    market: "DC",
    selections: [
      { value: "1X", priceKey: "1X" },
      { value: "X2", priceKey: "X2" },
      { value: "12", priceKey: "12" },
    ],
  },
  {
    market: "OU25",
    selections: [
      { value: "over", priceKey: "over" },
      { value: "under", priceKey: "under" },
    ],
  },
  {
    market: "BTTS",
    selections: [
      { value: "yes", priceKey: "yes" },
      { value: "no", priceKey: "no" },
    ],
  },
];
