import { describe, expect, it, vi } from "vitest";

import { runUsernameSignIn, type UsernameSignInDeps } from "./username-signin.logic";

const deps = (over: Partial<UsernameSignInDeps> = {}): UsernameSignInDeps => ({
  findProfile: async () => ({ id: "u1", isBanned: false }),
  emailFor: async () => "jane@example.com",
  signIn: async () => ({ accessToken: "a", refreshToken: "r" }),
  ...over,
});

describe("runUsernameSignIn", () => {
  it("returns the tokens and passes the member's email to the sign-in, not back to the caller", async () => {
    const signIn = vi.fn(async () => ({ accessToken: "a", refreshToken: "r" }));
    const r = await runUsernameSignIn({ username: "Tip_One", password: "pw" }, deps({ signIn }));
    expect(r).toEqual({ ok: true, accessToken: "a", refreshToken: "r" });
    expect(signIn).toHaveBeenCalledWith("jane@example.com", "pw");
    expect(JSON.stringify(r)).not.toContain("jane@example.com");
  });

  it("looks identical for an unknown name, a banned member, a missing email and a wrong password", async () => {
    const bad = { ok: false, code: "invalid" };
    expect(
      await runUsernameSignIn(
        { username: "nobody", password: "pw" },
        deps({ findProfile: async () => null }),
      ),
    ).toEqual(bad);
    expect(
      await runUsernameSignIn(
        { username: "banned", password: "pw" },
        deps({ findProfile: async () => ({ id: "u", isBanned: true }) }),
      ),
    ).toEqual(bad);
    expect(
      await runUsernameSignIn(
        { username: "noemail", password: "pw" },
        deps({ emailFor: async () => null }),
      ),
    ).toEqual(bad);
    expect(
      await runUsernameSignIn(
        { username: "tip_one", password: "wrong" },
        deps({ signIn: async () => ({ error: 400 }) }),
      ),
    ).toEqual(bad);
  });

  it("refuses an email address or junk in the username box, without a lookup", async () => {
    const findProfile = vi.fn(async () => null);
    expect(
      await runUsernameSignIn({ username: "a@b.co", password: "pw" }, deps({ findProfile })),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await runUsernameSignIn({ username: "x", password: "pw" }, deps({ findProfile })),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await runUsernameSignIn({ username: "tip_one", password: "" }, deps({ findProfile })),
    ).toEqual({ ok: false, code: "invalid" });
    expect(findProfile).not.toHaveBeenCalled();
  });

  it("reports rate limiting", async () => {
    expect(
      await runUsernameSignIn(
        { username: "tip_one", password: "pw" },
        deps({ signIn: async () => ({ error: 429 }) }),
      ),
    ).toEqual({ ok: false, code: "rate" });
  });
});
