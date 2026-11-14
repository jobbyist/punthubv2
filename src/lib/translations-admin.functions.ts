/**
 * Admin > Translations: native-speaker review of the translated UI text and legal pages.
 * Every function re-checks is_admin() on the server and logs writes to admin_actions. The English and translated
 * text are read from the bundled locale files here on the server, never taken from the browser, so a decision is
 * always recorded against the exact text the reviewer saw.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { flattenStrings, LEGAL_PAGES, REVIEW_LOCALES, type ReviewLocale } from "@/lib/translations";
import { DEFAULT_LOCALE, NAMESPACES } from "@/locales/config";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; code: "forbidden" | "invalid" | "error"; message?: string };

const files = import.meta.glob("../locales/*/*.json", { eager: true, import: "default" }) as Record<
  string,
  Record<string, unknown>
>;

// Raw source of the legal pages, fingerprinted so a review goes stale when either language's page changes.
const legalSources = import.meta.glob(["../routes/*.tsx", "../content/legal/*/*.tsx"], {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function fingerprint(path: string): string {
  const src = legalSources[`../${path}`];
  if (typeof src !== "string") return "";
  // FNV-1a: stable and dependency-free; this is change detection, not security.
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${path} #${h.toString(16).padStart(8, "0")}`;
}

function bundle(locale: string, ns: string): Record<string, string> {
  const json = files[`../locales/${locale}/${ns}.json`];
  return json ? flattenStrings(json) : {};
}

/** Admin text stays English (internal tool), so it is not part of the review. */
const REVIEW_NAMESPACES = NAMESPACES.filter((ns) => ns !== "admin");

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
  detail: object,
) {
  const { error } = await db
    .from("admin_actions")
    .insert({ admin_id: adminId, action, target, detail });
  if (error) console.error("admin action log failed", action, error.message);
}

const obj = (input: unknown) =>
  (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const text = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const isLocale = (v: unknown): v is ReviewLocale =>
  typeof v === "string" && (REVIEW_LOCALES as readonly string[]).includes(v);
const isNamespace = (v: unknown): v is string =>
  typeof v === "string" && (v === "legal" || (REVIEW_NAMESPACES as readonly string[]).includes(v));

interface ReviewRow {
  namespace: string;
  key: string;
  source_text: string;
  reviewed_text: string;
  status: "approved" | "changes";
  suggestion: string | null;
  note: string | null;
  reviewed_at: string;
}

/** Text a decision is recorded against: the strings for UI keys, the page version for legal pages. */
function currentText(
  locale: ReviewLocale,
  ns: string,
  key: string,
): { en: string; tr: string } | null {
  if (ns === "legal") {
    const page = LEGAL_PAGES.find((p) => p.slug === key);
    return page ? { en: fingerprint(page.en), tr: fingerprint(page[locale]) } : null;
  }
  const en = bundle(DEFAULT_LOCALE, ns)[key];
  if (en === undefined) return null;
  return { en, tr: bundle(locale, ns)[key] ?? "" };
}

export interface NamespaceSummary {
  namespace: string;
  total: number;
  translated: number;
  approved: number;
  changes: number;
  stale: number;
}
export interface SignoffRow {
  decision: "approved" | "withdrawn";
  reviewerName: string;
  note: string | null;
  approvedCount: number;
  totalCount: number;
  signedAt: string;
}
export interface TranslationOverview {
  ok: true;
  locale: ReviewLocale;
  namespaces: NamespaceSummary[];
  totals: { total: number; translated: number; approved: number; changes: number; stale: number };
  signoffs: SignoffRow[];
}

/** Per-section and total review state for a locale, computed from the stored decisions and the current files. */
async function summariseLocale(
  db: SupabaseClient,
  locale: ReviewLocale,
): Promise<
  { ok: true; namespaces: NamespaceSummary[]; totals: TranslationOverview["totals"] } | Fail
> {
  const { data: rows, error } = await db
    .from("translation_reviews")
    .select("namespace, key, source_text, reviewed_text, status")
    .eq("locale", locale);
  if (error) return { ok: false, code: "error", message: error.message };
  const byKey = new Map<string, Pick<ReviewRow, "source_text" | "reviewed_text" | "status">>();
  for (const r of (rows ?? []) as ReviewRow[]) byKey.set(`${r.namespace}::${r.key}`, r);

  const summarise = (ns: string, keys: string[]): NamespaceSummary => {
    const s: NamespaceSummary = {
      namespace: ns,
      total: 0,
      translated: 0,
      approved: 0,
      changes: 0,
      stale: 0,
    };
    for (const key of keys) {
      const cur = currentText(locale, ns, key);
      if (!cur) continue;
      s.total += 1;
      if (cur.tr) s.translated += 1;
      const r = byKey.get(`${ns}::${key}`);
      if (!r) continue;
      if (r.source_text !== cur.en || r.reviewed_text !== cur.tr) s.stale += 1;
      else if (r.status === "approved") s.approved += 1;
      else s.changes += 1;
    }
    return s;
  };

  const namespaces = [
    ...REVIEW_NAMESPACES.map((ns) => summarise(ns, Object.keys(bundle(DEFAULT_LOCALE, ns)))),
    summarise(
      "legal",
      LEGAL_PAGES.map((p) => p.slug),
    ),
  ].filter((n) => n.total > 0);

  const totals = namespaces.reduce(
    (a, n) => ({
      total: a.total + n.total,
      translated: a.translated + n.translated,
      approved: a.approved + n.approved,
      changes: a.changes + n.changes,
      stale: a.stale + n.stale,
    }),
    { total: 0, translated: 0, approved: 0, changes: 0, stale: 0 },
  );

  return { ok: true, namespaces, totals };
}

export const getTranslationOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => obj(input))
  .handler(async ({ data, context }): Promise<TranslationOverview | Fail> => {
    const db = await adminDb(context as Ctx);
    if (!db) return { ok: false, code: "forbidden" };
    if (!isLocale(data["locale"])) return { ok: false, code: "invalid" };
    const locale = data["locale"];

    const summary = await summariseLocale(db, locale);
    if (!summary.ok) return summary;
    const { namespaces, totals } = summary;

    const { data: so } = await db
      .from("translation_signoffs")
      .select("decision, reviewer_name, note, approved_count, total_count, signed_at")
      .eq("locale", locale)
      .order("signed_at", { ascending: false })
      .limit(20);
    const signoffs: SignoffRow[] = (
      (so ?? []) as {
        decision: "approved" | "withdrawn";
        reviewer_name: string;
        note: string | null;
        approved_count: number;
        total_count: number;
        signed_at: string;
      }[]
    ).map((r) => ({
      decision: r.decision,
      reviewerName: r.reviewer_name,
      note: r.note,
      approvedCount: r.approved_count,
      totalCount: r.total_count,
      signedAt: r.signed_at,
    }));

    return { ok: true, locale, namespaces, totals, signoffs };
  });

export interface StringRow {
  key: string;
  en: string;
  tr: string;
  status: "pending" | "approved" | "changes" | "stale";
  suggestion: string | null;
  note: string | null;
  reviewedAt: string | null;
}

export const listTranslationStrings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => obj(input))
  .handler(async ({ data, context }): Promise<{ ok: true; rows: StringRow[] } | Fail> => {
    const db = await adminDb(context as Ctx);
    if (!db) return { ok: false, code: "forbidden" };
    if (!isLocale(data["locale"]) || !isNamespace(data["namespace"]))
      return { ok: false, code: "invalid" };
    const locale = data["locale"];
    const ns = data["namespace"];

    const { data: rows, error } = await db
      .from("translation_reviews")
      .select("namespace, key, source_text, reviewed_text, status, suggestion, note, reviewed_at")
      .eq("locale", locale)
      .eq("namespace", ns);
    if (error) return { ok: false, code: "error", message: error.message };
    const byKey = new Map(((rows ?? []) as ReviewRow[]).map((r) => [r.key, r]));

    const keys =
      ns === "legal" ? LEGAL_PAGES.map((p) => p.slug) : Object.keys(bundle(DEFAULT_LOCALE, ns));
    const out: StringRow[] = [];
    for (const key of keys) {
      const cur = currentText(locale, ns, key);
      if (!cur) continue;
      const r = byKey.get(key);
      const stale = !!r && (r.source_text !== cur.en || r.reviewed_text !== cur.tr);
      out.push({
        key,
        en: cur.en,
        tr: cur.tr,
        status: !r ? "pending" : stale ? "stale" : r.status,
        suggestion: r?.suggestion ?? null,
        note: r?.note ?? null,
        reviewedAt: r?.reviewed_at ?? null,
      });
    }
    return { ok: true, rows: out };
  });

