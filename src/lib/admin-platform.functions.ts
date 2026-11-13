/**
 * Admin portal server functions (migration 20261113170000): members and account controls, action log, analytics,
 * API quotas, launch and wallet settings, scoring rules, system health.
 *
 * Every function checks is_admin() on the server and writes one admin_actions row for each change. The service-role
 * client is used only after that check.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
type Result<T = undefined> =
  { ok: true; data?: T } | { ok: false; code: "forbidden" | "invalid" | "error"; message?: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function logAction(
  db: SupabaseClient,
  adminId: string,
  action: string,
  targetUser: string | null,
  detail: Record<string, unknown> = {},
  target: string | null = null,
): Promise<void> {
  const { error } = await db
    .from("admin_actions")
    .insert({ admin_id: adminId, action, target_user: targetUser, target, detail });
  if (error) console.error("admin action log failed", action, error.message);
}

const obj = (input: unknown) =>
  (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const uuid = (v: unknown): string => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("invalid id");
  return v;
};
const text = (v: unknown, min: number, max: number): string => {
  if (typeof v !== "string") throw new Error("invalid text");
  const t = v.trim();
  if (t.length < min || t.length > max) throw new Error("invalid text length");
  return t;
};

// ---------------------------------------------------------------------------------------------------------------
// Members

export interface AdminMember {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  emailConfirmed: boolean;
  role: string;
  accountType: string;
  foundingNumber: number | null;
  isBanned: boolean;
  suspendedUntil: string | null;
  limitedUntil: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  marketingOptIn: boolean;
  entitlements: string[];
  openWarnings: number;
  points: number;
  credits: number;
  practicePicks: number;
}

/** Members list with search and filters. Emails come from Supabase Auth and are shown to admins only. */
export const adminListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const q =
      typeof o["query"] === "string"
        ? o["query"]
            .trim()
            .slice(0, 60)
            .replace(/[%_,()]/g, "")
        : "";
    const filter = ["all", "founding", "banned", "suspended", "admins"].includes(
      String(o["filter"]),
    )
      ? String(o["filter"])
      : "all";
    return { query: q, filter };
  })
  .handler(async ({ data, context }): Promise<AdminMember[] | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    let q = db
      .from("profiles")
      .select(
        "id, username, display_name, role, account_type, founding_number, is_banned, suspended_until, posting_paused_until, created_at, marketing_opt_in",
      )
      .not("username", "like", "deleted-%")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.query) q = q.or(`username.ilike.%${data.query}%,display_name.ilike.%${data.query}%`);
    if (data.filter === "founding") q = q.not("founding_number", "is", null);
    if (data.filter === "banned") q = q.eq("is_banned", true);
    if (data.filter === "suspended") q = q.gt("suspended_until", new Date().toISOString());
    if (data.filter === "admins") q = q.eq("role", "admin");
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const profiles = (rows ?? []) as Record<string, unknown>[];
    const ids = profiles.map((p) => String(p["id"]));
    if (ids.length === 0) return [];

    const [ents, warns, points, credits, practice, users] = await Promise.all([
      db
        .from("user_entitlements")
        .select("user_id, entitlement, expires_at, revoked_at")
        .in("user_id", ids),
      db.from("account_warnings").select("user_id").in("user_id", ids).is("acknowledged_at", null),
      db.from("puntpoints_ledger").select("user_id, points").in("user_id", ids),
      db.from("credit_ledger").select("user_id, credits").in("user_id", ids),
      db.from("practice_predictions").select("user_id").in("user_id", ids),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    const now = Date.now();
    const sum = (list: unknown, key: string, id: string) =>
      ((list as Record<string, unknown>[] | null) ?? [])
        .filter((r) => r["user_id"] === id)
        .reduce((a, r) => a + Number(r[key] ?? 0), 0);
    const authById = new Map((users.data?.users ?? []).map((u) => [u.id, u]));
    const future = (v: unknown) => (typeof v === "string" && Date.parse(v) > now ? v : null);

    return profiles.map((p) => {
      const id = String(p["id"]);
      const auth = authById.get(id);
      return {
        id,
        username: String(p["username"]),
        displayName: String(p["display_name"] ?? ""),
        email: auth?.email ?? null,
        emailConfirmed: Boolean(auth?.email_confirmed_at),
        role: String(p["role"]),
        accountType: String(p["account_type"] ?? "free"),
        foundingNumber: (p["founding_number"] as number | null) ?? null,
        isBanned: p["is_banned"] === true,
        suspendedUntil: future(p["suspended_until"]),
        limitedUntil: future(p["posting_paused_until"]),
        createdAt: String(p["created_at"]),
        lastSignInAt: auth?.last_sign_in_at ?? null,
        marketingOptIn: p["marketing_opt_in"] === true,
        entitlements: ((ents.data ?? []) as Record<string, unknown>[])
          .filter(
            (e) =>
              e["user_id"] === id &&
              !e["revoked_at"] &&
              (!e["expires_at"] || Date.parse(String(e["expires_at"])) > now),
          )
          .map((e) => String(e["entitlement"])),
        openWarnings: ((warns.data ?? []) as Record<string, unknown>[]).filter(
          (w) => w["user_id"] === id,
        ).length,
        points: sum(points.data, "points", id),
        credits: sum(credits.data, "credits", id),
        practicePicks: ((practice.data ?? []) as Record<string, unknown>[]).filter(
          (r) => r["user_id"] === id,
        ).length,
      };
    });
  });

