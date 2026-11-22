import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; code: "forbidden" | "invalid" | "not_found" | "error"; message?: string };
type Segment = "punter" | "tipster" | "hybrid" | "community_admin";
type Stage =
  | "new"
  | "engaged"
  | "contacted"
  | "replied"
  | "interested"
  | "link_sent"
  | "follow_up"
  | "registered"
  | "not_interested"
  | "do_not_contact";
type AmbassadorStage =
  | "not_approached"
  | "identified"
  | "approached"
  | "in_discussion"
  | "agreed"
  | "active"
  | "declined";

const SEGMENTS: Segment[] = ["punter", "tipster", "hybrid", "community_admin"];
const STAGES: Stage[] = [
  "new", "engaged", "contacted", "replied", "interested", "link_sent",
  "follow_up", "registered", "not_interested", "do_not_contact",
];
const AMBASSADOR_STAGES: AmbassadorStage[] = [
  "not_approached", "identified", "approached", "in_discussion", "agreed", "active", "declined",
];

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function logAdminAction(
  db: SupabaseClient,
  adminId: string,
  action: string,
  detail: Record<string, unknown>,
) {
  const { error } = await db.from("admin_actions").insert({
    admin_id: adminId,
    action,
    target: "founding_hq_leads",
    detail,
  });
  if (error) console.error("Founding HQ audit log failed", error.message);
}

const obj = (input: unknown) =>
  (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const valueTrimmed = value.trim();
  return valueTrimmed ? valueTrimmed.slice(0, max) : null;
};
const uuid = (value: unknown): string | null =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
const date = (value: unknown): string | null =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;

export interface FoundingHqLead {
  id: string;
  displayName: string;
  xHandle: string | null;
  profileUrl: string | null;
  segment: Segment;
  country: string;
  followerCount: number | null;
  source: string;
  stage: Stage;
  lastContactedOn: string | null;
  followUpOn: string | null;
  registered: boolean;
  isAmbassador: boolean;
  ambassadorStage: AmbassadorStage;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FoundingHqActivity {
  id: string;
  leadId: string;
  kind: string;
  body: string;
  createdAt: string;
}

export interface FoundingHqOverview {
  foundingMembers: number;
  target: number;
  leads: FoundingHqLead[];
  activities: FoundingHqActivity[];
}

export const adminFoundingHqOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FoundingHqOverview | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;

