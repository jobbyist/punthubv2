import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * One-off Founding Member campaign email (Annual Pass upsell). Sends only when LAUNCH_EMAILS_ENABLED=true,
 * only to opted-in recipients, once per address (founding_campaign_sends). Safe to call repeatedly.
 */
export const Route = createFileRoute("/api/cron/founding-campaign")({
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
        // ?test=1: send both template variants to the support inbox only. Records nothing, emails no member.
        if (new URL(request.url).searchParams.get("test") === "1") {
          const { SUPPORT_INBOX, sendViaResend: sendTest } =
            await import("@/lib/email/resend.server");
          const { unsubscribeUrl: unsubTest } = await import("@/lib/waitlist");
          const { renderFoundingPassEmail: renderTest } = await import("@/lib/email/founding-pass");
          const results: { variant: string; ok: boolean; status: number }[] = [];
          for (const isMember of [true, false]) {
            const mail = renderTest({
              name: "Test",
              isMember,
              unsubscribeUrl: unsubTest(SUPPORT_INBOX, secret),
            });
            let res: { ok: boolean; status: number };
            try {
              res = await sendTest({
                to: [SUPPORT_INBOX],
                subject: `[TEST ${isMember ? "member" : "reserved"}] ${mail.subject}`,
                html: mail.html,
                text: mail.text,
              });
            } catch (err) {
              console.error("founding-campaign test send failed", err);
              res = { ok: false, status: 500 };
            }
            results.push({
              variant: isMember ? "member" : "reserved",
              ok: res.ok,
              status: res.status,
            });
          }
          console.info("founding-campaign test", JSON.stringify(results));
          return Response.json({ ok: results.every((r) => r.ok), test: true, results });
        }
        if (process.env["LAUNCH_EMAILS_ENABLED"] !== "true")
          return Response.json({ ok: true, enabled: false, sent: 0 });

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        // Narrow view for the campaign table and function until types.ts is regenerated after the migration.
        const supabaseAdmin = typedAdmin as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{
            data:
              | { recipient_email: string; recipient_name: string | null; is_member: boolean }[]
              | null;
            error: { message: string } | null;
          }>;
          from: (t: string) => {
            upsert: (
              row: Record<string, unknown>,
              o: { onConflict: string; ignoreDuplicates?: boolean },
            ) => Promise<unknown>;
          };
        };
        const { REPLY_TO, sendViaResend } = await import("@/lib/email/resend.server");
        const { unsubscribeUrl } = await import("@/lib/waitlist");
        const { FOUNDING_CAMPAIGN, renderFoundingPassEmail } =
          await import("@/lib/email/founding-pass");
        const { data, error } = await supabaseAdmin.rpc("founding_campaign_recipients", {
          p_campaign: FOUNDING_CAMPAIGN,
        });
        if (error) {
          console.error("founding-campaign recipients failed", error.message);
          return Response.json({ ok: false, error: "recipients_failed" }, { status: 500 });
        }
        let sent = 0;
        let failed = 0;
        for (const r of data ?? []) {
          const unsub = unsubscribeUrl(r.recipient_email, secret);
          const mail = renderFoundingPassEmail({
            name: r.recipient_name ?? "",
            isMember: r.is_member,
            unsubscribeUrl: unsub,
          });
          const res = await sendViaResend({
            to: [r.recipient_email],
            reply_to: REPLY_TO,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
            headers: {
              "List-Unsubscribe": `<${unsub}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          const status = res.ok ? "sent" : "failed";
          if (res.ok) sent += 1;
          else failed += 1;
          await supabaseAdmin.from("founding_campaign_sends").upsert(
            {
              email: r.recipient_email,
              campaign: FOUNDING_CAMPAIGN,
              status,
              sent_at: new Date().toISOString(),
            },
            // A failure never overwrites an existing row, so a recorded send cannot be downgraded.
            { onConflict: "email,campaign", ignoreDuplicates: status === "failed" },
          );
        }
        console.info("founding-campaign", JSON.stringify({ sent, failed }));
        return Response.json({ ok: true, sent, failed });
      },
    },
  },
});
