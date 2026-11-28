import { supabase } from "@/integrations/supabase/client";

/**
 * Tipster Support (migration 20261128310000_tipster_support.sql).
 *
 * The RPCs below are not in the generated Supabase types until the migration is applied and types.ts is
 * regenerated, so they go through `rpc()` here. Every reader treats "function does not exist" as "feature not
 * live yet" and the UI hides itself, so this ships safely before the migration runs.
 */

export type SupportPlan = "pick" | "week" | "month";
export type SupportStatus = "active" | "paused" | "cancelled" | "expired" | "ended";
export type TipsterStatus = "qualified" | "active" | "paused" | "revoked";
export type StreakMark = "W" | "L" | "S";

export const PLANS: readonly SupportPlan[] = ["pick", "week", "month"] as const;

export interface StreakProgress {
  streak: number;
  target: number;
  window_days: number;
  min_odds: number;
  recent: StreakMark[];
}

export interface TipsterProfileRow {
  user_id: string;
  status: TipsterStatus;
  qualified_at: string;
  unlocked_at: string | null;
  streak_at_unlock: number | null;
  accepting: boolean;
  price_pick: number | null;
  price_week: number | null;
  price_month: number | null;
  pitch: string | null;
}

export interface SupportRow {
  id: string;
  tipster: string;
  avatar_url: string | null;
  plan: SupportPlan;
  price: number;
  status: SupportStatus;
  auto_renew: boolean;
  period_end: string | null;
  created_at: string;
  end_reason: string | null;
  copies: number;
}

export interface CopiedPick {
  prediction_id: string;
  tipster: string;
  market: string;
  selection: string;
  line: number | null;
  odds: number;
  confidence: number;
  reasoning: string | null;
  result: "won" | "lost" | "void" | "push" | null;
  note: string | null;
  copied_at: string;
  fixture: {
    id: string;
    home: string;
    away: string;
    competition: string;
    kickoff_at: string;
    status: string;
    home_score: number | null;
    away_score: number | null;
  };
}

export interface EarningRow {
  id: string;
  supporter: string;
  kind: "pick" | "period";
  amount: number;
  fee: number;
  status: "held" | "paid" | "refunded";
  created_at: string;
}

export interface OpenPick {
  prediction_id: string;
  home: string;
  away: string;
  market: string;
  selection: string;
  kickoff_at: string;
  has_note: boolean;
}

export interface MyTipsterSupport {
  enabled: boolean;
  progress: StreakProgress;
  verified: boolean;
  is_pro: boolean;
  transferable: number;
  spent_30d: number;
  limits: {
    support_limit: number;
    support_limit_pro: number;
    fee_pct: number;
    fee_pct_free: number;
    fee_pct_pro: number;
    spend_cap: number;
    price_pick: [number, number];
    price_week: [number, number];
    price_month: [number, number];
  };
  tipster: TipsterProfileRow | null;
  supporting: SupportRow[];
  copies: CopiedPick[];
  earnings: {
    supporters: number;
    held: number;
    paid_7d: number;
    paid_30d: number;
    paid_all: number;
    refunded_30d: number;
    by_plan: Partial<Record<SupportPlan, number>>;
    recent: EarningRow[];
  };
  open_picks: OpenPick[];
}

export interface TipsterCard {
  available: boolean;
  username: string;
  accepting?: boolean;
  price_pick?: number | null;
  price_week?: number | null;
  price_month?: number | null;
  pitch?: string | null;
  unlocked_at?: string | null;
  supporters?: number;
  mine?: {
    id: string;
    plan: SupportPlan;
    price: number;
    status: SupportStatus;
    auto_renew: boolean;
    period_end: string | null;
  } | null;
}

export interface TopTipster {
  username: string;
  avatar_url: string | null;
  founding_number: number | null;
  price_pick: number | null;
  price_week: number | null;
  price_month: number | null;
  pitch: string | null;
  supporters: number;
  settled: number;
  win_rate: number | null;
  form_last_10: string;
}

/** Error codes raised by the database functions; each has a translation under tipster:errors. */
export const ERROR_CODES = [
  "not_authenticated",
  "not_launched",
  "support_paused",
  "invalid_plan",
  "tipster_not_found",
  "self_support",
  "tipster_unavailable",
  "already_supporting",
  "support_limit",
  "account_too_new",
  "spend_cap",
  "insufficient_transferable",
  "support_unavailable",
  "not_unlocked",
  "pitch_too_long",
  "invalid_price",
  "no_price",
  "invalid_note",
  "not_your_pick",
  "kickoff_passed",
  "note_exists",
  "banned",
  "suspended",
  "limited",
  "age_not_attested",
  "ai_participant_restricted",
] as const;

export type TipsterErrorCode = (typeof ERROR_CODES)[number];

