import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReserveAnnualPassResult =
  | { ok: true; holdExpiresAt: string }
  | {
      ok: false;
      reason:
        | "email_not_configured"
        | "email_failed"
        | "missing_email"
        | "already_paid"
        | "full"
        | "closed"
        | "not_member"
        | "error";
    };

const PAYFAST_HOSTS = new Set([
  "www.payfast.co.za",
  "payfast.co.za",
  "www.payfast.io",
  "payfast.io",
]);

function configuredPayfastUrl(): string | null {
  const value = process.env["ANNUAL_PASS_PAYFAST_URL"]?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !PAYFAST_HOSTS.has(url.hostname) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Reserve one of the 20 Founding Annual Passes without collecting payment on Puntr.
 * The existing claim_annual_pass RPC atomically creates/returns a 48-hour hold. Resend then
 * emails the configured, HTTPS-only PayFast hosted payment link to the authenticated member.
 */
export const reserveAnnualPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReserveAnnualPassResult> => {
    const paymentUrl = configuredPayfastUrl();
    if (!paymentUrl || !process.env["RESEND_API_KEY"])
      return { ok: false, reason: "email_not_configured" };

    const claims = context.claims as unknown as Record<string, unknown>;
    const email = typeof claims["email"] === "string" ? claims["email"].trim().toLowerCase() : "";
    if (!email) return { ok: false, reason: "missing_email" };

    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      fn: string,
    ) => Promise<{
      data: { status: string; hold_expires_at?: string } | null;
      error: { message: string } | null;
    }>;
    const { data, error } = await rpc("claim_annual_pass");
    if (error || !data) {
      console.error("Annual Pass reservation failed", error?.message);
      return { ok: false, reason: "error" };
    }

    if (data.status === "already_paid") return { ok: false, reason: "already_paid" };
    if (data.status === "full") return { ok: false, reason: "full" };
    if (data.status === "closed") return { ok: false, reason: "closed" };
    if (data.status === "not_member") return { ok: false, reason: "not_member" };
    if (data.status !== "claimed" && data.status !== "already_pending")
      return { ok: false, reason: "error" };

    const holdExpiresAt = data.hold_expires_at;
    if (!holdExpiresAt || new Date(holdExpiresAt).getTime() <= Date.now())
      return { ok: false, reason: "error" };

    try {
      const [{ sendViaResend, REPLY_TO }, { renderAnnualPassReservationEmail }] = await Promise.all([
        import("@/lib/email/resend.server"),
        import("@/lib/email/annual-pass-reservation"),
      ]);
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle();
      const mail = renderAnnualPassReservationEmail({
        name: profile?.display_name ?? "",
        paymentUrl,
        holdExpiresAt,
      });
      const sent = await sendViaResend({
        to: [email],
        reply_to: REPLY_TO,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
      if (!sent.ok) {
        console.error("Annual Pass reservation email failed", sent.status, sent.body);
        return { ok: false, reason: "email_failed" };
      }
      return { ok: true, holdExpiresAt };
    } catch (err) {
      console.error("Annual Pass reservation email threw", err);
      return { ok: false, reason: "email_failed" };
    }
  });
