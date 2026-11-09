import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const PAYFAST_HOSTS = new Set([
  "www.payfast.co.za",
  "payfast.co.za",
  "www.payfast.io",
  "payfast.io",
  // PayFast hosted payment links are issued on this short domain.
  "payf.st",
]);

export function configuredPayfastUrl(): string | null {
  const value = process.env["ANNUAL_PASS_PAYFAST_URL"]?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !PAYFAST_HOSTS.has(url.hostname) ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443")
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function createAnnualPassPaymentToken(
  userId: string,
  holdExpiresAt: string,
  secret: string,
): string {
  const expiresAt = Math.floor(new Date(holdExpiresAt).getTime() / 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000))
    throw new Error("Annual Pass hold expiry is invalid");
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      exp: expiresAt,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export interface AnnualPassPaymentToken {
  userId: string;
  expiresAt: number;
}

export function verifyAnnualPassPaymentToken(
  token: string,
  secret: string,
): AnnualPassPaymentToken | null {
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedSignature, "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: unknown;
      exp?: unknown;
      nonce?: unknown;
    };
    if (
      typeof decoded.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        decoded.sub,
      ) ||
      typeof decoded.exp !== "number" ||
      !Number.isInteger(decoded.exp) ||
      typeof decoded.nonce !== "string" ||
      !/^[0-9a-f]{32}$/.test(decoded.nonce) ||
      decoded.exp <= Math.floor(Date.now() / 1000)
    )
      return null;
    return { userId: decoded.sub, expiresAt: decoded.exp };
  } catch {
    return null;
  }
}
