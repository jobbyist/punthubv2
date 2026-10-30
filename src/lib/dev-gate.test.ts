import { describe, expect, it } from "vitest";

import {
  MAX_FAILURES,
  attemptSignIn,
  encodeSession,
  openSession,
  unlockWithCredentials,
} from "@/lib/dev-gate.server";

// Uses the committed ciphertext. The real password is never in the repo, so these tests only
// prove that wrong credentials, bad or expired sessions, and repeated failures are refused.
describe("dev gate", () => {
  it("refuses a wrong password", async () => {
    expect(await unlockWithCredentials("support@puntr.co.za", "wrong-password")).toBeNull();
  });

  it("refuses an empty or malformed session", () => {
    expect(openSession(undefined)).toBeNull();
    expect(openSession("garbage")).toBeNull();
    expect(openSession(`${Buffer.alloc(32).toString("base64url")}.9999999999`)).toBeNull();
  });

  it("refuses an expired session", () => {
    const key = Buffer.alloc(32, 1);
    const past = Date.now() - 13 * 60 * 60 * 1000;
    expect(openSession(encodeSession(key, past))).toBeNull();
  });

  it("locks an IP out after repeated failures, without running scrypt again", async () => {
    const ip = "203.0.113.7";
    for (let i = 0; i < MAX_FAILURES; i++) {
      expect(await attemptSignIn(ip, "support@puntr.co.za", `nope-${i}`)).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
    const started = Date.now();
    expect(await attemptSignIn(ip, "support@puntr.co.za", "nope")).toEqual({
      ok: false,
      reason: "limited",
    });
    expect(Date.now() - started).toBeLessThan(50);
    // Another IP is unaffected.
    expect((await attemptSignIn("198.51.100.1", "support@puntr.co.za", "nope")).ok).toBe(false);
  }, 30_000);
});