export const saveTranslationReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => obj(input))
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const status = data["status"];
    if (
      !isLocale(data["locale"]) ||
      !isNamespace(data["namespace"]) ||
      typeof data["key"] !== "string" ||
      (status !== "approved" && status !== "changes" && status !== "clear")
    )
      return { ok: false, code: "invalid" };
    const locale = data["locale"];
    const ns = data["namespace"];
    const key = data["key"];
    const cur = currentText(locale, ns, key);
    if (!cur) return { ok: false, code: "invalid", message: "Unknown key" };

    if (status === "clear") {
      const { error } = await db
        .from("translation_reviews")
        .delete()
        .match({ locale, namespace: ns, key });
      if (error) return { ok: false, code: "error", message: error.message };
      await log(db, ctx.userId, "translation.clear", `${locale}:${ns}:${key}`, {});
      return { ok: true };
    }

    const suggestion = text(data["suggestion"], 20000);
    const note = text(data["note"], 2000);
    if (status === "changes" && !suggestion && !note)
      return { ok: false, code: "invalid", message: "Add a suggestion or a note" };

    const { error } = await db.from("translation_reviews").upsert(
      {
        locale,
        namespace: ns,
        key,
        source_text: cur.en,
        reviewed_text: cur.tr,
        status,
        suggestion: status === "changes" ? suggestion : null,
        note,
        reviewer_id: ctx.userId,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "locale,namespace,key" },
    );
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, `translation.${status}`, `${locale}:${ns}:${key}`, {
      suggestion: !!suggestion,
      note: !!note,
    });
    return { ok: true };
  });

