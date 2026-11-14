import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

import type { SlipDraft, SlipMarket, SlipSource } from "./parse";

const db = supabase as unknown as SupabaseClient;

export const IMAGE_DAYS = 30;

export interface SlipLegView {
  position: number;
  fixture_id: string | null;
  home: string | null;
  away: string | null;
  competition: string | null;
  market: SlipMarket | null;
  selection: string | null;
  odds: number | null;
  raw_market: string | null;
  raw_selection: string | null;
  prediction_id: string | null;
  result: string | null;
}

export interface SlipView {
  id: string;
  status: "draft" | "published" | "deleted";
  source: SlipSource;
  bet_type: string;
  bookmaker: string | null;
  stake: number | null;
  potential_return: number | null;
  total_odds: number | null;
  show_stake: boolean;
  note: string | null;
  created_at: string;
  published_at: string | null;
  mine: boolean;
  username: string | null;
  result: "won" | "lost" | "pending" | "partial" | "void";
  legs: SlipLegView[];
}

export async function fetchSlips(scope: "community" | "mine", limit = 30): Promise<SlipView[]> {
  const { data, error } = await db.rpc("slips_feed", { p_scope: scope, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as SlipView[];
}

export async function fetchSlip(id: string): Promise<SlipView | null> {
  const { data, error } = await db.rpc("slip_detail", { p_slip: id });
  if (error) throw error;
  return (data ?? null) as SlipView | null;
}

export interface SaveOptions {
  userId: string;
  source: SlipSource;
  showStake: boolean;
  note: string;
  image: Blob | null;
}

/** Saves a reviewed draft (slip, legs, optional image). Returns the slip id. Nothing is public until published. */
export async function saveSlipDraft(draft: SlipDraft, o: SaveOptions): Promise<string> {
  let imagePath: string | null = null;
  if (o.image) {
    imagePath = `${o.userId}/${crypto.randomUUID()}.webp`;
    const up = await db.storage.from("slips").upload(imagePath, o.image, {
      contentType: "image/webp",
      upsert: false,
    });
    if (up.error) throw up.error;
  }
  const { data, error } = await db
    .from("bet_slips")
    .insert({
      user_id: o.userId,
      source: o.source,
      bookmaker: draft.bookmaker,
      bet_type: draft.legs.length > 1 ? "multi" : "single",
      stake: draft.stake,
      total_odds: draft.totalOdds,
      potential_return: draft.potentialReturn,
      show_stake: o.showStake,
      note: o.note.trim() || null,
      image_path: imagePath,
      image_expires_at: imagePath
        ? new Date(Date.now() + IMAGE_DAYS * 86400_000).toISOString()
        : null,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (imagePath) await db.storage.from("slips").remove([imagePath]);
    throw error ?? new Error("save_failed");
  }
  const id = (data as { id: string }).id;
  const legs = draft.legs.map((l, i) => ({
    slip_id: id,
    position: i + 1,
    fixture_id: l.fixtureId ?? null,
    home: l.home.slice(0, 80),
    away: l.away.slice(0, 80),
    competition: l.competition?.slice(0, 80) ?? null,
    market: l.market,
    selection: l.market ? l.selection : null,
    odds: l.odds,
    raw_market: l.rawMarket?.slice(0, 120) ?? null,
    raw_selection: l.rawSelection?.slice(0, 120) ?? null,
  }));
  const { error: legErr } = await db.from("bet_slip_legs").insert(legs);
  if (legErr) {
    await db.from("bet_slips").update({ status: "deleted" }).eq("id", id);
    throw legErr;
  }
  return id;
}

export async function publishSlip(
  id: string,
  confidence = 3,
): Promise<{ picks: number; tracked_only: number }> {
  const { data, error } = await db.rpc("publish_slip", { p_slip: id, p_confidence: confidence });
  if (error) throw error;
  return data as { picks: number; tracked_only: number };
}

export async function deleteSlip(id: string): Promise<void> {
  const { error } = await db
    .from("bet_slips")
    .update({ status: "deleted", image_expires_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setShowStake(id: string, show: boolean): Promise<void> {
  const { error } = await db.from("bet_slips").update({ show_stake: show }).eq("id", id);
  if (error) throw error;
}

/** Signed URL for the owner's own slip image (private bucket). */
export async function slipImageUrl(path: string): Promise<string | null> {
  const { data } = await db.storage.from("slips").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

/** Maps a database or RPC error to an i18n key under "slips:errors". */
export function slipErrorKey(e: unknown): string {
  const msg =
    e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  for (const k of [
    "daily_limit",
    "slip_empty",
    "slip_unavailable",
    "slip_published",
    "bad_image_path",
    "kickoff_passed",
    "fixture_not_open",
    "not_launched",
    "age_not_attested",
    "posting_paused",
    "banned",
  ]) {
    if (msg.includes(k)) return k;
  }
  if (msg.includes("duplicate key")) return "duplicate";
  return "generic";
}
