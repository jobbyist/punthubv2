import { parseIdentifier } from "@/lib/identifier";

export type UsernameSignInResult =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; code: "invalid" | "rate" | "unavailable" };

export interface UsernameSignInDeps {
  /** The profile for this username, or null. */
  findProfile(username: string): Promise<{ id: string; isBanned: boolean } | null>;
  /** The sign-in email for this member. It never leaves the server. */
  emailFor(userId: string): Promise<string | null>;
  /** Password sign-in with a throw-away client. Returns the tokens, or an error status. */
  signIn(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string } | { error: number | null }>;
}

/**
 * Username + password. Supabase signs in with an email, so the server finds the email and signs in itself, then
 * hands back only the session tokens. Every failure looks the same ("invalid") so the response cannot be used to
 * learn whether a username exists, is banned, or which email it belongs to.
 */
export async function runUsernameSignIn(
  input: { username: string; password: string },
  deps: UsernameSignInDeps,
): Promise<UsernameSignInResult> {
  const id = parseIdentifier(input.username);
  if (id.kind !== "username" || !input.password || input.password.length > 200) {
    return { ok: false, code: "invalid" };
  }
  const profile = await deps.findProfile(id.value);
  if (!profile || profile.isBanned) return { ok: false, code: "invalid" };
  const email = await deps.emailFor(profile.id);
  if (!email) return { ok: false, code: "invalid" };
  const result = await deps.signIn(email, input.password);
  if ("error" in result) {
    return { ok: false, code: result.error === 429 ? "rate" : "invalid" };
  }
  return { ok: true, ...result };
}
