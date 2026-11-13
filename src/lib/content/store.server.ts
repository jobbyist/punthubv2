/**
 * Content engine store on the service-role client. Server only.
 *
 * The content tables are not in the generated `types.ts` until migration 20261113120000_content_engine.sql has been
 * applied and the types regenerated, so this file uses an untyped view of the same client and checks what it reads.
 */
import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { ContentSettings, ContentStore, ProjectUpdate } from "./types";

const db = supabaseAdmin as unknown as SupabaseClient;

function fail(what: string, error: { message: string } | null): void {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createContentStore(): ContentStore {
  return {
    async settings(): Promise<ContentSettings> {
      const { data, error } = await db
        .from("content_settings")
        .select("*")
        .eq("id", true)
        .maybeSingle();
      fail("content_settings", error);
      const row = (data ?? {}) as Record<string, unknown>;
      const mode = row["schedule_mode"];
      const override = row["next_kind_override"];
      return {
        // No settings row means the engine is off.
        enabled: row["enabled"] === true,
        autoPublish: row["auto_publish"] === true,
        minQuality: typeof row["min_quality"] === "number" ? row["min_quality"] : 85,
        scheduleMode: mode === "sports" || mode === "development" ? mode : "alternate",
        nextKindOverride: override === "sports" || override === "development" ? override : null,
      };
    },

    async claimJob({ jobKey, kind, trigger, force }) {
      const { data, error } = await db.rpc("content_claim_job", {
        p_job_key: jobKey,
        p_kind: kind,
        p_trigger: trigger,
        p_force: force,
      });
      fail("content_claim_job", error);
      const row = Array.isArray(data)
        ? (data[0] as { id?: string; attempt?: number } | undefined)
        : undefined;
      return row?.id ? { id: row.id, attempt: row.attempt ?? 1 } : null;
    },

    async log(jobId, stage, level, message, data) {
      const { error } = await db.from("content_generation_logs").insert({
        job_id: jobId,
        stage,
        level,
        message: message.slice(0, 1000),
        data: data === undefined ? null : data,
      });
      fail("content_generation_logs", error);
    },

    async finishJob(jobId, result) {
      const { error } = await db
        .from("content_generation_jobs")
        .update({
          status: result.status,
          finished_at: new Date().toISOString(),
          article_id: result.articleId ?? null,
          model: result.model ?? null,
          error: result.error?.slice(0, 1000) ?? null,
          report: result.report ?? null,
        })
        .eq("id", jobId);
      fail("content_generation_jobs", error);
    },

    async recentTitles(limit) {
      const { data, error } = await db
        .from("newsroom_articles")
        .select("title, slug")
        .order("created_at", { ascending: false })
        .limit(limit);
      fail("newsroom_articles", error);
      return (data ?? []) as { title: string; slug: string }[];
    },

    async pendingProjectUpdates(limit): Promise<ProjectUpdate[]> {
      const { data, error } = await db
        .from("content_project_updates")
        .select("id, title, detail, happened_on")
        .eq("approved", true)
        .is("used_in_article", null)
        .order("happened_on", { ascending: true })
        .limit(limit);
      fail("content_project_updates", error);
      return (
        (data ?? []) as { id: string; title: string; detail: string; happened_on: string }[]
      ).map((r) => ({
        id: r.id,
        title: r.title,
        detail: r.detail,
        happenedOn: r.happened_on,
      }));
    },

    async saveArticle({ jobId, article, sources, usedSourceIndexes, projectUpdateIds }) {
      const now = new Date().toISOString();
      // `generation_job_id` is unique, so a repeated save for the same job updates the same article.
      const { data, error } = await db
        .from("newsroom_articles")
        .upsert(
          {
            slug: article.slug,
            title: article.title.slice(0, 140),
            excerpt: article.excerpt.slice(0, 300),
            body: article.body,
            category: article.category,
            author_name: "The Puntr team",
            status: article.status,
            published_at: article.status === "PUBLISHED" ? now : null,
            seo_title: article.seoTitle || null,
            seo_description: article.seoDescription || null,
            tags: article.tags,
            reading_minutes: article.readingMinutes,
            origin: "ai",
            ai_model: article.aiModel,
            quality_score: article.qualityScore,
            quality_issues: article.qualityIssues,
            generation_job_id: jobId,
          },
          { onConflict: "generation_job_id" },
        )
        .select("id")
        .single();
      fail("newsroom_articles", error);
      const articleId = (data as { id: string }).id;

      const cited = new Set(usedSourceIndexes);
      const rows = sources.map((s) => ({
        job_id: jobId,
        article_id: articleId,
        ordinal: s.index,
        url: s.url,
        domain: s.domain,
        title: s.title.slice(0, 300),
        source_published_at: s.publishedAt,
        via: s.via,
        cited: cited.has(s.index),
        content_hash: createHash("sha256").update(s.text).digest("hex"),
      }));
      if (rows.length > 0) {
        const res = await db.from("content_sources").upsert(rows, { onConflict: "job_id,ordinal" });
        fail("content_sources", res.error);
      }
      if (projectUpdateIds.length > 0) {
        const res = await db
          .from("content_project_updates")
          .update({ used_in_article: articleId })
          .in("id", projectUpdateIds);
        fail("content_project_updates", res.error);
      }
      return { id: articleId };
    },

    async countUsage(provider, outcome) {
      const { error } = await db.rpc("content_count_usage", {
        p_provider: provider,
        p_error: outcome === "error",
      });
      fail("content_count_usage", error);
    },

    async usageToday() {
      const day = new Date().toISOString().slice(0, 10);
      const { data, error } = await db
        .from("content_api_usage")
        .select("provider, calls")
        .eq("day", day);
      fail("content_api_usage", error);
      const out: Record<string, number> = {};
      for (const r of (data ?? []) as { provider: string; calls: number }[])
        out[r.provider] = r.calls;
      return out;
    },

    async clearKindOverride() {
      const { error } = await db
        .from("content_settings")
        .update({ next_kind_override: null })
        .eq("id", true);
      fail("content_settings", error);
    },
  };
}
