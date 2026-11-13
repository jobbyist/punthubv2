/**
 * Server job for team badges: finds teams in fixtures without a verified badge and resolves them with Parallel
 * Search + Wikipedia, then mirrors the crest to Supabase Storage (`media/teams/...`). Quota-guarded: every Parallel
 * call claims a unit of the shared `parallel` quota, so badges never push the account past its cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  badgeKey,
  badgePath,
  badgeSearchRequest,
  pickCrestImage,
  pickWikipediaTitle,
  type WikiSummary,
} from "@/lib/badges/resolve";

const UA = "PuntrBadgeBot/1.0 (https://puntr.co.za; support@puntr.co.za)";
const MAX_IMAGE_BYTES = 1_000_000;
const RETRY_AFTER_MS = 24 * 3600 * 1000;
const MAX_ATTEMPTS = 3;

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
  const { data, error } = await client
    .from("fixtures")
    .select("sport, competition, home, away")
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .limit(2000);
  if (error) throw new Error(error.message);
  const seen = new Map<string, TeamRef>();
  for (const f of (data ?? []) as {
    sport: string;
    competition: string;
    home: string;
    away: string;
  }[]) {
    for (const name of [f.home, f.away]) {
      const k = `${f.sport}:${badgeKey(name)}`;
      if (!seen.has(k)) seen.set(k, { sport: f.sport, name, competition: f.competition });
    }
  }
  return [...seen.values()];
}

async function fetchSummary(title: string): Promise<WikiSummary | null> {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
    {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as WikiSummary;
}

async function mirror(client: SupabaseClient, imageUrl: string, path: string): Promise<string> {
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`image ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  // PNG/JPEG/WebP only (the bucket refuses others; SVG could carry script).
  if (!/^image\/(png|jpeg|webp)/.test(type)) throw new Error(`not a PNG/JPEG/WebP image (${type})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES)
    throw new Error("image too large or empty");
  const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
  const finalPath = path.replace(/\.png$/, `.${ext}`);
  const { error } = await client.storage.from("media").upload(finalPath, bytes, {
    contentType: type.split(";")[0]!,
    upsert: true,
    cacheControl: "604800",
  });
  if (error) throw new Error(`storage: ${error.message}`);
  return client.storage.from("media").getPublicUrl(finalPath).data.publicUrl;
}

export type ResolveOutcome = "verified" | "failed" | "quota" | "skipped";

/** Resolves one team. Writes the result to team_badges either way. */
export async function resolveTeamBadge(
  client: SupabaseClient,
  team: TeamRef,
): Promise<ResolveOutcome> {
  const key = badgeKey(team.name);
  const { data: existing } = await client
    .from("team_badges")
    .select("status, attempts")
    .eq("sport", team.sport)
    .eq("team_key", key)
    .maybeSingle();
  const row = existing as { status: string; attempts: number } | null;
  if (row && (row.status === "verified" || row.status === "rejected")) return "skipped";

  const apiKey = process.env["PARALLEL_API_KEY"];
  if (!apiKey) return "quota";
  const { createQuotaClaim } = await import("@/lib/quota.server");
  if (!(await (await createQuotaClaim())("parallel"))) return "quota";

  const save = async (values: Record<string, unknown>) => {
    const { error } = await client.from("team_badges").upsert(
      {
        sport: team.sport,
        team_key: key,
        team_name: team.name,
        attempts: (row?.attempts ?? 0) + 1,
        checked_at: new Date().toISOString(),
        ...values,
      },
      { onConflict: "sport,team_key" },
    );
    if (error) console.error("team-badges: save failed", key, error.message);
  };

  try {
    const { createParallelSearch } = await import("@/lib/content/providers.server");
    const req = badgeSearchRequest(team.name, team.competition, team.sport);
    const hits = await createParallelSearch(apiKey).search({ ...req, maxResults: 8 });
    const title = pickWikipediaTitle(hits, team.name);
    if (!title) {
      await save({ status: "failed", last_error: "no Wikipedia article found" });
      return "failed";
    }
    const summary = await fetchSummary(title);
    if (!summary) {
      await save({ status: "failed", last_error: `summary unavailable for ${title}` });
      return "failed";
    }
    const crest = pickCrestImage(summary);
    if (!crest.ok) {
      await save({
        status: "failed",
        last_error: crest.reason,
        source_page: `https://en.wikipedia.org/wiki/${title}`,
      });
      return "failed";
    }
    const logoUrl = await mirror(client, crest.image, badgePath(team.sport, team.name));
    await save({
      status: "verified",
      method: "parallel_wikipedia",
      logo_url: logoUrl,
      source_page: `https://en.wikipedia.org/wiki/${title}`,
      source_image: crest.image,
      last_error: null,
      verified_at: new Date().toISOString(),
    });
    return "verified";
  } catch (error) {
    await save({
      status: "failed",
      last_error: error instanceof Error ? error.message.slice(0, 300) : "error",
    });
    return "failed";
  }
}

/** Mirrors an admin-supplied badge URL and marks it verified. */
export async function setManualBadge(team: TeamRef, url: string): Promise<string> {
  const client = await db();
  const logoUrl = await mirror(client, url, badgePath(team.sport, team.name));
  const { error } = await client.from("team_badges").upsert(
    {
      sport: team.sport,
      team_key: badgeKey(team.name),
      team_name: team.name,
      status: "verified",
      method: "manual",
      logo_url: logoUrl,
      source_image: url,
      last_error: null,
      verified_at: new Date().toISOString(),
      checked_at: new Date().toISOString(),
    },
    { onConflict: "sport,team_key" },
  );
  if (error) throw new Error(error.message);
  return logoUrl;
}

/** One cron run: up to `limit` teams that need a badge (new, or failed more than a day ago and under 3 tries). */
export async function runBadgeJob(limit = 8, force = false) {
  const client = await db();
  const teams = await teamsInFixtures(client);
  const { data: rows } = await client
    .from("team_badges")
    .select("sport, team_key, status, attempts, checked_at");
  const state = new Map(
    (
      (rows ?? []) as {
        sport: string;
        team_key: string;
        status: string;
        attempts: number;
        checked_at: string | null;
      }[]
    ).map((r) => [`${r.sport}:${r.team_key}`, r]),
  );
  const due = teams.filter((t) => {
    const r = state.get(`${t.sport}:${badgeKey(t.name)}`);
    if (!r) return true;
    if (r.status === "verified" || r.status === "rejected") return false;
    if (force) return true;
    if (r.attempts >= MAX_ATTEMPTS) return false;
    return !r.checked_at || Date.now() - new Date(r.checked_at).getTime() > RETRY_AFTER_MS;
  });
  const out = { teams: teams.length, due: due.length, verified: 0, failed: 0, quota: false };
  for (const team of due.slice(0, limit)) {
    const r = await resolveTeamBadge(client, team);
    if (r === "verified") out.verified++;
    if (r === "failed") out.failed++;
    if (r === "quota") {
      out.quota = true;
      break;
    }
  }
  return out;
}
