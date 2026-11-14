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
