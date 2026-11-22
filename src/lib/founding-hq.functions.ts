import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: SupabaseClient; userId: string };
type Fail = { ok: false; code: "forbidden" | "invalid" | "not_found" | "error"; message?: string };
type Segment = "punter" | "tipster" | "hybrid" | "community_admin";
type Stage =
  | "new"
  | "engaged"
  | "contacted"
  | "replied"
  | "interested"
  | "link_sent"
  | "follow_up"
  | "registered"
  | "not_interested"
  | "do_not_contact";
type AmbassadorStage =
  | "not_approached"
  | "identified"
  | "approached"
  | "in_discussion"
  | "agreed"
  | "active"
  | "declined";

const SEGMENTS: Segment[] = ["punter", "tipster", "hybrid", "community_admin"];
const STAGES: Stage[] = [
  "new",
  "engaged",
  "contacted",
  "replied",
  "interested",
  "link_sent",
  "follow_up",
  "registered",
  "not_interested",
  "do_not_contact",
];
const AMBASSADOR_STAGES: AmbassadorStage[] = [
  "not_approached",
  "identified",
  "approached",
  "in_discussion",
  "agreed",
  "active",
  "declined",
];

async function adminDb(context: Ctx): Promise<SupabaseClient | null> {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

async function logAdminAction(
  db:¶»§q«^