/** Maps a database error message onto a translation key under tipster:errors. */
export function tipsterErrorKey(message: string | null | undefined): string {
  const code = (message ?? "").trim();
  return (ERROR_CODES as readonly string[]).includes(code) ? `errors.${code}` : "errors.generic";
}

/** True when PostgREST says the function or table is missing: the migration has not been applied yet. */
export function isNotLive(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "PGRST202" || error.code === "42883" || error.code === "PGRST205") return true;
  return /could not find the function|does not exist/i.test(error.message ?? "");
}

/** 0-1 share of the streak target, for the progress ring. */
export function streakShare(p: Pick<StreakProgress, "streak" | "target">): number {
  if (!p.target || p.target <= 0) return 0;
  return Math.max(0, Math.min(1, p.streak / p.target));
}

/** Wins still needed to unlock. */
export function winsToGo(p: Pick<StreakProgress, "streak" | "target">): number {
  return Math.max(0, p.target - p.streak);
}

/** Where the member stands, which decides the copy and the call to action on the nudge. */
export type UnlockStage = "building" | "close" | "verify" | "pending" | "unlocked" | "paused";

export function unlockStage(
  data: Pick<MyTipsterSupport, "progress" | "verified" | "tipster">,
): UnlockStage {
  const status = data.tipster?.status;
  if (status === "active") return "unlocked";
  if (status === "paused" || status === "revoked") return "paused";
  // Streak met but the database has not unlocked yet: either ID verification is missing, or the account is not
  // in good standing / the unlock runs at the next settled pick. Only an `active` row is unlocked.
  if (status === "qualified" || data.progress.streak >= data.progress.target) {
    return data.verified ? "pending" : "verify";
  }
  return winsToGo(data.progress) <= 3 ? "close" : "building";
}

/** The plans a tipster offers, cheapest commitment first. */
export function offeredPlans(card: Pick<TipsterCard, "price_pick" | "price_week" | "price_month">) {
  return PLANS.flatMap((plan) => {
    const price = card[`price_${plan}` as const];
    return typeof price === "number" && price > 0 ? [{ plan, price }] : [];
  });
}

/** What the tipster receives from a charge after the platform fee (which is removed from circulation). */
export function netOfFee(amount: number, feePct: number): number {
  const fee = Math.floor((amount * Math.max(0, Math.min(100, feePct))) / 100);
  return Math.max(0, amount - fee);
}

/** Validates a price against [min, max]; empty means "plan not offered". */
export function priceError(value: string, range: [number, number]): "invalid" | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < range[0] || n > range[1]) return "invalid";
  return null;
}

type RpcResult = { data: unknown; error: { code?: string; message: string } | null };
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => PromiseLike<RpcResult>;

/** null = feature not live yet (migration not applied). */
export async function fetchMyTipsterSupport(): Promise<MyTipsterSupport | null> {
  const { data, error } = await rpc("my_tipster_support");
  if (isNotLive(error)) return null;
  if (error) throw new Error(error.message);
  return data as MyTipsterSupport;
}

export async function fetchTipsterCard(username: string): Promise<TipsterCard | null> {
  const { data, error } = await rpc("tipster_support_card", { p_username: username });
  if (isNotLive(error)) return null;
  if (error) throw new Error(error.message);
  return (data as TipsterCard | null) ?? null;
}

export async function fetchTopTipsters(limit = 12): Promise<TopTipster[] | null> {
  const { data, error } = await rpc("top_supported_tipsters", { p_limit: limit });
  if (isNotLive(error)) return null;
  if (error) throw new Error(error.message);
  return (data as TopTipster[] | null) ?? [];
}

export async function supportTipster(username: string, plan: SupportPlan, autoRenew: boolean) {
  const { data, error } = await rpc("support_tipster", {
    p_username: username,
    p_plan: plan,
    p_auto_renew: autoRenew,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function setTipsterSupport(subscriptionId: string, on: boolean) {
  const { data, error } = await rpc("set_tipster_support", {
    p_subscription: subscriptionId,
    p_on: on,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function updateTipsterSettings(input: {
  accepting: boolean;
  pricePick: number | null;
  priceWeek: number | null;
  priceMonth: number | null;
  pitch: string | null;
}) {
  const { data, error } = await rpc("update_tipster_settings", {
    p_accepting: input.accepting,
    p_price_pick: input.pricePick,
    p_price_week: input.priceWeek,
    p_price_month: input.priceMonth,
    p_pitch: input.pitch,
  });
  if (error) throw new Error(error.message);
  return data as TipsterProfileRow;
}

export async function addTipsterNote(predictionId: string, note: string) {
  const { error } = await rpc("add_tipster_note", { p_prediction: predictionId, p_note: note });
  if (error) throw new Error(error.message);
}
