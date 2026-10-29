/** Password rules for email + password sign-up. Returns a translation key suffix, or null when the password is fine. */
export type PasswordProblem = "short" | "long" | "sameAsEmail" | "common";

export const PASSWORD_MIN = 8;
// bcrypt, which Supabase uses, ignores everything after 72 bytes.
export const PASSWORD_MAX = 72;

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "qwertyuiop",
  "iloveyou",
  "letmein1",
  "welcome1",
  "admin123",
  "puntr123",
  "football",
  "11111111",
  "00000000",
  "abc12345",
  "passw0rd",
]);

export function validatePassword(password: string, email: string): PasswordProblem | null {
  if (password.length < PASSWORD_MIN) return "short";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) return "long";
  const lower = password.toLowerCase();
  const e = email.trim().toLowerCase();
  if (e && (lower === e || lower === e.split("@")[0])) return "sameAsEmail";
  if (COMMON.has(lower)) return "common";
  return null;
}