type MemberAction =
  | { kind: "ban"; banned: boolean; reason: string }
  | { kind: "suspend"; days: number; reason: string }
  | { kind: "unsuspend"; reason: string }
  | { kind: "limit"; days: number; reason: string }
  | { kind: "unlimit"; reason: string }
  | { kind: "account_type"; accountType: "free" | "payg" | "pro"; reason: string }
  | {
      kind: "entitlement";
      entitlement: string;
      grant: boolean;
      days: number | null;
      reason: string;
    }
  | { kind: "warn"; reason: string; message: string; email: boolean }
  | { kind: "message"; subject: string; message: string; email: boolean; inApp: boolean }
  | { kind: "credits"; credits: number; reason: string };

function parseAction(raw: unknown): MemberAction {
  const o = obj(raw);
  const reason = typeof o["reason"] === "string" ? text(o["reason"], 3, 280) : "";
  const days = (v: unknown, max: number) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error("invalid days");
    return n;
  };
  switch (o["kind"]) {
    case "ban":
      if (typeof o["banned"] !== "boolean") throw new Error("invalid");
      return { kind: "ban", banned: o["banned"], reason: text(o["reason"], 3, 280) };
    case "suspend":
      return { kind: "suspend", days: days(o["days"], 365), reason: text(o["reason"], 3, 280) };
    case "unsuspend":
      return { kind: "unsuspend", reason };
    case "limit":
      return { kind: "limit", days: days(o["days"], 365), reason: text(o["reason"], 3, 280) };
    case "unlimit":
      return { kind: "unlimit", reason };
    case "account_type":
      if (!["free", "payg", "pro"].includes(String(o["accountType"]))) throw new Error("invalid");
      return {
        kind: "account_type",
        accountType: o["accountType"] as "free" | "payg" | "pro",
        reason: text(o["reason"], 3, 280),
      };
    case "entitlement":
      if (!["early_access", "pro", "tools", "beta_tester"].includes(String(o["entitlement"])))
        throw new Error("invalid");
      return {
        kind: "entitlement",
        entitlement: String(o["entitlement"]),
        grant: o["grant"] === true,
        days:
          o["days"] === null || o["days"] === undefined || o["days"] === ""
            ? null
            : days(o["days"], 366),
        reason: text(o["reason"], 3, 280),
      };
    case "warn":
      return {
        kind: "warn",
        reason: text(o["reason"], 3, 280),
        message: text(o["message"], 3, 1000),
        email: o["email"] === true,
      };
    case "message":
      return {
        kind: "message",
        subject: text(o["subject"], 3, 140),
        message: text(o["message"], 3, 2000),
        email: o["email"] === true,
        inApp: o["inApp"] !== false,
      };
    case "credits": {
      const c = Number(o["credits"]);
      if (!Number.isInteger(c) || c === 0 || Math.abs(c) > 1000) throw new Error("invalid credits");
      return { kind: "credits", credits: c, reason: text(o["reason"], 3, 280) };
    }
    default:
      throw new Error("invalid action");
  }
}

