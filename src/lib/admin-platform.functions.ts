/**
 * Admin portal server functions (migration 20261113170000): members and account controls, action log, analytics,
 * API quotas, launch and wallet settings, scoring rules, system health.
 *
 * Every function checks is_admin() on the server and writes one admin_actions row for each change. The service-role
 * client is used only after that check.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };
type Result<T = undefined> =
  { ok: true; data?: T } | { ok: false; code: "forbidden" | "invalid" | "error"; message?: string };

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function logAction(
  db: SupabaseClient,
  adminId: string,
  action: string,
  targetUser: string | null,
  detail: Record<string, unknown> = {},
  target: string | null = null,
): Promise<void> {
  const { error } = await db
    .from("admin_actions")
    .insert({ admin_id: adminId, action, target_user: ta¶»§q«^