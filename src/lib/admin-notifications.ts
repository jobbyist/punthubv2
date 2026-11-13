/** Validation for notifications composed by hand in Admin > Notifications. Pure, so it is unit-tested. */

export const NOTIFICATION_CATEGORIES = [
  "Announcements",
  "Founding",
  "Product",
  "Rewards",
  "Practice",
  "Account",
  "Events",
] as const;

export type NotificationAudience = "all" | "founding" | "member";

export interface NotificationInput {
  title: string;
  message: string;
  category: string;
  targetUrl: string | null;
  audience: NotificationAudience;
  username: string | null;
  publishAt: string | null;
}

const MAX_SCHEDULE_DAYS = 60;

/** A link is an in-app path ("/founding") or an https URL. Protocol-relative and javascript: links are refused. */
export function cleanTargetUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (v.length > 300) throw new Error("link too long");
  if (v.startsWith("/") && !v.startsWith("//") && !/\s/.test(v)) return v;
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new Error("invalid link");
  }
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("invalid link");
  // Same-site https links become in-app paths so the bell navigates without a page reload.
  if (url.hostname === "puntr.co.za" || url.hostname === "www.puntr.co.za")
    return `${url.pathname}${url.search}${url.hash}` || "/";
  return url.toString();
}

export function parseNotificationInput(input: unknown, now = Date.now()): NotificationInput {
  const o = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const title = typeof o["title"] === "string" ? o["title"].trim() : "";
  const message = typeof o["message"] === "string" ? o["message"].trim() : "";
  if (title.length < 3 || title.length > 140) throw new Error("title must be 3-140 characters");
  if (message.length < 3 || message.length > 400)
    throw new Error("message must be 3-400 characters");
  const category = (NOTIFICATION_CATEGORIES as readonly string[]).includes(String(o["category"]))
    ? String(o["category"])
    : "Announcements";
  const audience: NotificationAudience = ["all", "founding", "member"].includes(
    String(o["audience"]),
  )
    ? (String(o["audience"]) as NotificationAudience)
    : "all";
  let username: string | null = null;
  if (audience === "member") {
    const u = typeof o["username"] === "string" ? o["username"].trim().replace(/^@/, "") : "";
    if (!/^[a-z0-9_.-]{2,40}$/i.test(u)) throw new Error("valid username required");
    username = u.toLowerCase();
  }
  let publishAt: string | null = null;
  if (typeof o["publishAt"] === "string" && o["publishAt"].trim()) {
    const t = Date.parse(o["publishAt"]);
    if (Number.isNaN(t)) throw new Error("invalid schedule time");
    if (t > now + MAX_SCHEDULE_DAYS * 86_400_000) throw new Error("schedule too far ahead");
    // A time in the past (or within a minute) simply sends now.
    publishAt = t > now + 60_000 ? new Date(t).toISOString() : null;
  }
  return {
    title,
    message,
    category,
    targetUrl: cleanTargetUrl(o["targetUrl"]),
    audience,
    username,
    publishAt,
  };
}
