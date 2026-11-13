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
      email_data: {
        email_action_type: "magiclink",
        token: "123456",
        token_hash: "hash1234567890abc",
        redirect_to: "https://puntr.co.za/join",
      },
    });
    expect(m).toMatchObject({
      action: "magiclink",
      to: "a@b.co",
      code: "123456",
      tokenHash: "hash1234567890abc",
    });
  });
  it("sends two emails for a secure email change, with Supabase's reversed hash names", () => {
    const out = planAuthEmails({
      user: { email: "old@b.co", new_email: "new@b.co" },
      email_data: {
        email_action_type: "email_change",
        token: "111111",
        token_hash_new: "hash_for_current_x",
        token_new: "222222",
        token_hash: "hash_for_new_xxxx",
      },
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      to: "old@b.co",
      code: "111111",
      tokenHash: "hash_for_current_x",
    });
    expect(out[1]).toMatchObject({
      to: "new@b.co",
      code: "222222",
      tokenHash: "hash_for_new_xxxx",
      toNewAddress: true,
    });
  });
  it("ignores unknown actions", () => {
    expect(
      planAuthEmails({ user: { email: "a@b.co" }, email_data: { email_action_type: "nope" } }),
    ).toEqual([]);
  });
});

describe("auth email content", () => {
  it("keeps next paths on puntr only", () => {
    expect(safeNext("https://puntr.co.za/join", "/x")).toBe("/join");
    expect(safeNext("https://evil.example/join", "/x")).toBe("/x");
    expect(safeNext("/admin", "/x")).toBe("/x");
    expect(confirmUrl("h", "recovery", "/reset-password")).toBe(
      "https://puntr.co.za/auth/confirm?token_hash=h&type=recovery&next=%2Freset-password",
    );
  });
  it("renders the code, link, sender line and RG line, and escapes input", () => {
    const e = buildAuthEmail({
      action: "recovery",
      to: "<x>@b.co",
      code: "654321",
      tokenHash: "abc",
      next: "/reset-password",
    });
    expect(e.subject).toBe("Reset your Puntr password");
    expect(e.html).toContain("654321");
    expect(e.html).toContain("/auth/confirm?token_hash=abc&amp;type=recovery");
    expect(e.html).toContain("0800 006 008");
    expect(e.html).not.toContain("<x>");
    expect(e.text).toContain("Your code: 654321");
  });
  it("has a subject for every action", () => {
    for (const action of [
      "signup",
      "magiclink",
      "invite",
      "reauthentication",
      "password_changed_notification",
    ] as const)
      expect(
        buildAuthEmail({ action, to: "a@b.co", code: "123456", tokenHash: "h" }).subject.length,
      ).toBeGreaterThan(5);
  });
});
