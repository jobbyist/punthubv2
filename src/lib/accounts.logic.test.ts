import { describe, expect, it, vi } from "vitest";

import { runCompleteSignup, signupSchema, type SignupDeps } from "./accounts.logic";

const NOW = new Date("2026-10-30T10:00:00Z");
const base = {
  username: "tip_one",
  birthYear: 1990,
  language: "en-ZA" as const,
  marketingEmail: false,
  marketingWhatsapp: false,
  ref: null,
};

function deps(
  overrides: Partial<SignupDeps> = {},
): SignupDeps & { rpc: ReturnType<typeof vi.fn>; discardAuthUser: ReturnType<typeof vi.fn> } {
  return {
    now: NOW,
    rpc: vi.fn().mockResolvedValue({ data: 23, error: null }),
    discardAuthUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as never;
}

describe("runCompleteSignup", () => {
  it("returns the founding number on success and passes choices through", async () => {
    const d = deps();
    const out = await runCompleteSignup({ ...base, marketingEmail: true, ref: "abc123" }, d);
    expect(out).toEqual({ ok: true, foundingNumber: 23 });
    expect(d.rpc).toHaveBeenCalledWith("complete_signup", {
      p_username: "tip_one",
      p_birth_year: 1990,
      p_language: "en-ZA",
      p_marketing_email: true,
      p_marketing_whatsapp: false,
      p_ref: "abc123",
    });
    expect(d.discardAuthUser).not.toHaveBeenCalled();
  });

  it("returns a null founding number once spots are full", async () => {
    const d = deps({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) } as never);
    expect(await runCompleteSignup(base, d)).toEqual({ ok: true, foundingNumber: null });
  });

  it("blocks under 18 before any write and discards the bare sign-in", async () => {
    const d = deps();
    const out = await runCompleteSignup({ ...base, birthYear: 2012 }, d);
    expect(out).toEqual({ ok: false, code: "under_18" });
    expect(d.rpc).not.toHaveBeenCalled();
    expect(d.discardAuthUser).toHaveBeenCalledTimes(1);
  });

  it("allows someone who turns 18 this calendar year only by the birth-year rule", async () => {
    const d = deps();
    expect((await runCompleteSignup({ ...base, birthYear: 2008 }, d)).ok).toBe(true);
    expect((await runCompleteSignup({ ...base, birthYear: 2009 }, d)).ok).toBe(false);
  });

  it("also discards when the database reports under_18", async () => {
    const d = deps({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "under_18" } }),
    } as never);
    expect(await runCompleteSignup(base, d)).toEqual({ ok: false, code: "under_18" });
    expect(d.discardAuthUser).toHaveBeenCalledTimes(1);
  });

  it.each(["username_taken", "invalid_username", "already_has_profile"] as const)(
    "maps %s",
    async (code) => {
      const d = deps({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: code } }),
      } as never);
      expect(await runCompleteSignup(base, d)).toEqual({ ok: false, code });
      expect(d.discardAuthUser).not.toHaveBeenCalled();
    },
  );

  it("hides unknown database errors behind a generic code", async () => {
    const d = deps({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom: secret detail" } }),
    } as never);
    expect(await runCompleteSignup(base, d)).toEqual({ ok: false, code: "error" });
  });
});

describe("signupSchema", () => {
  it("lower-cases and trims the username", () => {
    expect(signupSchema.parse({ ...base, username: "  Tip_One " }).username).toBe("tip_one");
  });
  it("rejects bad usernames, years and languages", () => {
    expect(() => signupSchema.parse({ ...base, username: "a b" })).toThrow();
    expect(() => signupSchema.parse({ ...base, username: "ab" })).toThrow();
    expect(() => signupSchema.parse({ ...base, birthYear: 1800 })).toThrow();
    expect(() => signupSchema.parse({ ...base, language: "fr" })).toThrow();
  });
});
