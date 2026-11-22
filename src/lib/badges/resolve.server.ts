/**
 * Server job for team badges: finds fixture and curated marquee teams without a verified badge and resolves them with Parallel
 * Search + Wikipedia, then mirrors the crest to Supabase Storage (`media/teams/...`). Quota-guarded: every Parallel
 * call claims a unit of the shared `parallel` quota, so badges never push the account past its cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { MARQUEE_BADGE_TEAMS } from "@/lib/marquee-matchups";

import {
  badgeKey,
  badgePath,
  badgeSearchRequest,
  pickCrestImage,
  wikipediaCandidates,
  type WikiSummary,
} from "@/lib/badges/resolve";

const UA = "PuntrBadgeBot/1.0 (https://puntr.co.za; support@puntr.co.za)";
const MAX_IMAGE_BYTES = 1_000_000;
const RETRY_AFTER_MS = 24 * 3600 * 1000;
const MAX_ATTEMPTS = 6;
const MARQUEE_BADGE_KEYS = new Set(
  MARQUEE_BADGE_TEAMS.map((t) => `${t.sport}:${badgeKey(t.team)}`),
);

async function db(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export interface TeamRef {
  sport: string;
  name: string;
  competition: string;
}

/** Teams in fixtures from 7 days ago to 30 days ahead, one per sport + key. */
export async function teamsInFixtures(client: SupabaseClient): Promise<TeamRef[]> {
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const to = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const { data, er¶»§q«^