import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * PayFast Instant Transaction Notification. Credits are granted only after all four PayFast checks pass:
 * source address, signature, the server-to-server postback and an exact amount match. A repeat ITN grants nothing.
 */
export const Route = createFileRoute("/api/payfast/itn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const pf = await import("@/lib/payfast.server");
        const cfg = pf.payfastConfig();
        if (!cfg) return new Response("not configured", { status: 503 });

        const ip =
          request.headers.get("x-real-ip") ??
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        if (!pf.isPayfastIp(ip)) return new Response("forbidden", { status: 403 });

        const body = await request.text();
        const itn = pf.checkItn(body, cfg);
        if (!itn.ok || !itn.orderId || !itn.pfPaymentId || itn.amountCents == null)
          return new Response("invalid", { status: 400 });

        const fields = [...new URLSearchParams(body).entries()].filter(([k]) => k !== "signature");
        const param = fields.map(([k, v]) => `${k}=${pf.pfEncode(v)}`).join("&");
        let valid = false;
        try {
          const res = await fetch(pf.payfastValidateUrl(cfg.sandbox), {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: param,
          });
          valid = (await res.text()).trim() === "VALID";
        } catch (err) {
          console.error("payfast validate failed", err);
          return new Response("retry", { status: 503 });
        }
        if (!valid) return new Response("invalid", { status: 400 });

        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        if (itn.status === "COMPLETE") {
          const { data, error } = await db.rpc(
            "grant_credit_purchase" as never,
            {
              p_order: itn.orderId,
              p_pf_payment_id: itn.pfPaymentId,
              p_amount_cents: itn.amountCents,
            } as never,
          );
          if (error) {
            console.error("grant_credit_purchase failed", error.message);
            return new Response("retry", { status: 500 });
          }
          if (data === "amount_mismatch" || data === "not_found") {
            // PayFast took money we could not match to an order: surface it and let PayFast retry.
            console.error("payfast itn rejected", String(data), itn.orderId);
            return new Response("rejected", { status: 500 });
          }
        } else if (itn.status === "FAILED" || itn.status === "CANCELLED") {
          const { error } = await (
            db as never as {
              from: (t: string) => {
                update: (v: object) => {
                  eq: (
                    c: string,
                    v: string,
                  ) => {
                    eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
                  };
                };
              };
            }
          )
            .from("payment_orders")
            .update({ status: itn.status === "FAILED" ? "failed" : "cancelled" })
            .eq("id", itn.orderId)
            .eq("status", "pending");
          if (error) {
            console.error("payment_orders status update failed", error.message);
            return new Response("retry", { status: 500 });
          }
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});
