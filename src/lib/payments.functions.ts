/**
 * Pay-As-You-Go credit packs. Off until app_settings.payments_enabled = 'true' and the PayFast variables are set.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PaymentsStatus {
  enabled: boolean;
}
export type StartPurchaseResult =
  | { ok: true; action: string; fields: [string, string][] }
  | { ok: false; error: "disabled" | "invalid" | "not_member" | "error" };

async function paymentsOn(): Promise<boolean> {
  const { payfastConfig } = await import("@/lib/payfast.server");
  if (!payfastConfig()) return false;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data } = await db.rpc("payments_enabled" as never);
  return data === true;
}

export const getPaymentsStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<PaymentsStatus> => ({ enabled: await paymentsOn() }),
);

export const startCreditPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => {
    const o = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
    return { pack: typeof o["pack"] === "string" ? o["pack"] : "" };
  })
  .handler(async ({ data, context }): Promise<StartPurchaseResult> => {
    const { findPack, payfastConfig, buildCheckout } = await import("@/lib/payfast.server");
    const cfg = payfastConfig();
    if (!cfg || !(await paymentsOn())) return { ok: false, error: "disabled" };
    const pack = findPack(data.pack);
    if (!pack) return { ok: false, error: "invalid" };
    const ctx = context as { userId: string };
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    // Members only: admins and signed-out visitors cannot buy.
    const { data: profile } = await db
      .from("profiles")
      .select("id, role")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (!profile || profile.role === "admin") return { ok: false, error: "not_member" };
    const { data: order, error } = await (
      db as never as {
        from: (t: string) => {
          insert: (v: object) => {
            select: (c: string) => {
              single: () => Promise<{ data: { id: string } | null; error: unknown }>;
            };
          };
        };
      }
    )
      .from("payment_orders")
      .insert({
        user_id: ctx.userId,
        pack: pack.name,
        credits: pack.credits,
        amount_cents: Math.round(pack.price * 100),
      })
      .select("id")
      .single();
    if (error || !order) return { ok: false, error: "error" };
    const siteUrl = process.env["SITE_URL"] ?? "https://puntr.co.za";
    const checkout = buildCheckout(cfg, { orderId: order.id, pack, siteUrl });
    return { ok: true, action: checkout.action, fields: checkout.fields };
  });

export interface ProStatus {
  /** True when Pro checkout can be offered (payments on and PayFast configured). */
  available: boolean;
  price: number;
  /** The member's live subscription, if any. */
  subscription: {
    status: "pending" | "active" | "past_due" | "cancelled" | "ended";
    currentPeriodEnd: string | null;
    cancelRequested: boolean;
  } | null;
  /** True when the member has Pro access now (subscription, Annual Pass or a granted pass). */
  hasPro: boolean;
  usage: { month: number; cap: number };
}

type Db = {
  from: (t: string) => {
    select: (
      c: string,
      o?: { count: "exact"; head: boolean },
    ) => {
      eq: (
        c: string,
        v: string,
      ) => {
        in: (
          c: string,
          v: string[],
        ) => {
          order: (
            c: string,
            o: object,
          ) => { limit: (n: number) => Promise<{ data: Record<string, unknown>[] | null }> };
        };
        gte: (c: string, v: string) => Promise<{ count: number | null }>;
      };
    };
    insert: (v: object) => {
      select: (c: string) => {
        single: () => Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
    update: (v: object) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
  };
  rpc: (fn: string, args?: object) => Promise<{ data: unknown; error: unknown }>;
};

async function liveSubscription(db: Db, userId: string) {
  const { data } = await db
    .from("pro_subscriptions")
    .select("id, status, current_period_end, cancel_requested_at, pf_token")
    .eq("user_id", userId)
    .in("status", ["active", "past_due", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return null;
  // A cancelled subscription still counts while its paid period runs.
  const end = row["current_period_end"] as string | null;
  if (row["status"] === "cancelled" && (!end || Date.parse(end) < Date.now())) return null;
  return row;
}

export const getProStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProStatus> => {
    const { PRO_MONTHLY_PRICE } = await import("@/lib/economics");
    const ctx = context as { userId: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as never as Db;
    const sub = await liveSubscription(db, ctx.userId);
    const { data: hasPro } = await db.rpc("has_entitlement", {
      p_user: ctx.userId,
      p_entitlement: "pro",
    });
    const { data: cap } = await db.rpc("pro_cap", { p_user: ctx.userId });
    const { count } = await db
      .from("pro_usage")
      .select("ref_id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .gte("used_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
    return {
      available: await paymentsOn(),
      price: PRO_MONTHLY_PRICE,
      subscription: sub
        ? {
            status: sub["status"] as NonNullable<ProStatus["subscription"]>["status"],
            currentPeriodEnd: (sub["current_period_end"] as string | null) ?? null,
            cancelRequested: !!sub["cancel_requested_at"] || sub["status"] === "cancelled",
          }
        : null,
      hasPro: hasPro === true,
      usage: { month: count ?? 0, cap: typeof cap === "number" ? cap : 90 },
    };
  });

export type StartProResult =
  | { ok: true; action: string; fields: [string, string][] }
  | { ok: false; error: "disabled" | "not_member" | "already_pro" | "error" };

export const startProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StartProResult> => {
    const { payfastConfig, buildSubscriptionCheckout } = await import("@/lib/payfast.server");
    const { PRO_MONTHLY_PRICE } = await import("@/lib/economics");
    const cfg = payfastConfig();
    if (!cfg || !(await paymentsOn())) return { ok: false, error: "disabled" };
    const ctx = context as { userId: string };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as never as Db;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (!profile || profile.role === "admin") return { ok: false, error: "not_member" };
    if (await liveSubscription(db, ctx.userId)) return { ok: false, error: "already_pro" };
    const { data: sub, error } = await db
      .from("pro_subscriptions")
      .insert({ user_id: ctx.userId, amount_cents: PRO_MONTHLY_PRICE * 100 })
      .select("id")
      .single();
    if (error || !sub) return { ok: false, error: "error" };
    const siteUrl = process.env["SITE_URL"] ?? "https://puntr.co.za";
    const billingDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
    }).format(new Date());
    const checkout = buildSubscriptionCheckout(cfg, {
      subscriptionId: sub.id,
      amountCents: PRO_MONTHLY_PRICE * 100,
      siteUrl,
      billingDate,
    });
    return { ok: true, action: checkout.action, fields: checkout.fields };
  });

export const cancelProSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({ context }): Promise<{ ok: boolean; error?: "none" | "payfast" | "disabled" }> => {
      const { payfastConfig, cancelPayfastSubscription } = await import("@/lib/payfast.server");
      const cfg = payfastConfig();
      if (!cfg) return { ok: false, error: "disabled" };
      const ctx = context as { userId: string };
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as never as Db;
      const sub = await liveSubscription(db, ctx.userId);
      if (!sub || sub["status"] === "cancelled") return { ok: false, error: "none" };
      const token = sub["pf_token"] as string | null;
      if (!token) return { ok: false, error: "payfast" };
      const ok = await cancelPayfastSubscription(cfg, token).catch(() => false);
      if (!ok) return { ok: false, error: "payfast" };
      await db
        .from("pro_subscriptions")
        .update({ cancel_requested_at: new Date().toISOString() })
        .eq("id", sub["id"] as string);
      await db.rpc("set_pro_subscription_status", { p_sub: sub["id"], p_status: "cancelled" });
      return { ok: true };
    },
  );
