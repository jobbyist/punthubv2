import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Founding Member welcome email. Runs every 10 minutes; sends only to new, opted-in founding members, once per
 * address (founding_welcome_sends), and only when LAUNCH_EMAILS_ENABLED=true. ?test=1 sends one copy to the support
 * inbox only and records nothing.
 */
export const Route = createFileRoute("/api/cron/founding-welcome")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        const secret = process.env["WAITLIST_LINK_SECRET"];
        if (!secret)
          return Response.json(
            { ok: false, error: "WAITLIST_LINK_SECRET_not_set" },
            { status: 503 },
          );
        const { REPLY_TO, SUPPORT_INBOX, sendViaResend } =
          await import("@/lib/email/resend.server");
        const { unsubscribeUrl } = await import("@/lib/waitlist");
        const { renderFoundingWelcomeEmail } = await import("@/lib/email/founding-welcome");

        if (new URL(request.url).searchParams.get("test") === "1") {
          const mail = renderFoundingWelcomeEmail({
            name: "Test",
            unsubscribeUrl: unsubscribeUrl(SUPPORT_INBOX, secret),
          });
          let res: { ok: boolean; status: number };
          try {
            res = await sendViaResend({
              to: [SUPPORT_INBOX],
              subject: `[TEST welcome] ${mail.subject}`,
              html: mail.html,
              text: mail.text,
            });
          } catch (err) {
            console.error("founding-welcome test send failed", err);
            res = { ok: false, status: 500 };
          }
          return Response.json({ ok: res.ok, test: true, status: res.status });
        }

        if (process.env["LAUNCH_EMAILS_ENABLED"] !== "true")
          return Response.json({ ok: true, enabled: false, sent: 0 });

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        // Loose view until types.ts is regenerated for the new table and function.
        const db = typedAdmin as unknown as {
          rpc: (fn: string) => Promise<{
            data: { recipient_email: string; recipient_name: string | null }[] | null;
            error: { message: string } | null;
          }>;
          from: (t: string) => {
            upsert: (
              row: Record<string, unknown>,
              o: { onConflict: string; ignoreDuplicates?: boolean },
            ) => Promise<unknown>;
          };
        };
        const { data, error } = await db.rpc("founding_welcome_recipients");
        if (error) {
          console.error("founding-welcome recipients failed", error.message);
          return Response.json({ ok: false, error: "recipients_failed" }, { status: 500 });
        }
        let sent = 0;
        let failed = 0;
        for (const r of data ?? []) {
          const unsub = unsubscribeUrl(r.recipient_email, secret);
          const mail = renderFoundingWelcomeEmail({
            name: r.recipient_name ?? "",
            unsubscribeUrl: unsub,
          });
          let ok = false;
          try {
            ({ ok } = await sendViaResend({
              to: [r.recipient_email],
              reply_to: REPLY_TO,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              headers: {
                "List-Unsubscribe": `<${unsub}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }));
          } catch (err) {
            console.error("founding-welcome send failed", err);
          }
          const status = ok ? "sent" : "failed";
          if (ok) sent += 1;
          else failed += 1;
          await db.from("founding_welcome_sends").upsert(
            { email: r.recipient_email, status, sent_at: new Date().toISOString() },
            // A failure never overwrites a recorded send.
            { onConflict: "email", ignoreDuplicates: status === "failed" },
          );
        }
        console.info("founding-welcome", JSON.stringify({ sent, failed }));
        return Response.json({ ok: true, sent, failed });
      },
    },
  },
});
