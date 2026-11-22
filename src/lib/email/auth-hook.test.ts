import { describe, expect, it } from "vitest";

import { buildAuthEmail, confirmUrl, safeNext } from "./auth-emails";
import { planAuthEmails, signHookPayload, verifyHookSignature } from "./auth-hook";

const SECRET_B64 = btoa("0123456789abcdef0123456789abcdef");
const SECRET = `v1,whsec_${SECRET_B64}`;

async function signed(body: string, ts: number) {
  const raw = atob(SECRET_B64);
  const key = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
  const sig = await signHookPayload(key, "msg_1", String(ts), body);
  return { id: "msg_1", timestamp: String(ts), signature: `v1,${sig}` };
}

describe("verifyHookSignature", () => {
  it("accepts a valid signature and rejects tampering, wrong secret and stale timestamps", async () => {
    const body = JSON.stringify({ a: 1 });
    const now = 1_794_000_000;
    const h = await signed(body, now);
    expect(await verifyHookSignature(SECRET, h, body, now)).toBe(true);
    expect(await verifyHookSignature(SECRET, h, body + " ", now)).toBe(false);
    expect(await verifyHookSignature(`v1,whsec_${btoa("x".repeat(32))}`, h, body, now)).toBe(false);
    expect(await verifyHookSignature(SECRET, h, body, now + 3600)).toBe(false);
    expect(await verifyHookSignature(SECRET, { ...h, signature: null }, body, now)).toBe(false);
  });
});

describe("planAuthEmails", () => {
  it("maps a magic link", () => {
    const [m] = planAuthEmails({
      user: { email: "a@b.co" },
      em¶»§q«^