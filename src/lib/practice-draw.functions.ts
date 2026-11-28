import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Three R500 OTT vouchers; entries close at the end of December 2026 (South African time). */
export const DRAW_CLOSES_AT = "2026-12-31T23:59:59+02:00";
export const DRAW_WINNER_COUNT = 3;

export type DrawEntry = {
  user_id: string;
  username: string;
  founding_number: number;
  email: string;
  phone: string | null;
  practice_picks: number;
  entered_at: string;
};

export type DrawLogRow = {
  id: string;
  draw_group_id: string;
  winner_rank: number;
  drawn_at: string;
  witness: string;
  entries: number;
  winner_username: string | null;
  winner_founding_number: number | null;
  note: string | null;
};

export type DrawOverview = {
  closesAt: string;
  closed: boolean;
  entries: DrawEntry[];
  log: DrawLogRow[];
};

/** Both functions re-check the admin role on the server; the draw functions in the database are service-role only. */
async function requireAdmin(context: {
  supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: boolean | null }> };
}) {
  const { data: isAdmin } = await context.supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Admins only");
}

/** Admin: opted-in Founding Members with an active Pro entitlement and at least one practice pick, plus past draw results. */
export const getDrawOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DrawOverview> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entries, error } = await supabaseAdmin.rpc("admin_practice_draw_entries");
    if (error) throw new Error(error.message);
    const { data: logData, error: logError } = await supabaseAdmin
      .from("practice_draw_log")
      .select("*")
      .order("drawn_at", { ascending: false })
      .limit(20);
    if (logError) throw new Error(logError.message);
    const log = (logData ?? []) as unknown as Array<{
      id: string;
      draw_group_id: string;
      winner_rank: number;
      drawn_at: string;
      witness: string;
      entries: number;
      winner_user_id: string | null;
      winner_founding_number: number | null;
      note: string | null;
    }>;
    const ids = log.flatMap((l) => (l.winner_user_id ? [l.winner_user_id] : []));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      if (profilesError) throw new Error(profilesError.message);
      for (const p of profiles ?? []) names.set(p.id, String(p.username));
    }
    return {
      closesAt: DRAW_CLOSES_AT,
      closed: Date.now() >= new Date(DRAW_CLOSES_AT).getTime(),
      entries: (entries ?? []) as DrawEntry[],
      log: log.map((l) => ({
        id: l.id,
        draw_group_id: l.draw_group_id,
        winner_rank: l.winner_rank,
        drawn_at: l.drawn_at,
        witness: l.witness,
        entries: l.entries,
        winner_username: l.winner_user_id ? (names.get(l.winner_user_id) ?? null) : null,
        winner_founding_number: l.winner_founding_number,
        note: l.note,
      })),
    };
  });

export type DrawWinner = {
  rank: number;
  user_id: string;
  username: string;
  founding_number: number;
  email: string;
  phone: string | null;
};

export type DrawResult =
  | {
      ok: true;
      draw_group_id: string;
      entries: number;
      drawn_at: string;
      winners: DrawWinner[];
    }
  | { ok: false; error: "not_closed" | "no_entries" | "not_enough_entries" | "already_drawn" | "witness_required" | "failed" };

/** Admin: select three distinct eligible Pro members at random and record the draw as one group. */
export const runPracticeDraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        witness: z.string().trim().min(2).max(120),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<DrawResult> => {
    await requireAdmin(context);
    if (Date.now() < new Date(DRAW_CLOSES_AT).getTime()) return { ok: false, error: "not_closed" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("admin_practice_draw_run", {
      p_witness: data.witness,
      ...(data.note ? { p_note: data.note } : {}),
    });
    if (error) {
      if (error.message.includes("no_entries")) return { ok: false, error: "no_entries" };
      if (error.message.includes("not_enough_entries")) return { ok: false, error: "not_enough_entries" };
      if (error.message.includes("already_drawn")) return { ok: false, error: "already_drawn" };
      if (error.message.includes("not_closed")) return { ok: false, error: "not_closed" };
      if (error.message.includes("witness_required")) return { ok: false, error: "witness_required" };
      console.error("practice draw failed", error.message);
      return { ok: false, error: "failed" };
    }
    const winners = (rows ?? []) as unknown as Array<{
      winner_rank: number;
      winner_user_id: string;
      winner_username: string;
      winner_founding_number: number;
      winner_email: string;
      winner_phone: string | null;
      entries: number;
      drawn_at: string;
      draw_group_id: string;
    }>;
    if (winners.length !== DRAW_WINNER_COUNT) return { ok: false, error: "failed" };
    const first = winners[0]!;
    return {
      ok: true,
      draw_group_id: first.draw_group_id,
      entries: first.entries,
      drawn_at: first.drawn_at,
      winners: winners
        .sort((a, b) => a.winner_rank - b.winner_rank)
        .map((winner) => ({
          rank: winner.winner_rank,
          user_id: winner.winner_user_id,
          username: winner.winner_username,
          founding_number: winner.winner_founding_number,
          email: winner.winner_email,
          phone: winner.winner_phone || null,
        })),
    };
  });
