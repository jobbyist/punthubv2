/**
 * Pure account-creation logic, separated from the server function so it can be tested with fakes.
 * `deps` are the user-scoped Supabase client (RLS) and a function that deletes an auth user (service role).
 */
import { z } from "zod";

export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,20}$/),
  birthYear: z.number().int().min(1900).max(3000),
  language: z.enum(["en-ZA", "af", "zu", "xh"]),
  marketingEmail: z.boolean(),
  marketingWhatsapp: z.boolean(),
  ref: z.string().trim().max(32).nullable(),
});
export type SignupInput = z.infer<typeof signupSchema>;

export type SignupResult =
  | { ok: true; foundingNumber: number | null }
  | {
      ok: false;
      code: "under_18" | "username_taken" | "invalid_username" | "already_has_profile" | "error";
    };

export interface SignupDeps {
  now: Date;
  rpc: (
    fn: "complete_signup",
    args: {
      p_username: string;
      p_birth_year: number;
      p_language: string;
      p_marketing_email: boolean;
      p_marketing_whatsapp: boolean;
      p_ref: string;
    },
  ) => PromiseLike<{ data: number | null; error: { message: string } | null }>;
  /** Removes the bare auth user (and with it the email) when no profile exists. */
  discardAuthUser: () => Promise<void>;
}

export async function runCompleteSignup(
  data: SignupInput,
  deps: SignupDeps,
): Promise<SignupResult> {
  // Age is checked first and on the server. Nothing is written for an under-18 attempt.
  if (data.birthYear > deps.now.getUTCFullYear() - 18) {
    await deps.discardAuthUser();
    return { ok: false, code: "under_18" };
  }

  const { data: founding, error } = await deps.rpc("complete_signup", {
    p_username: data.username,
    p_birth_year: data.birthYear,
    p_language: data.language,
    p_marketing_email: data.marketingEmail,
    p_marketing_whatsapp: data.marketingWhatsapp,
    p_ref: data.ref ?? "",
  });

  if (error) {
    if (error.message === "under_18") {
      await deps.discardAuthUser();
      return { ok: false, code: "under_18" };
    }
    if (
      error.message === "username_taken" ||
      error.message === "invalid_username" ||
      error.message === "already_has_profile"
    ) {
      return { ok: false, code: error.message };
    }
    return { ok: false, code: "error" };
  }
  return { ok: true, foundingNumber: founding };
}
