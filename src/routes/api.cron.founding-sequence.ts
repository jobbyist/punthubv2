import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Sends one Founding Member sequence campaign (checklist, survey, referral, countdown) to opted-in recipients,
 * once per address per campaign (founding_campaign_sends). Safe to call repeatedly.
 *
 *   GET /api/cron/founding-sequence?campaign=founding-survey-1          sends the campaign (needs LAUNCH_EMAILS_ENABLED=true)
 *   GET /api/cron/founding-sequence?campaign=founding-survey-1&test=1   sends the email to the support inbox only
 *
 * Resend's free plan allows 100 emails a day, so a run stops at EMAIL_DAILY_CAP (default 90) and the next run
 * carries on with whoever has not been sent it yet.
 */
export const Route = createFileRoute("/api/cron/founding-sequence")({
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

        const params = new URL(request.url).searchParams;
        const { SEQUENCE } = await import("@/lib/email/founding-sequence");
        const campaign = params.get("campaign") ?? "";
        const entry = SEQUENCE[campaign];
        if (!entry)
          return Response.json(
            { ok: false, error: "unknown_campaign", campaigns: Object.keys(SEQUENCE) },
            { status: 400 },
          );

        const { REPLY_TO, SUPPORT_INBOX, sendViaResend } =
          await import("@/lib/email/resend.server");
        const { unsubscribeUrl } = await import("@/lib/waitlist");

        if (params.get("test") === "1") {
          const mail = entry.render({
            name: "Test",
            unsubscribeUrl: unsubscribeUrl(SUPPORT_INBOX, secret),
          });
          const res = await sendViaResend({
            to: [SUPPORT_INBOX],
            subject: `[TEST] ${mail.subject}`,
            html: mail.html,
            text: mail.text,
          });
          return Response.json({ ok: res.ok, test: true, campaign, status: res.status });
        }

        if (process.env["LAUNCH_EMAILS_ENABLED"] !== "true")
          return Response.json({ ok: true, enabled: false, sent: 0 });

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        // Narrow view for the campaign function and table until types.ts is regenerated.
        const db = typedAdmin as unknown as {
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
        const { data, error } = await db.rpc("founding_campaign_recipients", {
          p_campaign: campaign,
        });
        if (error) {
          console.error("founding-sequence recipients failed", error.message);
          return Response.json({ ok: false, error: "recipients_failed" }, { status: 500 });
        }
        const dailyCap = Math.max(1, Number(process.env["EMAIL_DAILY_CAP"]) || 90);
        // ?limit=N lets a schedule take only part of the day's allowance, so two campaigns can share it.
        const asked = Number(new URL(request.url).searchParams.get("limit"));
        const cap = asked > 0 ? Math.min(dailyCap, asked) : dailyCap;
        const queue = (data ?? []).filter((r) => r.is_member || !entry.memberOnly);
        let sent = 0;
        let failed = 0;
        for (const r of queue) {
          if (sent + failed >= cap) break;
          const unsub = unsubscribeUrl(r.recipient_email, secret);
          const mail = entry.render({ name: r.recipient_name ?? "", unsubscribeUrl: unsub });
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
          await db.from("founding_campaign_sends").upsert(
            { email: r.recipient_email, campaign, status, sent_at: new Date().toISOString() },
            // A failure never overwrites an existing row, so a recorded send cannot be downgraded.
            { onConflict: "email,campaign", ignoreDuplicates: status === "failed" },
          );
        }
        const remaining = Math.max(0, queue.length - sent - failed);
        console.info("founding-sequence", JSON.stringify({ campaign, sent, failed, remaining }));
        return Response.json({ ok: true, campaign, sent, failed, remaining });
      },
    },
  },
});
