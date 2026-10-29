/**
 * Waitlist invite logic. Relative imports only, so the invite script can run under Bun.
 *
 * The invite is ONE service email about the early access the person asked for. It carries no promotion, partner
 * content or giveaway. Later marketing goes only to members who ticked the unticked box on /join.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SITE = "https://puntr.co.za";

export function unsubscribeToken(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`unsubscribe:${email.trim().toLowerCase()}`)
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string, secret: string): boolean {
  if (!secret || !/^[0-9a-f]{64}$/.test(token)) return false;
  const expected = Buffer.from(unsubscribeToken(email, secret), "hex");
  const given = Buffer.from(token, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function unsubscribeUrl(email: string, secret: string): string {
  const e = email.trim().toLowerCase();
  return `${SITE}/unsubscribe?e=${encodeURIComponent(e)}&t=${unsubscribeToken(e, secret)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SkipReason =
  "invalid" | "duplicate" | "already_invited" | "unsubscribed" | "privacy_request";

export interface InvitePlan {
  /** Unique, lower-case addresses to email. */
  recipients: string[];
  skipped: Record<SkipReason, number>;
}

/**
 * Who to invite. Dedupes by lower-case email and skips anyone invalid, already emailed, unsubscribed, or with a
 * privacy request on file (any kind).
 */
export function planInvites(input: {
  waitlist: string[];
  alreadyInvited: Iterable<string>;
  unsubscribed: Iterable<string>;
  privacyRequests: Iterable<string>;
}): InvitePlan {
  const lower = (xs: Iterable<string>) => new Set([...xs].map((x) => x.trim().toLowerCase()));
  const invited = lower(input.alreadyInvited);
  const unsub = lower(input.unsubscribed);
  const privacy = lower(input.privacyRequests);
  const seen = new Set<string>();
  const skipped: Record<SkipReason, number> = {
    invalid: 0,
    duplicate: 0,
    already_invited: 0,
    unsubscribed: 0,
    privacy_request: 0,
  };
  const recipients: string[] = [];
  for (const raw of input.waitlist) {
    const email = (raw ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) skipped.invalid++;
    else if (seen.has(email)) skipped.duplicate++;
    else {
      seen.add(email);
      if (invited.has(email)) skipped.already_invited++;
      else if (unsub.has(email)) skipped.unsubscribed++;
      else if (privacy.has(email)) skipped.privacy_request++;
      else recipients.push(email);
    }
  }
  return { recipients, skipped };
}
