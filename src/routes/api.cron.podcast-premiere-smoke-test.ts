import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const TEST_RECIPIENT = "support@puntr.co.za";
const IDEMPOTENCY_KEY = "puntr-good-sport-email-smoke-test-2026-11-22";

export const Route = createFileRoute("/api/cron/podcast-premiere-smoke-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const denied = checkCronAuth(request);
        if (denied) return denied;

        const { REPLY_TO, sendViaResend } = await import("@/lib/email/resend.server");
        const result = await sendViaResend(
          {
            to: TEST_RECIPIENT,
            reply_to: REPLY_TO,
            subject: "Puntr · The Good Sport email delivery test",
            text: "This is a one-off operational smoke test for The Good Sport Episode 01 premiere notification delivery. No action is required. You can safely delete this message.",
            html: "<p>This is a one-off operational smoke test for <strong>The Good Sport</strong> Episode 01 premiere notification delivery. No action is required. You can safely delete this message.</p>",
          },
          { idempotencyKey: IDEMPOTENCY_KEY },
        );

        if (!result.ok) {
          console.error("podcast-premiere-smoke-test: provider rejected request", result.status);
          return Response.json(
            { ok: false, error: "email_provider_rejected", status: result.status },
            { status: 502 },
          );
        }

        return Response.json({ ok: true, provider_accepted: true, status: result.status });
      },
    },
  },
});