    const [leadResult, memberResult, activityResult] = await Promise.all([
      db.from("founding_hq_leads").select("*").order("created_at", { ascending: false }).limit(500),
      db.from("profiles").select("id", { count: "exact", head: true }).not("founding_number", "is", null),
      db
        .from("founding_hq_activities")
        .select("id, lead_id, kind, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (leadResult.error) throw new Error(leadResult.error.message);
    if (memberResult.error) throw new Error(memberResult.error.message);
    if (activityResult.error) throw new Error(activityResult.error.message);

    const leads = (leadResult.data ?? []).map((row): FoundingHqLead => ({
      id: row.id,
      displayName: row.display_name,
      xHandle: row.x_handle,
      profileUrl: row.profile_url,
      segment: row.segment,
      country: row.country,
      followerCount: row.follower_count === null ? null : Number(row.follower_count),
      source: row.source,
      stage: row.stage,
      lastContactedOn: row.last_contacted_on,
      followUpOn: row.follow_up_on,
      registered: row.registered,
      isAmbassador: row.is_ambassador,
      ambassadorStage: row.ambassador_stage,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return {
      foundingMembers: memberResult.count ?? 0,
      target: 100,
      leads,
      activities: (activityResult.data ?? []).map((row) => ({
        id: row.id,
        leadId: row.lead_id,
        kind: row.kind,
        body: row.body,
        createdAt: row.created_at,
      })),
    };
  });

export const adminSaveFoundingHqLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const displayName = text(o["displayName"], 120);
    if (!displayName || displayName.length < 2) throw new Error("A name or handle is required");
    const segment = typeof o["segment"] === "string" && SEGMENTS.includes(o["segment"] as Segment)
      ? (o["segment"] as Segment)
      : "punter";
    const stage = typeof o["stage"] === "string" && STAGES.includes(o["stage"] as Stage)
      ? (o["stage"] as Stage)
      : "new";
    const ambassadorStage =
      typeof o["ambassadorStage"] === "string" && AMBASSADOR_STAGES.includes(o["ambassadorStage"] as AmbassadorStage)
        ? (o["ambassadorStage"] as AmbassadorStage)
        : "not_approached";
    const followers =
      typeof o["followerCount"] === "number" && Number.isFinite(o["followerCount"])
        ? Math.max(0, Math.min(100_000_000, Math.floor(o["followerCount"])))
        : null;
    if (o["registered"] !== undefined && typeof o["registered"] !== "boolean") throw new Error("Invalid registration flag");
    if (o["isAmbassador"] !== undefined && typeof o["isAmbassador"] !== "boolean") throw new Error("Invalid ambassador flag");
    const id = o["id"] === undefined || o["id"] === null || o["id"] === "" ? null : uuid(o["id"]);
    if (o["id"] && !id) throw new Error("Invalid lead ID");
    return {
      id,
      displayName,
      xHandle: text(o["xHandle"], 80)?.replace(/^@/, "") ?? null,
      profileUrl: (() => {
        const url = text(o["profileUrl"], 500);
        if (url && !(url.startsWith("https://") || url.startsWith("http://"))) throw new Error("Invalid profile URL");
        return url;
      })(),
      segment,
      country: text(o["country"], 80) ?? "South Africa",
      followerCount: followers,
      source: text(o["source"], 80) ?? "X",
      stage,
      lastContactedOn: date(o["lastContactedOn"]),
      followUpOn: date(o["followUpOn"]),
      registered: o["registered"] === true || stage === "registered",
      isAmbassador: o["isAmbassador"] === true,
      ambassadorStage,
      notes: text(o["notes"], 4000),
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const row = {
      display_name: data.displayName,
      x_handle: data.xHandle,
      profile_url: data.profileUrl,
      segment: data.segment,
      country: data.country,
      follower_count: data.followerCount,
      source: data.source,
      stage: data.registered ? "registered" : data.stage,
      last_contacted_on: data.lastContactedOn,
      follow_up_on: data.followUpOn,
      registered: data.registered,
      is_ambassador: data.isAmbassador,
      ambassador_stage: data.ambassadorStage,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: saved, error } = await db
        .from("founding_hq_leads")
        .update(row)
        .eq("id", data.id)
        .select("id")
        .maybeSingle();
      if (error) return { ok: false, code: "error", message: error.message };
      if (!saved) return { ok: false, code: "not_found" };
      await logAdminAction(db, ctx.userId, "founding_hq.lead_updated", { leadId: data.id, stage: row.stage });
      return { ok: true, id: data.id };
    }

    const { data: saved, error } = await db
      .from("founding_hq_leads")
      .insert({ ...row, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) return { ok: false, code: "error", message: error.message };
    await logAdminAction(db, ctx.userId, "founding_hq.lead_created", { leadId: saved.id, stage: row.stage });
    return { ok: true, id: saved.id };
  });

export const adminDeleteFoundingHqLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const id = uuid(obj(input)["id"]);
    if (!id) throw new Error("Invalid lead ID");
    return { id };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error, count } = await db
      .from("founding_hq_leads")
      .delete({ count: "exact" })
      .eq("id", data.id);
    if (error) return { ok: false, code: "error", message: error.message };
    if (!count) return { ok: false, code: "not_found" };
    await logAdminAction(db, ctx.userId, "founding_hq.lead_deleted", { leadId: data.id });
    return { ok: true };
  });

export const adminAddFoundingHqActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const leadId = uuid(o["leadId"]);
    const body = text(o["body"], 2000);
    const kind = ["note", "reply", "meeting", "status", "referral", "other"].includes(String(o["kind"]))
      ? String(o["kind"])
      : "note";
    if (!leadId || !body) throw new Error("A lead and activity note are required");
    return { leadId, body, kind };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error } = await db.from("founding_hq_activities").insert({
      lead_id: data.leadId,
      body: data.body,
      kind: data.kind,
      created_by: ctx.userId,
    });
    if (error) return { ok: false, code: "error", message: error.message };
    await logAdminAction(db, ctx.userId, "founding_hq.activity_added", { leadId: data.leadId, kind: data.kind });
    return { ok: true };
  });
