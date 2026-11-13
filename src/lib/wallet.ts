/**
 * Wallet: PuntPoints (loyalty, transferable between members within limits) and PAYG credits (premium features,
 * never transferable). All rules live in Postgres (migration 20261113170000); this file only reads and calls them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const db = supabase as unknown as SupabaseClient;

export interface WalletLimits {
  min: number;
  max: number;
  daily: number;
  monthly: number;
  minAccountDays: number;
  holdDays: number;
  sentToday: number;
  sentMonth: number;
}

export interface Wallet {
  mvpOpen: boolean;
  points: number;
  pointsTransferable: number;
  credits: number;
  accountType: string;
  limits: WalletLimits;
  prices: { feature: string; title: string; credits: number }[];
}

export interface WalletEntry {
  at: string;
  currency: "points" | "credits";
  kind: string;
  amount: number;
  description: string;
}

const n = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

export function parseWallet(raw: unknown): Wallet | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const l = (r["limits"] ?? {}) as Record<string, unknown>;
  return {
    mvpOpen: r["mvp_open"] === true,
    points: n(r["points"]),
    pointsTransferable: n(r["points_transferable"]),
    credits: n(r["credits"]),
    accountType: typeof r["account_type"] === "string" ? r["account_type"] : "free",
    limits: {
      min: n(l["min"]),
      max: n(l["max"]),
      daily: n(l["daily"]),
      monthly: n(l["monthly"]),
      minAccountDays: n(l["min_account_days"]),
      holdDays: n(l["hold_days"]),
      sentToday: n(l["sent_today"]),
      sentMonth: n(l["sent_month"]),
    },
    prices: Array.isArray(r["prices"]) ? (r["prices"] as Wallet["prices"]) : [],
  };
}

/** What a member can send right now: the smallest of the transfer cap, what is left today and this month, and the transferable balance. */
export function sendableNow(w: Wallet): number {
  return Math.max(
    0,
    Math.min(
      w.limits.max,
      w.limits.daily - w.limits.sentToday,
      w.limits.monthly - w.limits.sentMonth,
      w.pointsTransferable,
    ),
  );
}

export async function fetchWallet(): Promise<Wallet | null> {
  const { data, error } = await db.rpc("my_wallet");
  if (error) throw error;
  return parseWallet(data);
}

export async function fetchWalletHistory(limit = 50): Promise<WalletEntry[]> {
  const { data, error } = await db.rpc("my_wallet_history", { p_limit: limit, p_before: null });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    at: String(r["at"]),
    currency: r["currency"] === "credits" ? "credits" : "points",
    kind: String(r["kind"]),
    amount: n(r["amount"]),
    description: String(r["description"] ?? ""),
  }));
}

/** Known refusal codes from transfer_puntpoints, mapped to translation keys. */
export const TRANSFER_ERRORS = [
  "not_launched",
  "transfers_paused",
  "invalid_amount",
  "note_too_long",
  "banned",
  "suspended",
  "limited",
  "account_too_new",
  "recipient_not_found",
  "self_transfer",
  "recipient_unavailable",
  "daily_cap",
  "monthly_cap",
  "insufficient_transferable",
] as const;
export type TransferError = (typeof TRANSFER_ERRORS)[number] | "unknown";

export function transferErrorCode(message: string | undefined): TransferError {
  const m = (message ?? "").trim();
  return (TRANSFER_ERRORS as readonly string[]).includes(m) ? (m as TransferError) : "unknown";
}

export async function sendPoints(
  to: string,
  points: number,
  note: string,
): Promise<{ ok: true } | { ok: false; error: TransferError }> {
  const { error } = await db.rpc("transfer_puntpoints", {
    p_to_username: to.trim().replace(/^@/, "").toLowerCase(),
    p_points: points,
    p_note: note.trim() || null,
  });
  if (error) return { ok: false, error: transferErrorCode(error.message) };
  return { ok: true };
}

// Practice Mode demo wallet: separate tables, separate functions, no link to real credits or PuntPoints.
export interface DemoWallet {
  credits: number;
  points: number;
  history: { at: string; kind: string; credits: number; feature: string | null }[];
}

export async function fetchDemoWallet(): Promise<DemoWallet | null> {
  const { data, error } = await db.rpc("practice_demo_wallet");
  if (error) throw error;
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    credits: n(r["credits"]),
    points: n(r["points"]),
    history: Array.isArray(r["history"]) ? (r["history"] as DemoWallet["history"]) : [],
  };
}

export async function spendDemoCredits(
  feature: string,
  ref: string,
): Promise<{ ok: boolean; charged: number; error?: string }> {
  const { data, error } = await db.rpc("practice_spend_credits", {
    p_feature: feature,
    p_ref: ref,
  });
  if (error) return { ok: false, charged: 0, error: error.message };
  return { ok: true, charged: n((data as Record<string, unknown> | null)?.["charged"]) };
}
