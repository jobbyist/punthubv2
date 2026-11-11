import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** The draw closes when Puntr goes live. A draw cannot be run before this moment (Tue 1 Dec 2026, 00:00 SAST). */
export const DRAW_CLOSES_AT = "2026-12-01T00:00:00+02:00";

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

/** Admin: the eligible entries (Founding Member, at least one practice pick, draw box ticked) and past draws. */
export const getDrawOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DrawOverview> => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: entries, error } = await supabaseAdmin.rpc("admin_practice_draw_entries");
    if (error) throw new Error(error.message);
    const { data: log, error: logError } = await supabaseAdmin
      .from("practice_draw_log")
      .select("id, drawn_at, witness, entries, winner_user_id, winner_founding_number, note")
      .order("drawn_at", { ascending: false })
      .limit(20);
    if (logError) throw new Error(logError.message);
    const ids = (log ?? []).flatMap((l) => (l.winner_user_id ? [l.winner_user_id] : []));
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      for (const p of profiles ?? []) names.set(p.id, String(p.username));
    }
    return {
      closesAt: DRAW_CLOSES_AT,
      closed: Date.now() >= new Date(DRAW_CLOSES_AT).getTime(),
      entries: (entries ?? []) as DrawEntry[],
      log: (log ?? []).map((l) => ({
        id: l.id,
        drawn_at: l.drawn_at,
        witness: l.witness,
        entries: l.entries,
        winner_username: l.winner_user_id ? (names.get(l.winner_user_id) ?? null) : null,
        winner_founding_number: l.winner_founding_number,
        note: l.note,
      })),
    };
  });

export type DrawResult =
  | {
      ok: true;
      winner: {
        username: string;
        founding_number: number;
        email: string;
        phone: string | null;
        entries: number;
        drawn_at: string;
      };
    }
  | { ok: false; error: "not_closed" | "no_entries" | "witness_required" | "failed" };

/** Admin: pick one winner at random from the entries and record it with the witness. Only after the draw closes. */
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
      if (error.message.includes("witness_required"))
        return { ok: false, error: "witness_required" };
      console.error("practice draw failed", error.message);
      return { ok: false, error: "failed" };
    }
    const w = rows?.[0];
    if (!w) return { ok: false, error: "failed" };
    return {
      ok: true,
      winner: {
        username: w.winner_username,
        founding_number: w.winner_founding_number,
        email: w.winner_email,
        phone: w.winner_phone || null,
        entries: w.entries,
        drawn_at: w.drawn_at,
      },
    };
  });
