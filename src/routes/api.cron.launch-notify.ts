import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/launch-notify")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const secret = process.env["WAITLIST_LINK_SECRET"];
        if (!secret) {
          return Response.json(
            { ok: false, error: "WAITLIST_LINK_SECRET_not_set" },
            { status: 503 },
          );
        }
        const { runLaunchNotify } = await import("@/lib/launch-notify.server");
        const { createLaunchStore } = await import("@/lib/launch-notify-store.server");
        const { REPLY_TO, sendViaResend } = await import("@/lib/email/resend.server");
        const { unsubscribeUrl } = await import("@/lib/waitlist");
        try {
          const report = await runLaunchNotify({
            launchDateEnv: process.env["LAUNCH_DATE"],
            enabled: process.env["LAUNCH_EMAILS_ENABLED"] === "true",
            store: createLaunchStore(),
            send: sendViaResend,
            unsubscribeUrl: (email) => unsubscribeUrl(email, secret),
            replyTo: REPLY_TO,
          });
          console.info("launch-notify", JSON.stringify(report));
          return Response.json(report);
        } catch (error) {
          console.error("launch-notify failed", error);
          return Response.json({ ok: false, error: "launch_notify_failed" }, { status: 500 });
        }
      },
    },
  },
});
