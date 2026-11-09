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

/**
 * Reserve one of the 20 Founding Annual Passes without collecting payment on Puntr.
 * The existing claim_annual_pass RPC atomically creates/returns a 48-hour hold. Resend then
 * emails a signed, expiring Puntr redirect which forwards to the configured PayFast hosted link.
 */
const deadline = (iso: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(iso));

export const reserveAnnualPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReserveAnnualPassResult> => {
    const paymentSecret = process.env["ANNUAL_PASS_LINK_SECRET"];
    const missing: string[] = [];
    if (!paymentSecret || paymentSecret.length < 32) missing.push("ANNUAL_PASS_LINK_SECRET");
    if (!process.env["RESEND_API_KEY"]) missing.push("RESEND_API_KEY");
    if (!(await import("@/lib/annual-pass-payment.server")).configuredPayfastUrl())
      missing.push("ANNUAL_PASS_PAYFAST_URL");
    if (missing.length > 0 || !paymentSecret) {
      // Names only, never values.
      console.error("Annual Pass reservation not configured:", missing.join(", "));
      return { ok: false, reason: "email_not_configured" };
    }

    const claims = context.claims as unknown as Record<string, unknown>;
    const email = typeof claims["email"] === "string" ? claims["email"].trim().toLowerCase() : "";
    if (!email) return { ok: false, reason: "missing_email" };

    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (fn: string) => Promise<{
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
      const [
        { sendViaResend, REPLY_TO },
        { renderAnnualPassReservationEmail },
        { createAnnualPassPaymentToken },
        { SITE },
      ] = await Promise.all([
        import("@/lib/email/resend.server"),
        import("@/lib/email/annual-pass-reservation"),
        import("@/lib/annual-pass-payment.server"),
        import("@/lib/launch"),
      ]);
      const token = createAnnualPassPaymentToken(context.userId, holdExpiresAt, paymentSecret);
      const paymentLink = new URL("/api/annual-pass/pay", SITE);
      paymentLink.searchParams.set("token", token);

      const { data: profile } = await context.supabase
        .from("profiles")
        .select("display_name")
        .eq("id", context.userId)
        .maybeSingle();
      const mail = renderAnnualPassReservationEmail({
        name: profile?.display_name ?? "",
        paymentUrl: paymentLink.toString(),
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
      const { notifySupportOnce } = await import("@/lib/support-notify.server");
      await notifySupportOnce({
        event: "annual_pass_reserved",
        key: `pass:${context.userId}:${holdExpiresAt}`,
        subject: `Annual Pass reserved: ${profile?.display_name || email}`,
        rows: [
          ["Name", profile?.display_name || "-"],
          ["Email", email],
          ["Status", data.status === "claimed" ? "New reservation" : "Payment email resent"],
          ["Pay by (SAST)", deadline(holdExpiresAt)],
          ["Amount", "R299 once-off via PayFast"],
        ],
        replyTo: email,
      });
      return { ok: true, holdExpiresAt };
    } catch (err) {
      console.error("Annual Pass reservation email threw", err);
      return { ok: false, reason: "email_failed" };
    }
  });
