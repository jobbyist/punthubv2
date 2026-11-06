import { createFileRoute } from "@tanstack/react-router";

/**
 * Expiring, signed gate in front of the owner-configured PayFast hosted link.
 * A payment link is valid only while its signed 48-hour token matches the member's live pending hold.
 */
export const Route = createFileRoute("/api/annual-pass/pay")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("token");
        const secret = process.env["ANNUAL_PASS_LINK_SECRET"];
        if (!token || !secret)
          return new Response("This Annual Pass payment link is invalid or has expired.", { status: 410 });

        const { verifyAnnualPassPaymentToken, configuredPayfastUrl } =
          await import("@/lib/annual-pass-payment.server");
        const verified = verifyAnnualPassPaymentToken(token, secret);
        if (!verified)
          return new Response("This Annual Pass payment link is invalid or has expired.", { status: 410 });

        const { supabaseAdmin: adminClient } =
          await import("@/integrations/supabase/client.server");
        const db = adminClient as unknown as {
          from: (table: string) => {
            select: (columns: string) => {
              eq: (column: string, value: string) => {
                maybeSingle: () => Promise<{
                  data: { status: string; hold_expires_at: string | null } | null;
                  error: { message: string } | null;
                }>;
              };
            };
          };
        };
        const { data, error } = await db
          .from("annual_pass_claims")
          .select("status, hold_expires_at")
          .eq("user_id", verified.userId)
          .maybeSingle();
        if (error) {
          console.error("Annual Pass payment link lookup failed", error.message);
          return new Response("We could not verify this reservation. Please contact support@puntr.co.za.", {
            status: 503,
          });
        }

        const holdExpiry = data?.hold_expires_at
          ? Math.floor(new Date(data.hold_expires_at).getTime() / 1000)
          : 0;
        if (
          data?.status !== "pending" ||
          !holdExpiry ||
          holdExpiry !== verified.expiresAt ||
          holdExpiry <= Math.floor(Date.now() / 1000)
        ) return new Response("This Annual Pass payment window has expired. Please make a new reservation if the offer is still open.", {
          status: 410,
        });

        const payfastUrl = configuredPayfastUrl();
        if (!payfastUrl)
          return new Response("PayFast checkout is temporarily unavailable. Please contact support@puntr.co.za.", {
            status: 503,
          });
        return Response.redirect(payfastUrl, 303);
      },
    },
  },
});
