import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Founding Annual Pass: claiming includes payment (R299 once-off, PayFast).
 * Payments stay off until PAYFAST_ENABLED=true (owner go-ahead, PayFast task). Until then nobody can start a claim,
 * so no place is held without a way to pay for it.
 */
export const getPassPaymentStatus = createServerFn({ method: "GET" }).handler(async () => ({
  paymentsOpen: process.env["PAYFAST_ENABLED"] === "true",
}));

export type StartCheckoutResult =
  | { ok: true; checkoutUrl: string; fields: Record<string, string> }
  | {
      ok: false;
      reason:
        | "payments_not_open"
        | "checkout_unavailable"
        | "already_paid"
        | "full"
        | "closed"
        | "not_member"
        | "error";
    };

export const startAnnualPassCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StartCheckoutResult> => {
    if (process.env["PAYFAST_ENABLED"] !== "true")
      return { ok: false, reason: "payments_not_open" };
    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      fn: string,
    ) => Promise<{ data: { status: string } | null; error: unknown }>;
    const { data, error } = await rpc("claim_annual_pass");
    if (error || !data) return { ok: false, reason: "error" };
    if (data.status === "already_paid" || data.status === "full" || data.status === "closed")
      return { ok: false, reason: data.status };
    if (data.status === "not_member") return { ok: false, reason: "not_member" };
    // Place held (claimed / already_pending). The PayFast checkout is built in the PayFast task: it returns the
    // form URL and signed fields for this user, and its ITN handler calls confirm_annual_pass_payment().
    return { ok: false, reason: "checkout_unavailable" };
  });