/** One account control on one member. Admin accounts cannot be banned, suspended or limited from here. */
export const adminMemberAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    return { userId: uuid(o["userId"]), action: parseAction(o["action"]) };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { data: target } = await db
      .from("profiles")
      .select("id, role, username")
      .eq("id", data.userId)
      .maybeSingle();
    if (!target) return { ok: false, code: "invalid", message: "member not found" };
    const a = data.action;
    const restrictive = ["ban", "suspend", "limit"].includes(a.kind);
    if (
      restrictive &&
      ((target as { role: string }).role === "admin" || data.userId === ctx.userId)
    )
      return { ok: false, code: "invalid", message: "admins cannot be restricted here" };

    const until = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    const update = async (values: Record<string, unknown>) => {
      const { error } = await db.from("profiles").update(values).eq("id", data.userId);
      if (error) throw new Error(error.message);
    };
    const notify = async (title: string, message: string) => {
      const { error } = await db.from("notifications").insert({
        title: title.slice(0, 140),
        message: message.slice(0, 400),
        category: "Account",
        target_url: "/account",
        recipient_id: data.userId,
      });
      if (error) throw new Error(error.message);
    };
    const queueEmail = async (subject: string, body: string, kind: string) => {
      const { error } = await db.from("email_outbox").insert({
        user_id: data.userId,
        kind,
        subject,
        body,
        priority: kind === "account_notice" ? 2 : 5,
        created_by: ctx.userId,
      });
      if (error) throw new Error(error.message);
    };

    try {
      switch (a.kind) {
        case "ban":
          await update({ is_banned: a.banned });
          break;
        case "suspend": {
          const suspendedUntil = until(a.days);
          await update({ suspended_until: suspendedUntil, suspension_reason: a.reason });
          await notify(
            "Your account is suspended",
            `Your account is suspended until ${suspendedUntil.slice(0, 10)}. Reason: ${a.reason}`,
          );
          break;
        }
        case "unsuspend":
          await update({ suspended_until: null, suspension_reason: null });
          break;
        case "limit": {
          const limitedUntil = until(a.days);
          await update({ posting_paused_until: limitedUntil });
          await notify(
            "Some features are paused",
            `Posting picks and sending PuntPoints are paused until ${limitedUntil.slice(0, 10)}. Reason: ${a.reason}`,
          );
          break;
        }
        case "unlimit":
          await update({ posting_paused_until: null });
          break;
        case "account_type":
          await update({ account_type: a.accountType });
          break;
        case "entitlement":
          if (a.grant) {
            const { error } = await db.from("user_entitlements").insert({
              user_id: data.userId,
              entitlement: a.entitlement,
              granted_by: ctx.userId,
              note: a.reason,
              expires_at: a.days ? until(a.days) : null,
            });
            if (error) throw new Error(error.message);
          } else {
            const { error } = await db
              .from("user_entitlements")
              .update({ revoked_at: new Date().toISOString() })
              .eq("user_id", data.userId)
              .eq("entitlement", a.entitlement)
              .is("revoked_at", null);
            if (error) throw new Error(error.message);
          }
          break;
        case "warn": {
          const { error } = await db.from("account_warnings").insert({
            user_id: data.userId,
            admin_id: ctx.userId,
            reason: a.reason,
            message: a.message,
          });
          if (error) throw new Error(error.message);
          await notify("A warning on your account", a.message);
          if (a.email)
            await queueEmail("A warning on your Puntr account", a.message, "account_notice");
          break;
        }
        case "message":
          if (a.inApp) await notify(a.subject, a.message);
          if (a.email) await queueEmail(a.subject, a.message, "admin_message");
          break;
        case "credits": {
          // Atomic in the database (balance check, ledger row and action log in one call),
          // through the admin's own session so the grant is attributed to them.
          const { error } = await ctx.supabase.rpc("admin_grant_credits", {
            p_user: data.userId,
            p_credits: a.credits,
            p_reason: a.reason,
          });
          if (error) {
            if (error.message.includes("would_go_negative"))
              return { ok: false, code: "invalid", message: "balance would go below zero" };
            throw new Error(error.message);
          }
          return { ok: true };
        }
      }
    } catch (error) {
      console.error("admin member action failed", a.kind, error);
      return {
        ok: false,
        code: "error",
        message: error instanceof Error ? error.message : "error",
      };
    }
    const { kind, ...detail } = a;
    await logAction(
      db,
      ctx.userId,
      `member.${kind}`,
      data.userId,
      detail,
      (target as { username: string }).username,
    );
    return { ok: true };
  });

