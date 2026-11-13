/**
 * Admin > Notifications: compose and send in-app notifications (the header bell) by hand, schedule them, see how many
 * members have read them, and withdraw one. Every function re-checks is_admin() and logs to admin_actions.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  NOTIFICATION_CATEGORIES,
  parseNotificationInput,
  type NotificationInput,
} from "@/lib/admin-notifications";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; code: "forbidden" | "invalid" | "not_found" | "error"; message?: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export interface SentNotification {
  id: string;
  title: string;
  message: string;
  category: string | null;
  targetUrl: string | null;
  audience: "all" | "founding" | "member";
  recipient: string | null;
  publishedAt: string;
  scheduled: boolean;
  reads: number;
  sentBy: string | null;
}

export interface NotificationsOverview {
  items: SentNotification[];
  reach: { all: number; founding: number };
  categories: readonly string[];
}

export const adminNotificationsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationsOverview | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const [notes, all, founding] = await Promise.all([
      db
        .from("notifications")
        .select(
          "id, title, message, category, target_url, audience, recipient_id, published_at, created_by, newsroom_article_id",
        )
        .order("published_at", { ascending: false })
        .limit(60),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_banned", false)
        .not("username", "like", "deleted-%"),
      db
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("is_banned", false)
        .not("username", "like", "deleted-%")
        .not("founding_number", "is", null),
    ]);
    if (notes.error) throw new Error(notes.error.message);
    const rows = (notes.data ?? []) as Record<string, unknown>[];
    const ids = rows.map((r) => String(r["id"]));
    const reads = new Map<string, number>();
    if (ids.length > 0) {
      const { data: readRows } = await db
        .from("user_notifications")
        .select("notification_id")
        .in("notification_id", ids)
        .not("read_at", "is", null);
      for (const r of (readRows ?? []) as { notification_id: string }[])
        reads.set(r.notification_id, (reads.get(r.notification_id) ?? 0) + 1);
    }
    const people = [
      ...new Set(
        rows
          .flatMap((r) => [r["recipient_id"], r["created_by"]])
          .filter((v): v is string => typeof v === "string"),
      ),
    ];
    const names = new Map<string, string>();
    if (people.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, username").in("id", people);
      for (const p of (profiles ?? []) as { id: string; username: string }[])
        names.set(p.id, p.username);
    }
    const now = Date.now();
    return {
      reach: { all: all.count ?? 0, founding: founding.count ?? 0 },
      categories: NOTIFICATION_CATEGORIES,
      items: rows.map((r) => {
        const recipient = typeof r["recipient_id"] === "string" ? r["recipient_id"] : null;
        const by = typeof r["created_by"] === "string" ? r["created_by"] : null;
        return {
          id: String(r["id"]),
          title: String(r["title"]),
          message: String(r["message"]),
          category: (r["category"] as string | null) ?? null,
          targetUrl: (r["target_url"] as string | null) ?? null,
          audience: recipient ? "member" : r["audience"] === "founding" ? "founding" : "all",
          recipient: recipient ? (names.get(recipient) ?? "?") : null,
          publishedAt: String(r["published_at"]),
          scheduled: new Date(String(r["published_at"])).getTime() > now,
          reads: reads.get(String(r["id"])) ?? 0,
          sentBy: by ? (names.get(by) ?? null) : r["newsroom_article_id"] ? "newsroom" : null,
        };
      }),
    };
  });

export const adminSendNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown): NotificationInput => parseNotificationInput(input))
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };

    let recipientId: string | null = null;
    if (data.audience === "member") {
      const { data: profile } = await db
        .from("profiles")
        .select("id")
        .ilike("username", data.username ?? "")
        .not("username", "like", "deleted-%")
        .maybeSingle();
      if (!profile)
        return { ok: false, code: "not_found", message: "No member with that username" };
      recipientId = (profile as { id: string }).id;
    }

    const { data: row, error } = await db
      .from("notifications")
      .insert({
        title: data.title,
        message: data.message,
        category: data.category,
        target_url: data.targetUrl,
        audience: data.audience === "founding" ? "founding" : "all",
        recipient_id: recipientId,
        published_at: data.publishAt ?? new Date().toISOString(),
        created_by: ctx.userId,
      })
      .select("id")
      .single();
    if (error || !row)
      return { ok: false, code: "error", message: error?.message ?? "insert failed" };
    const id = (row as { id: string }).id;
    await db.from("admin_actions").insert({
      admin_id: ctx.userId,
      action: "notification.send",
      target_user: recipientId,
      target: data.username ?? data.audience,
      detail: { id, title: data.title, audience: data.audience, publishAt: data.publishAt },
    });
    return { ok: true, id };
  });

/** Withdraws a notification: it disappears from every bell. Newsroom notifications are withdrawn with their article. */
export const adminDeleteNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
    if (typeof o["id"] !== "string" || !/^[0-9a-f-]{36}$/i.test(o["id"]))
      throw new Error("invalid id");
    return { id: o["id"] };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { data: rows, error } = await db
      .from("notifications")
      .delete()
      .eq("id", data.id)
      .is("newsroom_article_id", null)
      .select("id, title");
    if (error) return { ok: false, code: "error", message: error.message };
    if (!rows || rows.length === 0)
      return { ok: false, code: "invalid", message: "Not found, or linked to a newsroom article" };
    await db.from("admin_actions").insert({
      admin_id: ctx.userId,
      action: "notification.delete",
      detail: { id: data.id, title: (rows[0] as { title: string }).title },
    });
    return { ok: true };
  });
