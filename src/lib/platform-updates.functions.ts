import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
type Row = Record<string, unknown>;
type Fail = { ok: false; message: string };
const FORBIDDEN: Fail = { ok: false, message: "Admin only." };
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export interface PlatformUpdateRow {
  prNumber: number;
  title: string;
  summary: string;
  mergedAt: string;
  url: string;
}
export interface PlatformTask {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "planned" | "in_progress" | "blocked" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "critical";
  progress: number;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
export interface PlatformTaskEvent {
  id: number;
  taskId: string;
  eventType: string;
  detail: Record<string, unknown>;
  createdAt: string;
}
export interface PlatformUpdatesSnapshot {
  updates: PlatformUpdateRow[];
  tasks: PlatformTask[];
  events: PlatformTaskEvent[];
  generatedAt: string;
}

export const adminPlatformUpdatesOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUpdatesSnapshot | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const [updates, tasks, events] = await Promise.all([
      db.from("platform_updates").select("pr_number,title,summary,merged_at,url").order("merged_at", { ascending: false }).limit(1000),
      db.from("platform_implementation_tasks").select("*").order("sort_order").order("due_date", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }),
      db.from("platform_implementation_task_events").select("id,task_id,event_type,detail,created_at").order("created_at", { ascending: false }).limit(300),
    ]);
    for (const result of [updates, tasks, events]) {
      if (result.error) throw new Error("Platform updates data unavailable: " + result.error.message);
    }
    return {
      updates: ((updates.data ?? []) as Row[]).map((r) => ({
        prNumber: Number(r["pr_number"]), title: str(r["title"]), summary: str(r["summary"]),
        mergedAt: str(r["merged_at"]), url: str(r["url"]),
      })),
      tasks: ((tasks.data ?? []) as Row[]).map((r) => ({
        id: str(r["id"]), title: str(r["title"]), description: str(r["description"]),
        category: str(r["category"]), status: r["status"] as PlatformTask["status"],
        priority: r["priority"] as PlatformTask["priority"], progress: Number(r["progress"] ?? 0),
        dueDate: (r["due_date"] as string | null) ?? null, sortOrder: Number(r["sort_order"] ?? 0),
        createdAt: str(r["created_at"]), updatedAt: str(r["updated_at"]),
        completedAt: (r["completed_at"] as string | null) ?? null,
      })),
      events: ((events.data ?? []) as Row[]).map((r) => ({
        id: Number(r["id"]), taskId: str(r["task_id"]), eventType: str(r["event_type"]),
        detail: (r["detail"] as Record<string, unknown>) ?? {}, createdAt: str(r["created_at"]),
      })),
      generatedAt: new Date().toISOString(),
    };
  });

export interface SavePlatformTaskInput {
  id?: string;
  title: string;
  description: string;
  category: string;
  status: PlatformTask["status"];
  priority: PlatformTask["priority"];
  progress: number;
  dueDate: string;
  sortOrder: number;
}

export const adminSavePlatformTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as SavePlatformTaskInput)
  .handler(async ({ context, data }): Promise<{ ok: true; id: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return FORBIDDEN;
    const title = data.title.trim();
    if (title.length < 3 || title.length > 180) return { ok: false, message: "Title must be 3–180 characters." };
    if (data.description.length > 5000) return { ok: false, message: "Description must be 5,000 characters or fewer." };
    if (!["planned", "in_progress", "blocked", "completed", "cancelled"].includes(data.status)) return { ok: false, message: "Invalid status." };
    if (!["low", "medium", "high", "critical"].includes(data.priority)) return { ok: false, message: "Invalid priority." };
    const progress = Math.max(0, Math.min(100, Math.round(Number(data.progress))));
    if (!Number.isFinite(progress)) return { ok: false, message: "Progress must be between 0 and 100." };
    const dueDate = data.dueDate.trim();
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, message: "Use a valid target date." };
    const row = {
      title, description: data.description.trim(), category: data.category.trim().slice(0, 80) || "Platform",
      status: data.status, priority: data.priority, progress: data.status === "completed" ? 100 : progress,
      due_date: dueDate || null, sort_order: Number.isFinite(data.sortOrder) ? Math.round(data.sortOrder) : 0,
      updated_by: ctx.userId,
    };
    let id = data.id;
    let before: Row | null = null;
    if (id) {
      const { data: prev } = await db.from("platform_implementation_tasks").select("status,progress,title").eq("id", id).maybeSingle();
      before = (prev as Row | null) ?? null;
      const { error } = await db.from("platform_implementation_tasks").update(row).eq("id", id);
      if (error) return { ok: false, message: error.message };
    } else {
      const { data: inserted, error } = await db.from("platform_implementation_tasks")
        .insert({ ...row, created_by: ctx.userId }).select("id").single();
      if (error || !inserted) return { ok: false, message: error?.message ?? "Could not create task." };
      id = str((inserted as Row)["id"]);
    }
    await db.from("platform_implementation_task_events").insert({
      task_id: id, actor_id: ctx.userId, event_type: before ? "updated" : "created",
      detail: { before, after: { title, status: row.status, priority: row.priority, progress: row.progress, dueDate: row.due_date } },
    });
    await db.from("admin_actions").insert({
      admin_id: ctx.userId, action: before ? "platform_task.updated" : "platform_task.created",
      detail: { taskId: id, title, status: row.status, progress: row.progress },
    });
    return { ok: true, id: id! };
  });
