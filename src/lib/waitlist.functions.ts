import { createServerFn } from "@tanstack/react-start";

export type UnsubscribeResult = { ok: true } | { ok: false; code: "invalid" | "error" };

/**
 * Records an unsubscribe for the waitlist email. The link in the invite carries a signed token, so only the
 * recipient can unsubscribe that address. Needs WAITLIST_LINK_SECRET and the service-role key on the server.
 */
export const unsubscribeWaitlist = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (typeof input === "object" && input !== null ? input : {}) as {
      email?: unknown;
      token?: unknown;
    };
    if (typeof o.email !== "string" || typeof o.token !== "string" || o.email.length > 254) {
      throw new Error("invalid");
    }
    return { email: o.email.trim().toLowerCase(), token: o.token };
  })
  .handler(async ({ data }): Promise<UnsubscribeResult> => {
    const { verifyUnsubscribeToken } = await import("@/lib/waitlist");
    const secret = process.env["WAITLIST_LINK_SECRET"] ?? "";
    if (!verifyUnsubscribeToken(data.email, data.token, secret))
      return { ok: false, code: "invalid" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("waitlist_unsubscribes")
      .upsert({ email: data.email }, { onConflict: "email", ignoreDuplicates: true });
    if (error) {
      console.error("unsubscribe failed", error);
      return { ok: false, code: "error" };
    }
    return { ok: true };
  });
