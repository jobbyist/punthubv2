/**
 * Recomputes a pick's hash in the browser so anyone can check the record without trusting Puntr.
 *
 * The database computes: sha256 of the text
 *   prev_hash + user_id + fixture_id + market + selection + line + odds + created_at
 * joined with nothing in between, where line is empty unless it is a handicap (two decimals, e.g. -6.50),
 * odds has two decimals (e.g. 2.10), and created_at is UTC as YYYY-MM-DDTHH:MM:SS.ffffffZ with six decimals.
 */

export interface HashInput {
  prev_hash: string;
  user_id: string;
  fixture_id: string;
  market: string;
  selection: string;
  line: number | string | null;
  odds: number | string;
  /** The timestamp exactly as the database returns it (keep all the microseconds). */
  created_at: string;
}

const TS =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/** To "YYYY-MM-DDTHH:MM:SS.ffffffZ" in UTC, keeping microseconds (a JavaScript Date would lose them). */
export function canonicalTimestamp(input: string): string | null {
  const m = TS.exec(input.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, frac = "", zone = "Z"] = m;
  let offsetMinutes = 0;
  if (zone !== "Z") {
    const sign = zone.startsWith("-") ? -1 : 1;
    const digits = zone.slice(1).replace(":", "");
    offsetMinutes = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || "0"));
  }
  const whole =
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)) -
    offsetMinutes * 60000;
  const iso = new Date(whole).toISOString().slice(0, 19);
  return `${iso}.${frac.padEnd(6, "0")}Z`;
}

const twoDecimals = (v: number | string) => Number(v).toFixed(2);

/** The exact text the database hashes. Null if the timestamp cannot be read. */
export function hashPreimage(p: HashInput): string | null {
  const ts = canonicalTimestamp(p.created_at);
  if (!ts) return null;
  const line = p.line === null || p.line === undefined || p.line === "" ? "" : twoDecimals(p.line);
  return `${p.prev_hash}${p.user_id}${p.fixture_id}${p.market}${p.selection}${line}${twoDecimals(p.odds)}${ts}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function computePickHash(p: HashInput): Promise<string | null> {
  const text = hashPreimage(p);
  return text === null ? null : sha256Hex(text);
}

export interface VerifyResult {
  /** The recomputed hash equals the stored one. */
  hashMatches: boolean;
  /** This pick's prev_hash equals the previous pick's stored hash (or is all zeros for the first pick). */
  linksToPrevious: boolean | null;
  recomputed: string | null;
}

const ZERO = "0".repeat(64);

export async function verifyPick(
  pick: HashInput & { hash: string },
  previousHash: string | null | undefined,
  isFirst: boolean,
): Promise<VerifyResult> {
  const recomputed = await computePickHash(pick);
  return {
    hashMatches: recomputed !== null && recomputed === pick.hash,
    linksToPrevious: isFirst
      ? pick.prev_hash === ZERO
      : previousHash
        ? pick.prev_hash === previousHash
        : null,
    recomputed,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isPickId = (v: string) => UUID.test(v.trim());
