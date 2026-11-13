import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Supabase Auth Send Email Hook (Dashboard > Authentication > Hooks > Send Email, HTTPS):
 *   URL    https://puntr.co.za/api/auth/send-email
 *   Secret the "v1,whsec_..." value from the dashboard, stored in Vercel as SEND_EMAIL_HOOK_SECRET.
 * Every auth email (sign-up confirmation, passwordless sign-in, password reset, email change, invite,
 * re-authentication, security notices) is rendered with Puntr branding and sent through Resend from
 * "Puntr - South Africa <support@puntr.co.za>". A non-200 answer makes Supabase report the send as failed.
 */
const hookError = (status: number, message: string) =>
  Response.json({ error: { http_code: status, message } }, { status });

export const Route = createFileRoute("/api/auth/send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SEND_EMAIL_HOOK_SECRET"];
        if (!secret) {
          console.error("auth hook: SEND_EMAIL_HOOK_SECRET is not set");
          return hookError(500, "Email hook not configured");
        }
        const body = await request.text();
        if (body.length > 64_000) return hookError(413, "Payload too large");
        const { verifyHookSignature, planAuthEmails } = await import("@/lib/email/auth-hook");
        const valid = await verifyHookSignature(
          secret,
          {
            id: request.headers.get("webhook-id"),
            timestamp: request.headers.get("webhook-timestamp"),
            signature: request.headers.get("webhook-signature"),
          },
          body,
        );
        if (!valid) return hookError(401, "Invalid signature");

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return hookError(400, "Invalid JSON");
        }
        const messages = planAuthEmails(payload);
        if (messages.length === 0) {
          // Unknown or unsupported action: accept so Supabase does not block the user, and log it.
          console.warn("auth hook: nothing to send for this action");
          return Response.json({});
        }

        const { buildAuthEmail } = await import("@/lib/email/auth-emails");
        const { sendAuthViaResend, REPLY_TO } = await import("@/lib/email/resend.server");
        for (const m of messages) {
          const email = buildAuthEmail(m);
          const res = await sendAuthViaResend({
            to: [m.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
            reply_to: REPLY_TO,
            headers: { "X-Entity-Ref-ID": crypto.randomUUID() },
            tags: [{ name: "category", value: `auth_${m.action}` }],
          });
          if (!res.ok) {
            // Never log the address, code or link.
            console.error(
              "auth hook: Resend refused",
              m.action,
              res.status,
              res.body.slice(0, 200),
            );
            return hookError(502, "Could not send the email. Please try again in a minute.");
          }
        }
        return Response.json({});
      },
    },
  },
});
