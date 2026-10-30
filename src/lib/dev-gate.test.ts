import { describe, expect, it } from "vitest";

import { encodeSession, openSession, unlockWithCredentials } from "@/lib/dev-gate.server";

// Uses the committed ciphertext. The real password is never in the repo, so these tests only
// prove that wrong credentials and bad or expired sessions are refused.
describe("dev gate", () => {
  it("refuses a wrong password", () => {
    expect(unlockWithCredentials("support@puntr.co.za", "wrong-password")).toBeNull();
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
});
