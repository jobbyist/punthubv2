import { supabase } from "@/integrations/supabase/client";

import type { DuelCall, DuelMarket, DuelStatus } from "./duels";

export interface DuelFixture {
  id: string;
  sport: string;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
}

export interface DuelVotes {
  challenger: number;
  opponent: number;
  mine: "challenger" | "opponent" | null;
}

export interface DuelSummary {
  id: string;
  status: DuelStatus;
  stake: number;
  markets: DuelMarket[];
  challenger: string;
  opponent: string | null;
  winner: string | null;
  challenger_correct: number | null;
  opponent_correct: number | null;
  fixture: DuelFixture;
  votes: DuelVotes;
  created_at: string;
}

export interface DuelPlayer {
  username: string;
  founding_number: number | null;
  avatar_url: string | null;
}

export interface DuelDetail extends Omit<DuelSummary, "challenger" | "opponent"> {
  message: string | null;
  accepted_at: string | null;
  settled_at: string | null;
  challenger: DuelPlayer;
  opponent: DuelPlayer | null;
  revealed: boolean;
  me: "challenger" | "opponent" | null;
  picks: {
    side: "challenger" | "opponent";
    market: DuelMarket;
    selection: string;
    correct: boolean | null;
  }[];
}

export interface DuelConfig {
  enabled: boolean;
  stakes_enabled: boolean;
  stake_min: number;
  stake_max: number;
  daily_cap: number;
  open_limit: number;
  min_account_days: number;
  mvp_open: boolean;
  transferable: number | null;
}

export interface DuelBoardRow {
  username: string;
  founding_number: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  xp: number;
  points_won: number;
}

export type DuelScope = "open" | "live" | "settled" | "mine";

export async function fetchDuels(scope: DuelScope, fixtureId?: string, limit = 30) {
  const { data, error } = await supabase.rpc("duels_feed", {
    p_scope: scope,
    p_fixture: fixtureId ?? null,
    p_limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as unknown as DuelSummary[];
}

export async function fetchDuel(id: string): Promise<DuelDetail | null> {
  const { data, error } = await supabase.rpc("duel_detail", { p_duel: id });
  if (error) throw error;
  return (data as unknown as DuelDetail | null) ?? null;
}

export async function fetchDuelConfig(): Promise<DuelConfig> {
  const { data, error } = await supabase.rpc("duel_config");
  if (error) throw error;
  return data as unknown as DuelConfig;
}

export async function fetchDuelBoard(days: number | null) {
  const { data, error } = await supabase.rpc("duel_leaderboard", { p_days: days, p_limit: 50 });
  if (error) throw error;
  return (data ?? []) as DuelBoardRow[];
}

export async function createDuel(input: {
  fixtureId: string;
  opponent: string | null;
  stake: number;
  calls: DuelCall[];
  message: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_duel", {
    p_fixture: input.fixtureId,
    p_opponent: input.opponent,
    p_stake: input.stake,
    p_picks: input.calls as unknown as never,
    ...(input.message ? { p_message: input.message } : {}),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function acceptDuel(id: string, calls: DuelCall[]) {
  const { error } = await supabase.rpc("accept_duel", {
    p_duel: id,
    p_picks: calls as unknown as never,
  });
  if (error) throw new Error(error.message);
}

export async function withdrawDuel(id: string) {
  const { data, error } = await supabase.rpc("withdraw_duel", { p_duel: id });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function voteDuel(id: string, side: "challenger" | "opponent"): Promise<DuelVotes> {
  const { data, error } = await supabase.rpc("vote_duel", { p_duel: id, p_side: side });
  if (error) throw new Error(error.message);
  return data as unknown as DuelVotes;
}
