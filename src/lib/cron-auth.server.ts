import { timingSafeEqual } from "node:crypto";

/**
 * Cron routes require `Authorization: Bearer ${CRON_SECRET}`. With no CRON_SECRET configured every call is
 * refused, so a missing variable can never leave a route open.
 */
export function checkCronAuth(request: Request): Response | null {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return Response.json({ ok: false, error: "cron_not_configured" }, { status: 503 });
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  return null;
}