/**
 * Approve a whole section at once (a reviewer who has read it). Strings with a current decision are left alone,
 * so a suggestion still matching today's text is never overwritten; pending and stale strings are approved.
 */
export const approveTranslationSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => obj(input))
  .handler(async ({ data, context }): Promise<{ ok: true; approved: number } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    if (
      !isLocale(data["locale"]) ||
      !isNamespace(data["namespace"]) ||
      data["namespace"] === "legal"
    )
      return { ok: false, code: "invalid" };
    const locale = data["locale"];
    const ns = data["namespace"];

    const { data: existing } = await db
      .from("translation_reviews")
      .select("key, source_text, reviewed_text")
      .eq("locale", locale)
      .eq("namespace", ns);
    const decided = new Map(
      ((existing ?? []) as Pick<ReviewRow, "key" | "source_text" | "reviewed_text">[]).map((r) => [
        r.key,
        r,
      ]),
    );
    const now = new Date().toISOString();
    const rows = Object.keys(bundle(DEFAULT_LOCALE, ns))
      .map((key) => ({ key, cur: currentText(locale, ns, key) }))
      .filter((r): r is { key: string; cur: { en: string; tr: string } } => !!r.cur && !!r.cur.tr)
      .filter(({ key, cur }) => {
        const r = decided.get(key);
        return !r || r.source_text !== cur.en || r.reviewed_text !== cur.tr;
      })
      .map(({ key, cur }) => ({
        locale,
        namespace: ns,
        key,
        source_text: cur.en,
        reviewed_text: cur.tr,
        status: "approved" as const,
        reviewer_id: ctx.userId,
        reviewed_at: now,
      }));
    if (rows.length > 0) {
      const { error } = await db
        .from("translation_reviews")
        .upsert(rows, { onConflict: "locale,namespace,key" });
      if (error) return { ok: false, code: "error", message: error.message };
    }
    await log(db, ctx.userId, "translation.approve_section", `${locale}:${ns}`, {
      approved: rows.length,
    });
    return { ok: true, approved: rows.length };
  });

export const signOffTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => obj(input))
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const decision = data["decision"];
    const reviewerName = text(data["reviewerName"], 120);
    if (
      !isLocale(data["locale"]) ||
      (decision !== "approved" && decision !== "withdrawn") ||
      !reviewerName ||
      reviewerName.length < 2
    )
      return { ok: false, code: "invalid" };
    // Counts come from the stored decisions, never from the browser.
    const summary = await summariseLocale(db, data["locale"]);
    if (!summary.ok) return summary;
    const approvedCount = summary.totals.approved;
    const totalCount = summary.totals.total;
    const { error } = await db.from("translation_signoffs").insert({
      locale: data["locale"],
      decision,
      reviewer_name: reviewerName,
      note: text(data["note"], 2000),
      approved_count: approvedCount,
      total_count: totalCount,
      signed_by: ctx.userId,
    });
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, `translation.signoff_${decision}`, String(data["locale"]), {
      reviewerName,
      approvedCount,
      totalCount,
    });
    return { ok: true };
  });
