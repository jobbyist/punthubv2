/**
 * Admin > Annual Pass: Founding Annual Pass claims and bank-transfer (EFT) payments recorded by hand.
 * Every function re-checks is_admin() on the server and logs to admin_actions.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; code: "forbidden" | "invalid" | "not_found" | "error"; message?: string };

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
  detail: Record<string, unknown>,
) {
  const { error } = await db.from("admin_actions").insert({ admin_id: adminId, action, detail });
  if (error) console.error("admin action log failed", action, error.message);
}

const obj = (input: unknown) =>
  (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
const optText = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export interface OfflinePaymentRow {
  id: string;
  payerLabel: string;
  amountCents: number | null;
  bankReference: string | null;
  paidOn: string;
  note: string | null;
  username: string | null;
  linkedAt: string | null;
  createdAt: string;
}
export interface PassClaimRow {
  username: string | null;
  status: string;
  claimedAt: string;
  holdExpiresAt: string | null;
  paidAt: string | null;
  reference: string | null;
}
export interface AnnualPassOverview {
  remaining: number;
  open: boolean;
  offline: OfflinePaymentRow[];
  claims: PassClaimRow[];
}

export const adminAnnualPassOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AnnualPassOverview | null> => {
    const db = await adminDb(context as Ctx);
    if (!db) return null;
    const [offer, offline, claims] = await Promise.all([
      db.rpc("annual_pass_offer"),
      db
        .from("annual_pass_offline_payments")
        .select(
          "id, payer_label, amount_cents, bank_reference, paid_on, note, user_id, linked_at, created_at",
        )
        .is("voided_at", null)
        .order("created_at", { ascending: true }),
      db
        .from("annual_pass_claims")
        .select("user_id, status, claimed_at, hold_expires_at, paid_at, payment_reference")
        .order("claimed_at", { ascending: false }),
    ]);
    if (offline.error) throw new Error(offline.error.message);
    if (claims.error) throw new Error(claims.error.message);
    const offRows = (offline.data ?? []) as Record<string, unknown>[];
    const claimRows = (claims.data ?? []) as Record<string, unknown>[];
    const ids = [
      ...new Set(
        [...offRows, ...claimRows]
          .map((r) => r["user_id"])
          .filter((v): v is string => typeof v === "string"),
      ),
    ];
    const names = new Map<string, string>();
    if (ids.length > 0) {
      const { data: profiles } = await db.from("profiles").select("id, username").in("id", ids);
      for (const p of (profiles ?? []) as { id: string; username: string }[])
        names.set(p.id, p.username);
    }
    const o = (offer.data ?? {}) as { remaining?: number; open?: boolean };
    return {
      remaining: typeof o.remaining === "number" ? o.remaining : 0,
      open: o.open === true,
      offline: offRows.map((r) => ({
        id: String(r["id"]),
        payerLabel: String(r["payer_label"]),
        amountCents: typeof r["amount_cents"] === "number" ? r["amount_cents"] : null,
        bankReference: (r["bank_reference"] as string | null) ?? null,
        paidOn: String(r["paid_on"]),
        note: (r["note"] as string | null) ?? null,
        username: typeof r["user_id"] === "string" ? (names.get(r["user_id"]) ?? "?") : null,
        linkedAt: (r["linked_at"] as string | null) ?? null,
        createdAt: String(r["created_at"]),
      })),
      claims: claimRows.map((r) => ({
        username: typeof r["user_id"] === "string" ? (names.get(r["user_id"]) ?? "?") : null,
        status: String(r["status"]),
        claimedAt: String(r["claimed_at"]),
        holdExpiresAt: (r["hold_expires_at"] as string | null) ?? null,
        paidAt: (r["paid_at"] as string | null) ?? null,
        reference: (r["payment_reference"] as string | null) ?? null,
      })),
    };
  });

/** Records a bank transfer. It counts toward the 20-pass cap straight away. */
export const adminRecordBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    const payer = optText(o["payerLabel"], 120);
    if (!payer || payer.length < 2) throw new Error("payer required");
    const rand =
      typeof o["amountRand"] === "number" && Number.isFinite(o["amountRand"])
        ? o["amountRand"]
        : null;
    if (rand !== null && (rand < 0 || rand > 100_000)) throw new Error("invalid amount");
    const paidOn =
      typeof o["paidOn"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o["paidOn"])
        ? o["paidOn"]
        : null;
    return {
      payerLabel: payer,
      amountCents: rand === null ? null : Math.round(rand * 100),
      bankReference: optText(o["bankReference"], 120),
      note: optText(o["note"], 500),
      paidOn,
    };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { data: offer } = await db.rpc("annual_pass_offer");
    if (((offer ?? {}) as { remaining?: number }).remaining === 0)
      return { ok: false, code: "invalid", message: "All 20 passes are taken" };
    const { error } = await db.from("annual_pass_offline_payments").insert({
      payer_label: data.payerLabel,
      amount_cents: data.amountCents,
      bank_reference: data.bankReference,
      note: data.note,
      ...(data.paidOn ? { paid_on: data.paidOn } : {}),
      recorded_by: ctx.userId,
    });
    if (error) return { ok: false, code: "error", message: error.message };
    await log(db, ctx.userId, "annual_pass.bank_transfer", {
      payer: data.payerLabel,
      amountCents: data.amountCents,
    });
    return { ok: true };
  });

/** Matches a bank transfer to a member by username; their Annual Pass claim becomes paid. */
export const adminLinkBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    if (!isUuid(o["paymentId"])) throw new Error("invalid id");
    const username = optText(o["username"], 40)?.replace(/^@/, "").toLowerCase();
    if (!username) throw new Error("username required");
    return { paymentId: o["paymentId"], username };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { data: profile } = await db
      .from("profiles")
      .select("id, username")
      .ilike("username", data.username)
      .maybeSingle();
    if (!profile) return { ok: false, code: "not_found", message: "No member with that username" };
    const memberId = (profile as { id: string }).id;
    const { data: res, error } = await db.rpc("annual_pass_link_offline", {
      p_payment: data.paymentId,
      p_user: memberId,
    });
    if (error) return { ok: false, code: "error", message: error.message };
    if (res !== "linked") return { ok: false, code: "invalid", message: String(res) };
    await log(db, ctx.userId, "annual_pass.link", {
      paymentId: data.paymentId,
      username: data.username,
    });
    return { ok: true };
  });

/** Voids a wrongly recorded bank transfer (kept for the record; it stops counting). Linked rows cannot be voided. */
export const adminVoidBankTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = obj(input);
    if (!isUuid(o["paymentId"])) throw new Error("invalid id");
    return { paymentId: o["paymentId"] };
  })
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    const ctx = context as Ctx;
    const db = await adminDb(ctx);
    if (!db) return { ok: false, code: "forbidden" };
    const { data: rows, error } = await db
      .from("annual_pass_offline_payments")
      .update({ voided_at: new Date().toISOString() })
      .eq("id", data.paymentId)
      .is("user_id", null)
      .is("voided_at", null)
      .select("id");
    if (error) return { ok: false, code: "error", message: error.message };
    if (!rows || rows.length === 0)
      return { ok: false, code: "invalid", message: "Linked or already voided" };
    await log(db, ctx.userId, "annual_pass.void", { paymentId: data.paymentId });
    return { ok: true };
  });
