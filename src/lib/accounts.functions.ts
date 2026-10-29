import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runCompleteSignup, signupSchema, type SignupResult } from "@/lib/accounts.logic";
import { runUsernameSignIn, type UsernameSignInResult } from "@/lib/username-signin.logic";

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

/**
 * Gives the signed-in member their reserved Founding number once their email is confirmed. The database checks
 * everything (confirmed email, a reservation, a free number); this only calls it with the caller's own id.
 */
export const claimFoundingSpot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ number: number | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("claim_reserved_founding", {
      p_user: context.userId,
    });
    if (error) {
      console.error("claim founding failed", error.message);
      return { number: null };
    }
    return { number: data ?? null };
  });

/**
 * Sign in with a username and password. Public (no session yet). The member's email is looked up and used on the
 * server only; the browser receives session tokens and nothing else.
 */
export const signInWithUsername = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const o = (typeof input === "object" && input !== null ? input : {}) as {
      username?: unknown;
      password?: unknown;
    };
    return {
      username: typeof o.username === "string" ? o.username.slice(0, 40) : "",
      password: typeof o.password === "string" ? o.password : "",
    };
  })
  .handler(async ({ data }): Promise<UsernameSignInResult> => {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return { ok: false, code: "unavailable" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createClient } = await import("@supabase/supabase-js");
    return runUsernameSignIn(data, {
      findProfile: async (username) => {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("id, is_banned")
          .eq("username", username)
          .maybeSingle();
        return p ? { id: p.id, isBanned: p.is_banned } : null;
      },
      emailFor: async (userId) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
        return u.user?.email ?? null;
      },
      signIn: async (email, password) => {
        const anon = createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: s, error } = await anon.auth.signInWithPassword({ email, password });
        if (error || !s.session) return { error: error?.status ?? null };
        return { accessToken: s.session.access_token, refreshToken: s.session.refresh_token };
      },
    });
  });
