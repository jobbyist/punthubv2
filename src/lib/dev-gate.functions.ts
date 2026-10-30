import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";

/**
 * Private /dev page (the MVP blueprint). Internal staff only.
 * Server modules are imported inside the handlers so they stay out of the client bundle.
 */

export type DevPageData =
  { status: "locked" } | { status: "open"; html: string; source: string; builtAt: string };

function privateHeaders() {
  setResponseHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  setResponseHeader("Cache-Control", "private, no-store");
}

export const getDevPage = createServerFn({ method: "GET" }).handler(
  async (): Promise<DevPageData> => {
    privateHeaders();
    const { DEV_COOKIE, openSession } = await import("@/lib/dev-gate.server");
    const doc = openSession(getCookie(DEV_COOKIE));
    if (!doc) return { status: "locked" };
    return { status: "open", ...doc };
  },
);

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const devSignIn = createServerFn({ method: "POST" })
  .validator((input: unknown) => signInSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    privateHeaders();
    const { DEV_COOKIE, DEV_SESSION_SECONDS, encodeSession, unlockWithCredentials } =
      await import("@/lib/dev-gate.server");
    const key = unlockWithCredentials(data.email, data.password);
    if (!key) {
      // scrypt already costs ~0.5s per attempt; a fixed pause on failure slows guessing further.
      await new Promise((r) => setTimeout(r, 750));
      return { ok: false };
    }
    setCookie(DEV_COOKIE, encodeSession(key), {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "strict",
      path: "/",
      maxAge: DEV_SESSION_SECONDS,
    });
    return { ok: true };
  });

export const devSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const { DEV_COOKIE } = await import("@/lib/dev-gate.server");
  deleteCookie(DEV_COOKIE, { path: "/" });
  return { ok: true };
});
