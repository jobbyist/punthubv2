import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const EPISODE_SLUG = "the-good-sport-episode-01";
const PREMIERE_AT = Date.parse("2027-01-05T06:55:00Z"); // 09:00 SAST premiere on 5 January 2027
const PREMIERE_WINDOW_END = Date.parse("2027-01-05T11:05:00Z"); // Retry window closes at 13:05 SAST

export const Route = createFileRoute("/api/cron/podcast-premiere")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;
        if (Date.now() < PREMIERE_AT) {
          return Response.json({ ok: true, status: "waiting_for_premiere" });
        }
        if (Date.now() > PREMIERE_WINDOW_END) {
          return Response.json({ ok: true, status: "premiere_window_closed" });
        }

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key)
          return Response.json({ ok: false, error: "supabase_not_configured" }, { status: 503 });

        const headers = { apikey: key, Authorization: `Bearer ${key}` };
        const pendingResponse = await fetch(
          `${url}/rest/v1/podcast_episode_notifications?select=id,email&episode_slug=eq.${EPISODE_SLUG}&notified_at=is.null&limit=200`,
          { headers },
        );
        if (!pendingResponse.ok) {
          console.error("podcast-premiere: recipient lookup failed", pendingResponse.status);
          return Response.json({ ok: false, error: "recipient_lookup_failed" }, { status: 502 });
        }
        const recipients = (await pendingResponse.json()) as Array<{ id: string; email: string }>;
        if (recipients.length === 0) return Response.json({ ok: true, sent: 0, failed: 0 });

        const { REPLY_TO, sendViaResend } = await import("@/lib/email/resend.server");
        let sentCount = 0;
        let failedCount = 0;
        for (const recipient of recipients) {
          const email = await sendViaResend({
            to: recipient.email,
            reply_to: REPLY_TO,
            subject: "The Good Sport is live — Episode 01",
            text: "The wait is over. The Good Sport Episode 01 is now live. Listen here: https://puntr.co.za/the-good-sport/episode-01\n\nYou asked us to notify you when this episode was released. This is the one-off alert you requested.",
            html: '<div style="margin:0;background:#0b100c;padding:32px 16px;font-family:Arial,sans-serif;color:#fff"><div style="max-width:560px;margin:0 auto;border:1px solid #243629;border-radius:20px;padding:32px;background:#101710"><p style="margin:0;color:#4ade80;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase">PUNTR ORIGINAL PODCAST</p><h1 style="margin:18px 0 8px;font-size:34px;line-height:1.05">THE GOOD SPORT<span style="color:#4ade80">.</span></h1><p style="color:#c6d0c8;font-size:15px;line-height:1.6">The wait is over. Episode one is now live — the stories, stats and split-second decisions that shape the way we see sport.</p><a href="https://puntr.co.za/the-good-sport/episode-01" style="display:inline-block;margin-top:16px;border-radius:10px;background:#16a34a;padding:14px 20px;color:#fff;font-weight:700;text-decoration:none">Listen to episode one</a><p style="margin-top:28px;color:#87958a;font-size:11px;line-height:1.6">You received this one-off alert because you requested to be notified about The Good Sport Episode 01. No other marketing emails are included in this signup.</p></div></div>',
          }, { idempotencyKey: `puntr-podcast-premiere:${EPISODE_SLUG}:${recipient.id}` });
          if (!email.ok) {
            failedCount += 1;
            console.error("podcast-premiere: email send failed", email.status, email.body);
            continue;
          }
          const marked = await fetch(
            `${url}/rest/v1/podcast_episode_notifications?id=eq.${encodeURIComponent(recipient.id)}&notified_at=is.null`,
            {
              method: "PATCH",
              headers: { ...headers, "Content-Type": "application/json", Prefer: "return=minimal" },
              body: JSON.stringify({ notified_at: new Date().toISOString() }),
            },
          );
          if (!marked.ok) {
            failedCount += 1;
            console.error(
              "podcast-premiere: sent email but could not mark recipient",
              marked.status,
            );
            continue;
          }
          sentCount += 1;
        }
        console.info("podcast-premiere", JSON.stringify({ sent: sentCount, failed: failedCount }));
        return Response.json(
          { ok: failedCount === 0, sent: sentCount, failed: failedCount },
          { status: failedCount ? 207 : 200 },
        );
      },
    },
  },
});
