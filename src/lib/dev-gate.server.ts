import { createDecipheriv } from "node:crypto";

import blueprint from "@/content/dev/blueprint.enc.json";
import { deriveDevKeyAsync } from "@/lib/dev-gate.crypto";

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
export async function unlockWithCredentials(
  email: string,
  password: string,
): Promise<Buffer | null> {
  const key = await deriveDevKeyAsync(email, password, Buffer.from(doc.salt, "base64"));
  return decrypt(key) ? key : null;
}

/*
 * Sign-in throttle. Each attempt costs 128 MiB and ~0.5 s of scrypt, so a public endpoint must bound it:
 * at most MAX_IN_FLIGHT derivations at once per server instance, and MAX_FAILURES failed attempts per
 * client IP per WINDOW_MS. In memory, so per instance: it limits load and online guessing; the passphrase
 * is still what protects the public ciphertext against offline guessing.
 */
export const MAX_IN_FLIGHT = 2;
export const MAX_FAILURES = 5;
export const WINDOW_MS = 10 * 60 * 1000;

let inFlight = 0;
const failures = new Map<string, number[]>();

export type Attempt =
  { ok: true; key: Buffer } | { ok: false; reason: "invalid" | "busy" | "limited" };

export async function attemptSignIn(
  ip: string,
  email: string,
  password: string,
  now = Date.now(),
): Promise<Attempt> {
  const recent = (failures.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_FAILURES) return { ok: false, reason: "limited" };
  if (inFlight >= MAX_IN_FLIGHT) return { ok: false, reason: "busy" };
  inFlight++;
  try {
    const key = await unlockWithCredentials(email, password);
    if (key) {
      failures.delete(ip);
      return { ok: true, key };
    }
    recent.push(now);
    failures.set(ip, recent);
    if (failures.size > 10_000) failures.clear(); // bound memory
    return { ok: false, reason: "invalid" };
  } finally {
    inFlight--;
  }
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