/** Messages every member (in-app), optionally queued as emails that go out in batches within the daily cap. */
export const adminBroadcast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const audience = ["all", "founding", "marketing"].includes(String(o["audience"]))
      ? String(o["audience"])
      : "all";
    return {
      subject: text(o["subject"], 3, 140),
      message: text(o["message"], 3, 2000),
      email: o["email"] === true,
      audience,
    };
  })
  .handler(async ({ data, context }): Promise<Result<{ queued: number }>> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error } = await db.from("notifications").insert({
      title: data.subject,
      message: data.message.slice(0, 400),
      category: "Announcements",
    });
    if (error) return { ok: false, code: "error", message: error.message };
    let queued = 0;
    if (data.email) {
      let q = db
        .from("profiles")
        .select("id")
        .eq("is_banned", false)
        .not("username", "like", "deleted-%");
      if (data.audience === "founding") q = q.not("founding_number", "is", null);
      // Marketing emails only to members who opted in (POPIA). Service notices may go to everyone.
      if (data.audience === "marketing") q = q.eq("marketing_opt_in", true);
      const { data: members } = await q;
      const rows = ((members ?? []) as { id: string }[]).map((m) => ({
        user_id: m.id,
        kind: data.audience === "marketing" ? "marketing" : "service",
        subject: data.subject,
        body: data.message,
        priority: 6,
        created_by: ctx.userId,
      }));
      if (rows.length > 0) {
        const res = await db.from("email_outbox").insert(rows);
        if (res.error) return { ok: false, code: "error", message: res.error.message };
      }
      queued = rows.length;
    }
    await logAction(db, ctx.userId, "member.broadcast", null, { ...data, queued });
    return { ok: true, data: { queued } };
  });

// ---------------------------------------------------------------------------------------------------------------
// Action log, analytics, quotas, settings, scoring, health

export interface AdminActionRow {
  id: number;
  createdAt: string;
  admin: string | null;
  action: string;
  target: string | null;
  detail: JsonObject;
}

