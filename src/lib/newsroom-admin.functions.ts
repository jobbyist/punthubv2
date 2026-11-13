/**
 * Newsroom desk (/admin > Newsroom): review queue, editing, publishing, rejecting, generating, sources, logs,
 * content-engine settings and the approved project-update feed. Admin only; every change is in admin_actions.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { JsonObject } from "./admin-platform.functions";

type Ctx = { supabase: SupabaseClient; userId: string };
type Result<T = undefined> =
  { ok: true; data?: T } | { ok: false; code: "forbidden" | "invalid" | "error"; message?: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}
async function log(
  db: SupabaseClient,
  adminId: string,
  action: string,
  target: string,
  detail: JsonObject = {},
) {
  const { error } = await db
    .from("admin_actions")
    .insert({ admin_id: adminId, action, target, detail });
  if (error) console.error("admin action log failed", action, error.message);
}
const obj = (input: unknown) =>
  (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const uuid = (v: unknown): string => {
  if (typeof v !== "string" || !/^[0-9a-f-]{36}$/i.test(v)) throw new Error("invalid id");
  return v;
};
const str = (v: unknown, min: number, max: number): string => {
  if (typeof v !== "string") throw new Error("invalid text");
  const t = v.trim();
  if (t.length < min || t.length > max) throw new Error("invalid length");
  return t;
};

export interface DeskArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  status: string;
  origin: string;
  aiModel: string | null;
  qualityScore: number | null;
  qualityIssues: { code: string; critical: boolean; detail: string }[];
  tags: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  jobId: string | null;
}

export interface DeskSource {
  ordinal: number;
  url: string;
  domain: string;
  title: string;
  via: string;
  cited: boolean;
}

export interface DeskJob {
  id: string;
  jobKey: string;
  kind: string;
  trigger: string;
  status: string;
  attempt: number;
  startedAt: string;
  error: string | null;
  model: string | null;
}

export interface DeskData {
  articles: DeskArticle[];
  jobs: DeskJob[];
  settings: {
    enabled: boolean;
    autoPublish: boolean;
    minQuality: number;
    scheduleMode: string;
    nextKindOverride: string | null;
  };
  updates: {
    id: string;
    title: string;
    detail: string;
    happenedOn: string;
    approved: boolean;
    used: boolean;
  }[];
}

function toArticle(r: Record<string, unknown>): DeskArticle {
  return {
    id: String(r["id"]),
    slug: String(r["slug"]),
    title: String(r["title"]),
    excerpt: String(r["excerpt"]),
    body: String(r["body"] ?? ""),
    category: String(r["category"]),
    status: String(r["status"]),
    origin: String(r["origin"] ?? "human"),
    aiModel: (r["ai_model"] as string | null) ?? null,
    qualityScore: (r["quality_score"] as number | null) ?? null,
    qualityIssues: (r["quality_issues"] as DeskArticle["qualityIssues"]) ?? [],
    tags: (r["tags"] as string[]) ?? [],
    seoTitle: (r["seo_title"] as string | null) ?? null,
    seoDescription: (r["seo_description"] as string | null) ?? null,
    coverImageUrl: (r["cover_image_url"] as string | null) ?? null,
    publishedAt: (r["published_at"] as string | null) ?? null,
    createdAt: String(r["created_at"]),
    jobId: (r["generation_job_id"] as string | null) ?? null,
  };
}

export const adminNewsroomDesk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeskData | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const [articles, jobs, settings, updates] = await Promise.all([
      db.from("newsroom_articles").select("*").order("created_at", { ascending: false }).limit(60),
      db
        .from("content_generation_jobs")
        .select("id, job_key, kind, trigger, status, attempt, started_at, error, model")
        .order("started_at", { ascending: false })
        .limit(20),
      db.from("content_settings").select("*").maybeSingle(),
      db
        .from("content_project_updates")
        .select("id, title, detail, happened_on, approved, used_in_article")
        .order("happened_on", { ascending: false })
        .limit(50),
    ]);
    const s = (settings.data ?? {}) as Record<string, unknown>;
    return {
      articles: ((articles.data ?? []) as Record<string, unknown>[]).map(toArticle),
      jobs: ((jobs.data ?? []) as Record<string, unknown>[]).map((j) => ({
        id: String(j["id"]),
        jobKey: String(j["job_key"]),
        kind: String(j["kind"]),
        trigger: String(j["trigger"]),
        status: String(j["status"]),
        attempt: Number(j["attempt"]),
        startedAt: String(j["started_at"]),
        error: (j["error"] as string | null) ?? null,
        model: (j["model"] as string | null) ?? null,
      })),
      settings: {
        enabled: s["enabled"] === true,
        autoPublish: s["auto_publish"] === true,
        minQuality: Number(s["min_quality"] ?? 85),
        scheduleMode: String(s["schedule_mode"] ?? "alternate"),
        nextKindOverride: (s["next_kind_override"] as string | null) ?? null,
      },
      updates: ((updates.data ?? []) as Record<string, unknown>[]).map((u) => ({
        id: String(u["id"]),
        title: String(u["title"]),
        detail: String(u["detail"]),
        happenedOn: String(u["happened_on"]),
        approved: u["approved"] === true,
        used: Boolean(u["used_in_article"]),
      })),
    };
  });

export const adminNewsroomDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ({ id: uuid(obj(input)["id"]) }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      sources: DeskSource[];
      logs: { at: string; stage: string; level: string; message: string }[];
    } | null> => {
      const db = await adminDb(context as Ctx);
      if (!db) return null;
      const { data: article } = await db
        .from("newsroom_articles")
        .select("generation_job_id")
        .eq("id", data.id)
        .maybeSingle();
      const jobId =
        (article as { generation_job_id: string | null } | null)?.generation_job_id ?? null;
      const [sources, logs] = await Promise.all([
        db
          .from("content_sources")
          .select("ordinal, url, domain, title, via, cited")
          .eq("article_id", data.id)
          .order("ordinal"),
        jobId
          ? db
              .from("content_generation_logs")
              .select("at, stage, level, message")
              .eq("job_id", jobId)
              .order("id")
          : Promise.resolve({ data: [] }),
      ]);
      return {
        sources: (sources.data ?? []) as DeskSource[],
        logs: (logs.data ?? []) as { at: string; stage: string; level: string; message: string }[],
      };
    },
  );

export const adminNewsroomSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const category = String(o["category"]);
    if (
      !["company", "product", "pfie", "features", "community", "launch", "sports"].includes(
        category,
      )
    )
      throw new Error("invalid category");
    return {
      id: uuid(o["id"]),
      title: str(o["title"], 5, 140),
      excerpt: str(o["excerpt"], 10, 300),
      body: str(o["body"], 50, 20000),
      category,
      seoTitle: typeof o["seoTitle"] === "string" ? o["seoTitle"].trim().slice(0, 70) : "",
      seoDescription:
        typeof o["seoDescription"] === "string" ? o["seoDescription"].trim().slice(0, 170) : "",
    };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    if (/<[a-z][^>]*>/i.test(data.body))
      return { ok: false, code: "invalid", message: "plain text only" };
    const { error } = await db
      .from("newsroom_articles")
      .update({
        title: data.title,
        excerpt: data.excerpt,
        body: data.body,
        category: data.category,
        seo_title: data.seoTitle || null,
        seo_description: data.seoDescription || null,
      })
      .eq("id", data.id);
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, "newsroom.edit", data.id, { title: data.title });
    return { ok: true };
  });

/** Publish, send back to review, or reject (archive). Publishing sets the date once; notifications follow the trigger. */
export const adminNewsroomStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const status = String(o["status"]);
    if (!["PUBLISHED", "REVIEW", "ARCHIVED", "DRAFT"].includes(status))
      throw new Error("invalid status");
    return { id: uuid(o["id"]), status };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const values: Record<string, unknown> = { status: data.status };
    if (data.status === "PUBLISHED") {
      const { data: row } = await db
        .from("newsroom_articles")
        .select("published_at")
        .eq("id", data.id)
        .maybeSingle();
      if (!(row as { published_at: string | null } | null)?.published_at)
        values["published_at"] = new Date().toISOString();
    }
    const { error } = await db.from("newsroom_articles").update(values).eq("id", data.id);
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, `newsroom.${data.status.toLowerCase()}`, data.id);
    return { ok: true };
  });

