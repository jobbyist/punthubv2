/** Admin > Quests: review queue for social quests and totals. */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };

async function isAdmin(ctx: Ctx): Promise<boolean> {
  const { data } = await ctx.supabase.rpc("is_admin");
  return data === true;
}

export interface QuestReviewRow {
  userId: string;
  username: string;
  foundingNumber: number | null;
  quest: string;
  title: string;
  actionUrl: string | null;
  evidence: string;
  submittedAt: string;
}

export const adminQuestQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      rows: QuestReviewRow[];
      stats: { verified: number; waiting: number; points: number };
    } | null> => {
      const ctx = context as Ctx;
      if (!(await isAdmin(ctx))) return null;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as unknown as SupabaseClient;
      const [queue, quests, all] = await Promise.all([
        db
          .from("quest_progress")
          .select("user_id, quest_code, evidence, submitted_at")
          .eq("status", "submitted")
          .order("submitted_at", { ascending: true })
          .limit(200),
        db.from("quests").select("code, title, action_url"),
        db.from("quest_progress").select("status, points_awarded").limit(10000),
      ]);
      const q = (queue.data ?? []) as {
        user_id: string;
        quest_code: string;
        evidence: string;
        submitted_at: string;
      }[];
      const ids = [...new Set(q.map((r) => r.user_id))];
      const names = new Map<string, { username: string; founding_number: number | null }>();
      if (ids.length) {
        const { data } = await db
          .from("profiles")
          .select("id, username, founding_number")
          .in("id", ids);
        for (const p of (data ?? []) as {
          id: string;
          username: string;
          founding_number: number | null;
        }[])
          names.set(p.id, p);
      }
      const byCode = new Map(
        ((quests.data ?? []) as { code: string; title: string; action_url: string | null }[]).map(
          (x) => [x.code, x],
        ),
      );
      const rowsAll = (all.data ?? []) as { status: string; points_awarded: number }[];
      return {
        rows: q.map((r) => ({
          userId: r.user_id,
          username: names.get(r.user_id)?.username ?? "?",
          foundingNumber: names.get(r.user_id)?.founding_number ?? null,
          quest: r.quest_code,
          title: byCode.get(r.quest_code)?.title ?? r.quest_code,
          actionUrl: byCode.get(r.quest_code)?.action_url ?? null,
          evidence: r.evidence,
          submittedAt: r.submitted_at,
        })),
        stats: {
          verified: rowsAll.filter((r) => r.status === "verified").length,
          waiting: rowsAll.filter((r) => r.status === "submitted").length,
          points: rowsAll.reduce((n, r) => n + r.points_awarded, 0),
        },
      };
    },
  );

/** Approve or reject. Runs as the admin (the database function checks is_admin and writes the action log). */
export const adminQuestReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = (input ?? {}) as Record<string, unknown>;
    if (typeof o["userId"] !== "string" || !/^[0-9a-f-]{36}$/i.test(o["userId"]))
      throw new Error("bad user");
    if (typeof o["quest"] !== "string" || !/^[a-z][a-z0-9_]{2,40}$/.test(o["quest"]))
      throw new Error("bad quest");
    return {
      userId: o["userId"],
      quest: o["quest"],
      approve: o["approve"] === true,
      note: typeof o["note"] === "string" ? o["note"].slice(0, 300) : null,
    };
  })
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    if (!(await isAdmin(ctx))) return { ok: false as const, message: "forbidden" };
    const { data: points, error } = await ctx.supabase.rpc("admin_quest_review", {
      p_user: data.userId,
      p_code: data.quest,
      p_approve: data.approve,
      p_note: data.note,
    });
    if (error) return { ok: false as const, message: error.message };
    return { ok: true as const, points: typeof points === "number" ? points : 0 };
  });