export const adminActionLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    return {
      action:
        typeof o["action"] === "string" ? o["action"].slice(0, 40).replace(/[^a-z0-9_.]/g, "") : "",
    };
  })
  .handler(async ({ data, context }): Promise<AdminActionRow[] | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    let q = db
      .from("admin_actions")
      .select("id, created_at, admin_id, action, target, target_user, detail")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.action) q = q.like("action", `${data.action}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as Record<string, unknown>[];
    const ids = [...new Set(list.map((r) => r["admin_id"]).filter(Boolean))] as string[];
    const { data: admins } = ids.length
      ? await db.from("profiles").select("id, username").in("id", ids)
      : { data: [] as { id: string; username: string }[] };
    const names = new Map(
      ((admins ?? []) as { id: string; username: string }[]).map((a) => [a.id, a.username]),
    );
    return list.map((r) => ({
      id: Number(r["id"]),
      createdAt: String(r["created_at"]),
      admin: names.get(String(r["admin_id"])) ?? null,
      action: String(r["action"]),
      target: (r["target"] as string | null) ?? null,
      detail: (r["detail"] as JsonObject) ?? {},
    }));
  });

export const adminAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const d = Number(obj(input)["days"]);
    return { days: [7, 30, 90].includes(d) ? d : 30 };
  })
  .handler(async ({ data, context }): Promise<JsonObject | null> => {
    const ctx = context as Ctx;
    const { data: ok } = await ctx.supabase.rpc("is_admin");
    if (ok !== true) return null;
    // admin_analytics re-checks is_admin(), so it runs with the admin's own session.
    const { data: result, error } = await ctx.supabase.rpc("admin_analytics", {
      p_days: data.days,
    });
    if (error) throw new Error(error.message);
    return result as JsonObject;
  });

export interface QuotaRow {
  provider: string;
  dailyCap: number;
  monthlyCap: number;
  today: number;
  month: number;
  errorsToday: number;
  refusedToday: number;
}

export interface SystemHealth {
  quotas: QuotaRow[];
  settings: Record<string, string>;
  scoring: { market: string; points: number }[];
  keys: Record<string, boolean>;
  sportsProvider: string;
  content: {
    enabled: boolean;
    autoPublish: boolean;
    minQuality: number;
    lastJob: JsonObject | null;
  };
  pfie: {
    competition: string;
    kind: string;
    startedAt: string;
    ok: boolean;
    error: string | null;
    accepted: number;
    rejected: number;
    published: number;
  }[];
  outbox: { queued: number; sentToday: number; failed: number };
  fixtures: { total: number; upcoming: number; pfie: number };
}

export const adminSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SystemHealth | null> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return null;
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const [
      quotas,
      settings,
      scoring,
      contentSettings,
      lastJob,
      runs,
      queued,
      sent,
      failed,
      fixtures,
      upcoming,
      pfieFixtures,
    ] = await Promise.all([
      db.rpc("api_quota_status"),
      db.from("app_settings").select("key, value"),
      db.from("scoring_rules").select("market, points").order("market"),
      db.from("content_settings").select("enabled, auto_publish, min_quality").maybeSingle(),
      db
        .from("content_generation_jobs")
        .select("job_key, kind, status, started_at, error, model")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("pfie_runs")
        .select(
          "competition, kind, started_at, ok, error, accepted_count, rejected_count, decisions",
        )
        .order("started_at", { ascending: false })
        .limit(12),
      db.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "queued"),
      db
        .from("email_outbox")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("sent_at", `${today}T00:00:00Z`),
      db.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "failed"),
      db.from("fixtures").select("id", { count: "exact", head: true }),
      db.from("fixtures").select("id", { count: "exact", head: true }).gte("kickoff_at", nowIso),
      db.from("fixtures").select("id", { count: "exact", head: true }).eq("provider", "pfie"),
    ]);
    const has = (k: string) => Boolean(process.env[k]?.trim());
    const cs = (contentSettings.data ?? {}) as Record<string, unknown>;
    return {
      quotas: ((quotas.data ?? []) as Record<string, number | string>[]).map((q) => ({
        provider: String(q["provider"]),
        dailyCap: Number(q["daily_cap"]),
        monthlyCap: Number(q["monthly_cap"]),
        today: Number(q["today"]),
        month: Number(q["month"]),
        errorsToday: Number(q["errors_today"]),
        refusedToday: Number(q["refused_today"]),
      })),
      settings: Object.fromEntries(
        ((settings.data ?? []) as { key: string; value: string }[]).map((s) => [s.key, s.value]),
      ),
      scoring: (scoring.data ?? []) as { market: string; points: number }[],
      keys: {
        GEMINI_API_KEY: has("GEMINI_API_KEY"),
        PARALLEL_API_KEY: has("PARALLEL_API_KEY"),
        FIRECRAWL_API_KEY: has("FIRECRAWL_API_KEY"),
        RESEND_API_KEY: has("RESEND_API_KEY"),
        CRON_SECRET: has("CRON_SECRET"),
        SPORTS_API_KEY: has("SPORTS_API_KEY"),
      },
      sportsProvider: process.env["SPORTS_PROVIDER"]?.trim() || "apisports",
      content: {
        enabled: cs["enabled"] === true,
        autoPublish: cs["auto_publish"] === true,
        minQuality: Number(cs["min_quality"] ?? 85),
        lastJob: (lastJob.data as JsonObject | null) ?? null,
      },
      pfie: ((runs.data ?? []) as Record<string, unknown>[]).map((r) => ({
        competition: String(r["competition"]),
        kind: String(r["kind"]),
        startedAt: String(r["started_at"]),
        ok: r["ok"] === true,
        error: (r["error"] as string | null) ?? null,
        accepted: Number(r["accepted_count"] ?? 0),
        rejected: Number(r["rejected_count"] ?? 0),
        published: ((r["decisions"] as { publish?: boolean }[] | null) ?? []).filter(
          (d) => d.publish,
        ).length,
      })),
      outbox: { queued: queued.count ?? 0, sentToday: sent.count ?? 0, failed: failed.count ?? 0 },
      fixtures: {
        total: fixtures.count ?? 0,
        upcoming: upcoming.count ?? 0,
        pfie: pfieFixtures.count ?? 0,
      },
    };
  });

const SETTING_KEYS = new Set([
  "launch_at",
  "transfer_enabled",
  "transfer_min_points",
  "transfer_max_points",
  "transfer_daily_cap",
  "transfer_monthly_cap",
  "transfer_min_account_days",
  "transfer_hold_days",
]);

export const adminUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const key = String(o["key"]);
    const value = text(o["value"], 1, 40);
    if (!SETTING_KEYS.has(key)) throw new Error("unknown setting");
    if (key === "launch_at" && Number.isNaN(Date.parse(value))) throw new Error("invalid date");
    if (key === "transfer_enabled" && !["true", "false"].includes(value))
      throw new Error("invalid");
    if (key.startsWith("transfer_") && key !== "transfer_enabled" && !/^\d{1,5}$/.test(value))
      throw new Error("invalid");
    return { key, value };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error } = await db.from("app_settings").upsert({
      key: data.key,
      value: data.value,
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    });
    if (error) return { ok: false, code: "error", message: error.message };
    await logAction(db, ctx.userId, "settings.update", null, data, data.key);
    return { ok: true };
  });

export const adminUpdateQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const daily = Number(o["dailyCap"]);
    const monthly = Number(o["monthlyCap"]);
    if (
      !Number.isInteger(daily) ||
      !Number.isInteger(monthly) ||
      daily < 0 ||
      monthly < 0 ||
      daily > 100000 ||
      monthly > 3000000
    )
      throw new Error("invalid caps");
    return { provider: text(o["provider"], 3, 60), dailyCap: daily, monthlyCap: monthly };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error } = await db
      .from("api_quota_limits")
      .update({
        daily_cap: data.dailyCap,
        monthly_cap: data.monthlyCap,
        updated_at: new Date().toISOString(),
      })
      .eq("provider", data.provider);
    if (error) return { ok: false, code: "error", message: error.message };
    await logAction(db, ctx.userId, "quota.update", null, data, data.provider);
    return { ok: true };
  });

export const adminUpdateScoring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const points = Number(o["points"]);
    if (
      !["1X2", "BTTS", "OU25", "DC", "HCP"].includes(String(o["market"])) ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 20
    )
      throw new Error("invalid");
    return { market: String(o["market"]), points };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    // Through the admin's own session so the audit trigger records who changed it.
    const { data: ok } = await ctx.supabase.rpc("is_admin");
    if (ok !== true) return { ok: false, code: "forbidden" };
    const { error } = await ctx.supabase
      .from("scoring_rules")
      .update({ points: data.points })
      .eq("market", data.market);
    if (error) return { ok: false, code: "error", message: error.message };
    return { ok: true };
  });
