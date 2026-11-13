import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Sends queued emails (admin messages, account notices, later marketing) in small batches. Every send claims the
 * shared `resend` quota, so this job, the Founding sequences and the service emails together never pass Puntr's
 * daily cap; what is left waits for the next run or the next day. pg_cron: every 15 minutes, 07:00 to 19:59 SAST.
 */
const BATCH = 15;

export const Route = createFileRoute("/api/cron/email-outbox")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        if (process.env["EMAIL_DAILY_CAP"] === "0")
          return Response.json({ ok: true, paused: true, sent: 0 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendViaResend, isEmailQuotaStop, REPLY_TO } =
          await import("@/lib/email/resend.server");
        const { outboxEmail } = await import("@/lib/email/outbox");
        const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;

        const { data: batch, error } = await db.rpc("email_outbox_claim", { p_limit: BATCH });
        if (error) {
          console.error("email-outbox: claim failed", error.message);
          return Response.json({ ok: false, error: "claim_failed" }, { status: 500 });
        }
        const rows = (batch ?? []) as {
          id: string;
          user_id: string | null;
          to_email: string | null;
          subject: string;
          body: string;
          kind: string;
        }[];

        let sent = 0;
        let failed = 0;
        let stopped = false;
        for (const row of rows) {
          let to = row.to_email;
          if (!to && row.user_id) {
            const { data: user } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
            to = user.user?.email ?? null;
          }
          if (!to) {
            await db
              .from("email_outbox")
              .update({ status: "skipped", last_error: "no address" })
              .eq("id", row.id);
            continue;
          }
          const { html, text } = outboxEmail(row.subject, row.body);
          const res = await sendViaResend({
            to,
            subject: row.subject,
            html,
            text,
            reply_to: REPLY_TO,
          });
          if (isEmailQuotaStop(res)) {
            // Put this one and the rest of the batch back for the next run.
            const left = rows.slice(rows.indexOf(row)).map((r) => r.id);
            // Release them without using up an attempt: the cap stopped them, not a failed send.
            const { error: releaseError } = await db.rpc("email_outbox_release", { p_ids: left });
            if (releaseError) console.error("email-outbox release failed", releaseError.message);
            stopped = true;
            break;
          }
          if (res.ok) {
            sent++;
            await db
              .from("email_outbox")
              .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
              .eq("id", row.id);
          } else {
            failed++;
            await db
              .from("email_outbox")
              .update({ status: "failed", last_error: `${res.status} ${res.body}`.slice(0, 300) })
              .eq("id", row.id);
          }
        }
        console.info(
          "email-outbox",
          JSON.stringify({ claimed: rows.length, sent, failed, stopped }),
        );
        return Response.json({ ok: true, claimed: rows.length, sent, failed, stopped });
      },
    },
  },
});