/** Runs the content pipeline now. One article per call (the function time limit allows one). */
export const adminNewsroomGenerate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const kind: "sports" | "development" = o["kind"] === "development" ? "development" : "sports";
    const beatOffset = Number(o["beatOffset"] ?? 0);
    return {
      kind,
      beatOffset:
        Number.isInteger(beatOffset) && beatOffset >= 0 && beatOffset < 4 ? beatOffset : 0,
    };
  })
  .handler(
    async ({
      data,
      context,
    }): Promise<Result<{ status: string; title?: string; error?: string }>> => {
      const ctx = context as Ctx;
      const db = await adminDb(ctx);
      if (!db) return { ok: false, code: "forbidden" };
      const { readContentEnv } = await import("@/lib/content/config");
      const { createGemini, createPageReader, createParallelSearch } =
        await import("@/lib/content/providers.server");
      const { createContentStore } = await import("@/lib/content/store.server");
      const { runContentJob } = await import("@/lib/content/pipeline");
      const { createQuotaClaim, guardExtract, guardLlm, guardSearch } =
        await import("@/lib/quota.server");
      const claim = await createQuotaClaim();
      const env = readContentEnv();
      const outcome = await runContentJob(
        {
          store: createContentStore(),
          env,
          search: env.parallelKey
            ? guardSearch(createParallelSearch(env.parallelKey), claim)
            : null,
          extract: createPageReader(
            { firecrawl: env.firecrawlKey, parallel: env.parallelKey },
            (r) => guardExtract(r, claim),
          ),
          llm: env.geminiKey ? guardLlm(createGemini(env.geminiKey), claim) : null,
        },
        { trigger: "manual", kind: data.kind, beatOffset: data.beatOffset },
      );
      await log(db, ctx.userId, "newsroom.generate", data.kind, {
        status: outcome.status,
        beatOffset: data.beatOffset,
      });
      if (!outcome.ok) return { ok: true, data: { status: "failed", error: outcome.error } };
      return { ok: true, data: { status: outcome.status } };
    },
  );

