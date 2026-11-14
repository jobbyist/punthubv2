import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestHeader,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { z } from "zod";

import type { ReadinessSnapshot } from "@/lib/mvp-readiness";

/**
 * Private /dev page (the MVP blueprint). Internal staff only.
 * Server modules are imported inside the handlers so they stay out of the client bundle.
 */

export type DevPageData =
  | { status: "locked" }
  | {
      status: "open";
      html: string;
      source: string;
      builtAt: string;
      readiness: ReadinessSnapshot;
    };

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
    const { readSnapshot } = await import("@/lib/mvp-readiness.server");
    const { sanitizeBlueprintHtml } = await import("@/lib/dev-sanitize");
    // Defence in depth: the archived blueprint never reaches the browser with active content.
    return {
      status: "open",
      ...doc,
      html: sanitizeBlueprintHtml(doc.html),
      readiness: await readSnapshot(),
    };
  },
);

export type DevSignInResult = { ok: true } | { ok: false; reason: "invalid" | "busy" | "limited" };

const signInSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});

export const devSignIn = createServerFn({ method: "POST" })
  .validator((input: unknown) => signInSchema.parse(input))
  .handler(async ({ data }): Promise<DevSignInResult> => {
    privateHeaders();
    const { DEV_COOKIE, DEV_SESSION_SECONDS, attemptSignIn, encodeSession } =
      await import("@/lib/dev-gate.server");
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      "unknown";
    const res = await attemptSignIn(ip, data.email, data.password);
    if (!res.ok) {
      // A fixed pause on failure slows guessing further.
      if (res.reason === "invalid") await new Promise((r) => setTimeout(r, 750));
      return { ok: false, reason: res.reason };
    }
    const key = res.key;
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

const taskSchema = z.object({
  taskId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  done: z.boolean(),
});

/** Ticks or unticks a manual checklist task. Needs a valid /dev session (same gate as the page). */
export const setDevReadinessTask = createServerFn({ method: "POST" })
  .validator((input: unknown) => taskSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: "locked" | "failed" }> => {
    privateHeaders();
    const { DEV_COOKIE, openSession } = await import("@/lib/dev-gate.server");
    if (!openSession(getCookie(DEV_COOKIE))) return { ok: false, reason: "locked" };
    const { writeTask } = await import("@/lib/mvp-readiness.server");
    const res = await writeTask(data.taskId, data.done);
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  });
