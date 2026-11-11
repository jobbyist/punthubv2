import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Sends one reminder, per hold, to members whose unpaid Founding Annual Pass reservation lapses within 24 hours.
 * Transactional (a service email about a reservation the member made), one send per hold (founding_campaign_sends).
 * Safe to call repeatedly. Scheduled by pg_cron every 30 minutes between 07:00 and 19:59 SAST.
 *
 *   GET /api/cron/annual-pass-reminder            sends due reminders (needs LAUNCH_EMAILS_ENABLED=true)
 *   GET /api/cron/annual-pass-reminder?dry=1      counts who is due, sends nothing
 *   GET /api/cron/annual-pass-reminder?test=1     sends a sample to the support inbox only
 */
const MAX_PER_RUN = 20;

export const Route = createFileRoute("/api/cron/annual-pass-reminder")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const secret = process.env["ANNUAL_PASS_LINK_SECRET"];
        if (!secret || secret.length < 32)
          return Response.json(
            { ok: false, error: "ANNUAL_PASS_LINK_SECRET_not_set" },
            { status: 503 },
          );

        const [
          { renderAnnualPassReminderEmail },
          { createAnnualPassPaymentToken, configuredPayfastUrl },
          { REPLY_TO, SUPPORT_INBOX, sendViaResend },
          { SITE },
        ] = await Promise.all([
          import("@/lib/email/annual-pass-reminder"),
          import("@/lib/annual-pass-payment.server"),
          import("@/lib/email/resend.server"),
          import("@/lib/launch"),
        ]);
        if (!configuredPayfastUrl())
          return Response.json(
            { ok: false, error: "ANNUAL_PASS_PAYFAST_URL_not_set" },
            { status: 503 },
          );

        const params = new URL(request.url).searchParams;
        const payLink = (userId: string, holdExpiresAt: string) => {
          const url = new URL("/api/annual-pass/pay", SITE);
          url.searchParams.set(
            "token",
            createAnnualPassPaymentToken(userId, holdExpiresAt, secret),
          );
          return url.toString();
        };

        if (params.get("test") === "1") {
          const hold = new Date(Date.now() + 20 * 3_600_000).toISOString();
          const mail = renderAnnualPassReminderEmail({
            name: "Test",
            paymentUrl: payLink("00000000-0000-4000-8000-000000000000", hold),
            holdExpiresAt: hold,
          });
          const res = await sendViaResend({
            to: [SUPPORT_INBOX],
            subject: `[TEST] ${mail.subject}`,
            html: mail.html,
            text: mail.text,
          });
          return Response.json({ ok: res.ok, test: true, status: res.status });
        }

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        // Narrow view for the reminder function and ledger table until types.ts is regenerated.
        const db = typedAdmin as unknown as {
          rpc: (
            fn: string,
            args: Record<string, unknown>,
          ) => Promise<{
            data:
              | {
                  user_id: string;
                  recipient_email: string;
                  recipient_name: string | null;
                  hold_expires_at: string;
                  campaign: string;
                }[]
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
        const { data, error } = await db.rpc("annual_pass_reminder_recipients", {
          p_within: "24 hours",
        });
        if (error) {
          console.error("annual-pass-reminder recipients failed", error.message);
          return Response.json({ ok: false, error: "recipients_failed" }, { status: 500 });
        }
        const due = data ?? [];
        if (params.get("dry") === "1")
          return Response.json({ ok: true, dry: true, due: due.length });

        if (process.env["LAUNCH_EMAILS_ENABLED"] !== "true")
          return Response.json({ ok: true, enabled: false, sent: 0, due: due.length });

        let sent = 0;
        let failed = 0;
        const record = async (email: string, campaign: string, status: "sent" | "failed") => {
          const written = await db
            .from("founding_campaign_sends")
            .upsert(
              { email, campaign, status, sent_at: new Date().toISOString() },
              { onConflict: "email,campaign" },
            );
          const writeError = (written as { error?: { message: string } | null } | undefined)?.error;
          if (writeError)
            console.error("annual-pass-reminder ledger write failed", status, writeError.message);
          return !writeError;
        };
        for (const r of due.slice(0, MAX_PER_RUN)) {
          // Claim first: record the send BEFORE emailing. If the ledger cannot be written, nothing is sent, so a
          // broken ledger can never cause repeat emails (the 8 Nov welcome incident). If the send then fails, the
          // claim is downgraded to 'failed' so the next run retries. Worst case is a missed reminder, never a duplicate.
          if (!(await record(r.recipient_email, r.campaign, "sent"))) {
            failed += 1;
            continue;
          }
          const mail = renderAnnualPassReminderEmail({
            name: r.recipient_name ?? "",
            paymentUrl: payLink(r.user_id, r.hold_expires_at),
            holdExpiresAt: r.hold_expires_at,
          });
          const res = await sendViaResend({
            to: [r.recipient_email],
            reply_to: REPLY_TO,
            subject: mail.subject,
            html: mail.html,
            text: mail.text,
          });
          if (res.ok) {
            sent += 1;
          } else {
            failed += 1;
            console.error("annual-pass-reminder send failed", res.status, res.body);
            await record(r.recipient_email, r.campaign, "failed");
          }
        }
        console.info("annual-pass-reminder", JSON.stringify({ due: due.length, sent, failed }));
        return Response.json({ ok: true, due: due.length, sent, failed });
      },
    },
  },
});