export const adminNewsroomSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const minQuality = Number(o["minQuality"]);
    if (!Number.isInteger(minQuality) || minQuality < 50 || minQuality > 100)
      throw new Error("invalid quality");
    const scheduleMode = ["alternate", "sports", "development"].includes(String(o["scheduleMode"]))
      ? String(o["scheduleMode"])
      : "alternate";
    const next = ["sports", "development"].includes(String(o["nextKindOverride"]))
      ? String(o["nextKindOverride"])
      : null;
    return {
      enabled: o["enabled"] === true,
      autoPublish: o["autoPublish"] === true,
      minQuality,
      scheduleMode,
      nextKindOverride: next,
    };
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { error } = await db
      .from("content_settings")
      .update({
        enabled: data.enabled,
        auto_publish: data.autoPublish,
        min_quality: data.minQuality,
        schedule_mode: data.scheduleMode,
        next_kind_override: data.nextKindOverride,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      })
      .eq("id", true);
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, "newsroom.settings", "content_settings", data);
    return { ok: true };
  });

export const adminProjectUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const op = String(o["op"]);
    if (op === "create") {
      const happenedOn = String(o["happenedOn"]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(happenedOn)) throw new Error("invalid date");
      return {
        op: "create" as const,
        title: str(o["title"], 3, 160),
        detail: str(o["detail"], 10, 4000),
        happenedOn,
        approved: o["approved"] === true,
      };
    }
    if (op === "approve" || op === "unapprove" || op === "delete") return { op, id: uuid(o["id"]) };
    throw new Error("invalid op");
  })
  .handler(async ({ data, context }): Promise<Result> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    let error: { message: string } | null = null;
    if (data.op === "create") {
      ({ error } = await db.from("content_project_updates").insert({
        title: data.title,
        detail: data.detail,
        happened_on: data.happenedOn,
        approved: data.approved,
        created_by: ctx.userId,
      }));
    } else if (data.op === "delete") {
      ({ error } = await db
        .from("content_project_updates")
        .delete()
        .eq("id", data.id)
        .is("used_in_article", null));
    } else {
      ({ error } = await db
        .from("content_project_updates")
        .update({ approved: data.op === "approve" })
        .eq("id", data.id));
    }
    if (error) return { ok: false, code: "error", message: error.message };
    await log(
      db,
      ctx.userId,
      `newsroom.update_${data.op}`,
      "op" in data && "id" in data ? data.id : data.op === "create" ? data.title : "",
    );
    return { ok: true };
  });
