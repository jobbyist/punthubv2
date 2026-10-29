/** The sign-in box accepts an email address or a username. */
export type Identifier =
  { kind: "email"; value: string } | { kind: "username"; value: string } | { kind: "invalid" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export function parseIdentifier(raw: string): Identifier {
  const v = raw.trim().toLowerCase().replace(/^@/, "");
  if (v.includes("@")) return EMAIL_RE.test(v) ? { kind: "email", value: v } : { kind: "invalid" };
  return USERNAME_RE.test(v) ? { kind: "username", value: v } : { kind: "invalid" };
}
