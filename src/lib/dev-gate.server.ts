import { createDecipheriv } from "node:crypto";

import blueprint from "@/content/dev/blueprint.enc.json";
import { deriveDevKey } from "@/lib/dev-gate.crypto";

/** Private /dev page. Server only: the ciphertext and the decrypted HTML never reach the client bundle. */

export const DEV_COOKIE = "puntr_dev";
export const DEV_SESSION_SECONDS = 12 * 60 * 60;

type Envelope = {
  v: number;
  salt: string;
  iv: string;
  tag: string;
  data: string;
  source: string;
  builtAt: string;
};

const doc = blueprint as Envelope;

export type DevDocument = { html: string; source: string; builtAt: string };

function decrypt(key: Buffer): DevDocument | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(doc.iv, "base64"));
    decipher.setAuthTag(Buffer.from(doc.tag, "base64"));
    const html = Buffer.concat([
      decipher.update(Buffer.from(doc.data, "base64")),
      decipher.final(),
    ]).toString("utf8");
    return { html, source: doc.source, builtAt: doc.builtAt };
  } catch {
    // Wrong key: the GCM tag check fails.
    return null;
  }
}

/** Checks an email + password by deriving the key and decrypting. Returns the key on success. */
export function unlockWithCredentials(email: string, password: string): Buffer | null {
  const key = deriveDevKey(email, password, Buffer.from(doc.salt, "base64"));
  return decrypt(key) ? key : null;
}

/** Session cookie value: key and expiry. httpOnly, so page scripts can never read it. */
export function encodeSession(key: Buffer, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + DEV_SESSION_SECONDS;
  return `${key.toString("base64url")}.${exp}`;
}

export function openSession(cookie: string | undefined, now = Date.now()): DevDocument | null {
  if (!cookie) return null;
  const [k, e] = cookie.split(".");
  const exp = Number(e);
  if (!k || !Number.isFinite(exp) || exp * 1000 < now) return null;
  const key = Buffer.from(k, "base64url");
  if (key.length !== 32) return null;
  return decrypt(key);
}
