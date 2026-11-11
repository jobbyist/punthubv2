import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Sends one notice, per hold, to members whose unpaid Founding Annual Pass reservation has expired.
 * Transactional (a service email about a reservation the member made), one send per hold (founding_campaign_sends).
 * Safe to call repeatedly. Scheduled by pg_cron at :15 and :45 between 07:00 and 19:59 SAST.
 *
 *   GET /api/cron/annual-pass-expired            sends due notices (needs LAUNCH_EMAILS_ENABLED=true)
 *   GET /api/cron/annual-pass-expired?dry=1      counts who is due, sends nothing
 *   GET /api/cron/annual-pass-expired?test=1     sends both versions (offer open, offer closed) to the support inbox only
 */
const MAX_PER_RUN = 20;

export const Route = createFileRoute("/api/cron/annual-pass-expired")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const [
          { renderAnnualPassExpiredEmail, isOfferOpen },
          { REPLY_TO, SUPPORT_INBOX, sendViaResend },
        ] = await Promise.all([
          import("@/lib/email/annual-pass-expired"),
          import("@/lib/email/resend.server"),
        ]);
        const params = new URL(request.url).searchParams;

        if (params.get("test") === "1") {
          const expiredAt = new Date(Date.now() - 2 * 3_600_000).toISOString();
          const results: { offerOpen: boolean; ok: boolean; status: number }[] = [];
          for (const offerOpen of [true, false]) {
            const mail = renderAnnualPassExpiredEmail({
              name: "Test",
              holdExpiredAt: expiredAt,
              offerOpen,
            });
            const res = await sendViaResend({
              to: [SUPPORT_INBOX],
              subject: `[TEST ${offerOpen ? "offer open" : "offer closed"}] ${mail.subject}`,
              html: mail.html,
              text: mail.text,
            });
            results.push({ offerOpen, ok: res.ok, status: res.status });
          }
          return Response.json({ ok: results.every((r) => r.ok), test: true, results });
        }

        const { supabaseAdmin: typedAdmin } = await import("@/integrations/supabase/client.server");
        // Narrow view for the expiry function and ledger table until types.ts is regenerated.
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
        const { data, error } = await db.rpc("annual_pass_expired_recipients", {
          p_grace: "1 hour",
        });
        if (error) {
          console.error("annual-pass-expired recipients failed", error.message);
          return Response.json({ ok: false, error: "recipients_failed" }, { status: 500 });
        }
        const due = data ?? [];
        if (params.get("dry") === "1")
          return Response.json({ ok: true, dry: true, due: due.length, offerOpen: isOfferOpen() });

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
            console.error("annual-pass-expired ledger write failed", status, writeError.message);
          return !writeError;
        };
        for (const r of due.slice(0, MAX_PER_RUN)) {
          // Claim first: record the send BEFORE emailing, so a broken ledger can never cause repeat emails. If the
          // send then fails the claim is downgraded to 'failed' and the next run retries. Worst case is a missed
          // notice, never a duplicate.
          if (!(await record(r.recipient_email, r.campaign, "sent"))) {
            failed += 1;
            continue;
          }
          // Decided at send time, so the wording is right even if the offer closed after the hold lapsed.
          const mail = renderAnnualPassExpiredEmail({
            name: r.recipient_name ?? "",
            holdExpiredAt: r.hold_expires_at,
            offerOpen: isOfferOpen(),
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
            console.error("annual-pass-expired send failed", res.status, res.body);
            await record(r.recipient_email, r.campaign, "failed");
          }
        }
        console.info("annual-pass-expired", JSON.stringify({ due: due.length, sent, failed }));
        return Response.json({ ok: true, due: due.length, sent, failed });
      },
    },
  },
});
