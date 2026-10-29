import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runCompleteSignup, signupSchema, type SignupResult } from "@/lib/accounts.logic";

export type { SignupResult } from "@/lib/accounts.logic";

/**
 * Creates the signed-in user's profile and consent rows in one transaction (complete_signup).
 * Age is checked first, on the server. An under-18 attempt stores nothing: no profile, no birth year,
 * no consent row, and the bare auth user (the only place the email lives) is deleted.
 */
export const completeSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => signupSchema.parse(input))
  .handler(async ({ data, context }): Promise<SignupResult> => {
    const { supabase, userId } = context;
    return runCompleteSignup(data, {
      now: new Date(),
      rpc: (fn, args) => supabase.rpc(fn, args),
      discardAuthUser: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();
        if (!existing) await supabaseAdmin.auth.admin.deleteUser(userId);
      },
    });
  });

/**
 * Called when the browser has already blocked an under-18 year of birth. Sends no personal data: it only
 * removes the bare auth user (and with it the email) if no profile exists yet.
 */
export const discardUnderageSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing) return { ok: false };
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    return { ok: !error };
  });

/**
 * Account deletion. anonymise_account removes email-linked data from the profile, switches marketing off,
 * deletes any waitlist row and writes the consent withdrawals; then the auth user (which holds the email) is
 * deleted. Picks stay on the public record under a deleted-xxxx name so the hash chain still verifies.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean }> => {
    const { userId, claims } = context;
    const email = typeof claims["email"] === "string" ? (claims["email"] as string) : null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.rpc("anonymise_account", {
      p_user: userId,
      p_email: email ?? "",
    });
    if (error) {
      console.error("anonymise_account failed", error);
      return { ok: false };
    }
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("deleteUser failed", authError);
      return { ok: false };
    }
    return { ok: true };
  });
