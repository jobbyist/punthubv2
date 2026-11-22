import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";

type Audience = "all" | "founding" | "member" | "test";

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function targetPath(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "/predictions";
  const raw = value.trim();
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /%2f|%5c/i.test(raw))
    throw new Error("Push links must be internal Puntr paths.");
  const url = new URL(raw, "https://puntr.co.za");
  if (
    url.origin !== "https://puntr.co.za" ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/admin/")
  ) {
    throw new Error("This destination is not available for push notifications.");
  }
  return url.pathname + url.search + url.hash;
}

function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function requireVapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] || "mailto:support@puntr.co.za";
  ¶»§q«^