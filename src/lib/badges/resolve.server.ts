/**
 * Server job for team badges: finds fixture, league-table and curated marquee teams without a verified badge and resolves
 * them with Parallel Search (SofaScore first, official team/league pages second, Wikipedia fallback), then mirrors the crest to Supabase Storage
 * (`media/teams/...`). Spare capacity upgrades Wikipedia badges to SofaScore crests. Quota-guarded: every Parallel
 * call claims a unit of the shared `parallel` quota, so badges never push the account past its cap.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { deflateSync, inflateSync } from "node:zlib";

import { MARQUEE_BADGE_TEAMS } from "@/lib/marquee-matchups";

import {
  badgeKey,
  validBadgeTeamName,
  badgePath,
  badgeSearchRequest,
  isOfficialBadgeSource,
  isSofascoreImageHost,
  pickCrestImage,
  sofascoreCandidates,
  sofascoreImageUrls,
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
      // PFIE can contain an empty team label when a source row is malformed. Never create an empty badge key.
      if (!validBadgeTeamName(name)) continue;
      const k = `${f.sport}:${badgeKey(name)}`;
      if (!seen.has(k))
        seen.set(k, { sport: f.sport, name: name.trim(), competition: f.competition });
    }
  }
  // Every team in a stored league table too, so the team directory has badges for teams without a fixture soon.
  const { data: tables } = await client
    .from("league_standings")
    .select("competition, team")
    .limit(2000);
  for (const r of (tables ?? []) as { competition: string; team: string }[]) {
    if (!validBadgeTeamName(r.team)) continue;
    const k = `soccer:${badgeKey(r.team)}`;
    if (!seen.has(k))
      seen.set(k, { sport: "soccer", name: r.team.trim(), competition: r.competition });
  }
  for (const item of MARQUEE_BADGE_TEAMS) {
    const k = `${item.sport}:${badgeKey(item.team)}`;
    if (!seen.has(k))
      seen.set(k, { sport: item.sport, name: item.team, competition: item.competition });
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

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function pngCrc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBytes, data]);
  const out = Buffer.allocUnsafe(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(pngCrc32(body), data.length + 8);
  return out;
}

/** Re-encodes common 8-bit RGB/RGBA PNG crests at zlib level 9 and drops non-visual metadata. */
function compressPng(input: Uint8Array): Uint8Array {
  const source = Buffer.from(input);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (source.length < 33 || !source.subarray(0, 8).equals(signature)) return input;

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colourType = 0;
  let interlace = 0;
  const imageData: Buffer[] = [];
  const keep: { type: string; data: Buffer }[] = [];
  for (let offset = 8; offset + 12 <= source.length;) {
    const length = source.readUInt32BE(offset);
    const type = source.toString("ascii", offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > source.length) return input;
    const data = source.subarray(start, end);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colourType = data[9] ?? 0;
      interlace = data[12] ?? 0;
    } else if (type === "IDAT") imageData.push(data);
    else if (["PLTE", "tRNS", "sRGB", "gAMA", "cHRM"].includes(type)) keep.push({ type, data });
    if (type === "IEND") break;
    offset = end + 4;
  }
  const channels = colourType === 6 ? 4 : colourType === 2 ? 3 : 0;
  if (!width || !height || bitDepth !== 8 || !channels || interlace !== 0 || imageData.length === 0)
    return input;

  try {
    const rowBytes = width * channels;
    const raw = inflateSync(Buffer.concat(imageData));
    if (raw.length !== height * (rowBytes + 1)) return input;
    const pixels = Buffer.allocUnsafe(height * rowBytes);
    let inputOffset = 0;
    for (let y = 0; y < height; y++) {
      const filter = raw[inputOffset++]!;
      const rowOffset = y * rowBytes;
      for (let x = 0; x < rowBytes; x++) {
        const value = raw[inputOffset++]!;
        const left = x >= channels ? pixels[rowOffset + x - channels]! : 0;
        const above = y > 0 ? pixels[rowOffset - rowBytes + x]! : 0;
        const upperLeft = y > 0 && x >= channels ? pixels[rowOffset - rowBytes + x - channels]! : 0;
        const predictor =
          filter === 0
            ? 0
            : filter === 1
              ? left
              : filter === 2
                ? above
                : filter === 3
                  ? Math.floor((left + above) / 2)
                  : filter === 4
                    ? paeth(left, above, upperLeft)
                    : -1;
        if (predictor < 0) return input;
        pixels[rowOffset + x] = (value + predictor) & 0xff;
      }
    }

    const filtered = Buffer.allocUnsafe(height * (rowBytes + 1));
    for (let y = 0; y < height; y++) {
      const dest = y * (rowBytes + 1);
      filtered[dest] = 0;
      pixels.copy(filtered, dest + 1, y * rowBytes, (y + 1) * rowBytes);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = bitDepth;
    ihdr[9] = colourType;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    const chunks = [
      pngChunk("IHDR", ihdr),
      ...keep.map((chunk) => pngChunk(chunk.type, chunk.data)),
      pngChunk("IDAT", deflateSync(filtered, { level: 9 })),
      pngChunk("IEND", Buffer.alloc(0)),
    ];
    const output = Buffer.concat([signature, ...chunks]);
    return output.length < source.length ? new Uint8Array(output) : input;
  } catch {
    return input;
  }
}

async function mirror(
  client: SupabaseClient,
  imageUrl: string,
  path: string,
  trusted: false | "wikimedia" | "sofascore" | true = false,
): Promise<string> {
  // Admin URLs: no redirects, so the host that was checked is the host we fetch from. Wikimedia and SofaScore:
  // redirects are allowed but the final host must still be theirs.
  const kind = trusted === true ? "wikimedia" : trusted;
  const res = await fetch(imageUrl, {
    headers: { "User-Agent": UA, Accept: "image/png,image/webp,image/jpeg" },
    redirect: kind ? "follow" : "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (
    kind === "wikimedia" &&
    !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(res.url || imageUrl)
  )
    throw new Error("image redirected away from Wikimedia");
  if (kind === "sofascore" && !isSofascoreImageHost(res.url || imageUrl))
    throw new Error("image redirected away from SofaScore");
  if (!res.ok) throw new Error(`image ${res.status}`);
  const type = res.headers.get("content-type") ?? "";
  // PNG/JPEG/WebP only (the bucket refuses others; SVG could carry script).
  if (!/^image\/(png|jpeg|webp)/.test(type)) throw new Error(`not a PNG/JPEG/WebP image (${type})`);
  const downloaded = new Uint8Array(await res.arrayBuffer());
  if (downloaded.byteLength === 0 || downloaded.byteLength > 5_000_000)
    throw new Error("image too large or empty");
  // PNG source badges are re-encoded losslessly; JPEG/WebP are already compressed and stay in their native format.
  const bytes = type.includes("png") ? compressPng(downloaded) : downloaded;
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("compressed image exceeds 1 MB");
  const ext = type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : "png";
  const finalPath = path.replace(/\.png$/, `.${ext}`);
  const { error } = await client.storage.from("media").upload(finalPath, bytes, {
    contentType: type.split(";")[0]!,
    upsert: true,
    cacheControl: "604800",
  });
  if (error) throw new Error(`storage: ${error.message}`);
  // Version the address so browsers and the CDN pick up a replaced crest at the same path.
  return `${client.storage.from("media").getPublicUrl(finalPath).data.publicUrl}?v=${Date.now().toString(36)}`;
}

/** Tries SofaScore's crest for each candidate id; returns the mirrored URL and the source used, or null. */
async function trySofascore(
  client: SupabaseClient,
  team: TeamRef,
  hits: { url: string; title?: string }[],
): Promise<{ logoUrl: string; page: string; image: string } | null> {
  for (const id of sofascoreCandidates(hits, team.name, team.sport)) {
    for (const image of sofascoreImageUrls(id)) {
      try {
        const logoUrl = await mirror(client, image, badgePath(team.sport, team.name), "sofascore");
        const page =
          hits.find((h) => new RegExp(`/${id}(?:[/?#]|$)`).test(h.url))?.url ??
          `https://www.sofascore.com/team/${id}`;
        return { logoUrl, page, image };
      } catch (error) {
        console.warn(
          "team-badges: sofascore image failed",
          team.name,
          id,
          (error as Error).message,
        );
      }
    }
  }
  return null;
}

/** Extracts a candidate crest from an official team/league page discovered by Parallel Search. */
async function tryOfficialPage(
  client: SupabaseClient,
  team: TeamRef,
  hits: { url: string; title?: string; excerpt?: string }[],
  apiKey: string,
): Promise<{ logoUrl: string; page: string; image: string } | null> {
  const candidates = hits
    .filter((hit) => isOfficialBadgeSource(hit, team.name, team.competition))
    .slice(0, 2);
  if (candidates.length === 0) return null;

  const { createParallelExtract } = await import("@/lib/content/providers.server");
  const { createQuotaClaim, guardExtract } = await import("@/lib/quota.server");
  const extract = guardExtract(
    createParallelExtract(apiKey, { timeoutMs: 25_000, attempts: 1 }),
    await createQuotaClaim("team-badges:official-page-extract"),
  );

  for (const page of candidates) {
    try {
      const extracted = await extract.extract(page.url);
      const markdown = extracted?.markdown ?? "";
      const urls = new Set<string>();
      for (const match of markdown.matchAll(/!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/gi)) {
        if (match[1]) urls.add(match[1].replace(/&amp;/g, "&"));
      }
      for (const match of markdown.matchAll(
        /https:\/\/[^\s)<>]+?\.(?:png|jpe?g|webp)(?:\?[^\s)<>]*)?/gi,
      )) {
        urls.add(match[0].replace(/&amp;/g, "&"));
      }
      const pageHost = new URL(page.url).hostname.toLowerCase();
      const image = [...urls].find((candidate) => {
        try {
          const u = new URL(candidate);
          const host = u.hostname.toLowerCase();
          return (
            u.protocol === "https:" &&
            (host === pageHost || host.endsWith(`.${pageHost}`)) &&
            /logo|crest|badge|emblem|team|club/i.test(u.pathname)
          );
        } catch {
          return false;
        }
      });
      if (!image) continue;
      const logoUrl = await mirror(client, image, badgePath(team.sport, team.name));
      return { logoUrl, page: page.url, image };
    } catch (error) {
      console.warn(
        "team-badges: official source failed",
        team.name,
        page.url,
        (error as Error).message,
      );
    }
  }
  return null;
}

export type ResolveOutcome = "verified" | "failed" | "quota" | "skipped";

/** Resolves one team. Writes the result to team_badges either way. */
export async function resolveTeamBadge(
  client: SupabaseClient,
  team: TeamRef,
  /** False until the SofaScore migration (method value plus `upgrade_checked_at`) is applied. */
  sofascore = true,
): Promise<ResolveOutcome> {
  if (!validBadgeTeamName(team.name)) return "skipped";
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
  if (!(await (await createQuotaClaim("team-badges:resolve"))("parallel"))) return "quota";

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
    const hits = await createParallelSearch(apiKey).search({ ...req, maxResults: 10 });
    const sofa = sofascore ? await trySofascore(client, team, hits) : null;
    if (sofa) {
      await save({
        status: "verified",
        method: "parallel_sofascore",
        logo_url: sofa.logoUrl,
        source_page: sofa.page.slice(0, 500),
        source_image: sofa.image.slice(0, 500),
        last_error: null,
        verified_at: new Date().toISOString(),
        upgrade_checked_at: new Date().toISOString(),
      });
      return "verified";
    }
    const official = await tryOfficialPage(client, team, hits, apiKey);
    if (official) {
      await save({
        status: "verified",
        method: "parallel_official",
        logo_url: official.logoUrl,
        source_page: official.page.slice(0, 500),
        source_image: official.image.slice(0, 500),
        last_error: null,
        verified_at: new Date().toISOString(),
        upgrade_checked_at: new Date().toISOString(),
      });
      return "verified";
    }
    const titles = wikipediaCandidates(hits, team.name);
    if (titles.length === 0) {
      await save({ status: "failed", last_error: "no Wikipedia article found" });
      return "failed";
    }
    let title = "";
    let crest: ReturnType<typeof pickCrestImage> = { ok: false, reason: "not checked" };
    for (const candidate of titles) {
      const summary = await fetchSummary(candidate);
      crest = summary
        ? pickCrestImage(summary)
        : { ok: false, reason: `summary unavailable for ${candidate}` };
      title = candidate;
      if (crest.ok) break;
    }
    if (!crest.ok) {
      await save({
        status: "failed",
        last_error: crest.reason,
        source_page: `https://en.wikipedia.org/wiki/${title}`.slice(0, 500),
      });
      return "failed";
    }
    const logoUrl = await mirror(client, crest.image, badgePath(team.sport, team.name), true);
    await save({
      status: "verified",
      method: "parallel_wikipedia",
      logo_url: logoUrl,
      source_page: `https://en.wikipedia.org/wiki/${title}`.slice(0, 500),
      source_image: crest.image.slice(0, 500),
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

/**
 * Upgrades a badge verified from Wikipedia to SofaScore's crest (owner, 27 Nov: SofaScore logos are cleaner and more
 * current). The Wikipedia badge stays when SofaScore has no match. Each team is tried once (`upgrade_checked_at`).
 */
export async function upgradeTeamBadge(
  client: SupabaseClient,
  team: TeamRef,
): Promise<ResolveOutcome> {
  const apiKey = process.env["PARALLEL_API_KEY"];
  if (!apiKey) return "quota";
  const { createQuotaClaim } = await import("@/lib/quota.server");
  if (!(await (await createQuotaClaim("team-badges:sofascore-upgrade"))("parallel")))
    return "quota";
  const key = badgeKey(team.name);
  const now = new Date().toISOString();
  try {
    const { createParallelSearch } = await import("@/lib/content/providers.server");
    const req = badgeSearchRequest(team.name, team.competition, team.sport);
    const hits = await createParallelSearch(apiKey).search({ ...req, maxResults: 10 });
    const sofa = await trySofascore(client, team, hits);
    const { error } = await client
      .from("team_badges")
      .update(
        sofa
          ? {
              method: "parallel_sofascore",
              logo_url: sofa.logoUrl,
              source_page: sofa.page.slice(0, 500),
              source_image: sofa.image.slice(0, 500),
              verified_at: now,
              upgrade_checked_at: now,
            }
          : { upgrade_checked_at: now },
      )
      .eq("sport", team.sport)
      .eq("team_key", key);
    if (error) console.error("team-badges: upgrade save failed", key, error.message);
    return sofa ? "verified" : "failed";
  } catch (error) {
    await client
      .from("team_badges")
      .update({ upgrade_checked_at: now })
      .eq("sport", team.sport)
      .eq("team_key", key);
    console.warn("team-badges: upgrade failed", key, (error as Error).message);
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

/** One cron run: up to `limit` teams that need a badge (new, or failed more than a day ago and under 6 tries). */
export async function runBadgeJob(limit = 8, force = false) {
  const client = await db();
  const teams = await teamsInFixtures(client);
  // Fail soft until the SofaScore migration is applied: without `upgrade_checked_at` the job keeps the Wikipedia path.
  const full = await client
    .from("team_badges")
    .select("sport, team_key, status, attempts, checked_at, method, upgrade_checked_at");
  const sofascore = !full.error;
  if (full.error)
    console.warn(
      "team-badges: SofaScore path off for this run",
      full.error.code,
      full.error.message,
    );
  const rows = sofascore
    ? full.data
    : (
        await client
          .from("team_badges")
          .select("sport, team_key, status, attempts, checked_at, method")
      ).data;
  const state = new Map(
    (
      (rows ?? []) as {
        sport: string;
        team_key: string;
        status: string;
        attempts: number;
        checked_at: string | null;
        method: string | null;
        upgrade_checked_at?: string | null;
      }[]
    ).map((r) => [`${r.sport}:${r.team_key}`, r]),
  );
  const due = teams
    .filter((t) => {
      const r = state.get(`${t.sport}:${badgeKey(t.name)}`);
      if (!r) return true;
      if (r.status === "verified" || r.status === "rejected") return false;
      if (force) return true;
      if (r.attempts >= MAX_ATTEMPTS) return false;
      return !r.checked_at || Date.now() - new Date(r.checked_at).getTime() > RETRY_AFTER_MS;
    })
    // Resolve the curated home marquee before the wider fixture backlog so its launch-critical badges cannot starve.
    .sort((a, b) => {
      const aPriority = MARQUEE_BADGE_KEYS.has(`${a.sport}:${badgeKey(a.name)}`) ? 0 : 1;
      const bPriority = MARQUEE_BADGE_KEYS.has(`${b.sport}:${badgeKey(b.name)}`) ? 0 : 1;
      return aPriority - bPriority || a.name.localeCompare(b.name);
    });
  const out = {
    teams: teams.length,
    due: due.length,
    verified: 0,
    failed: 0,
    quota: false,
    upgradesDue: 0,
    upgraded: 0,
  };
  // Small parallel batches keep the admin action responsive while the database quota claim remains the
  // authority for spend. Stop after the first batch that reports exhausted quota.
  const selected = due.slice(0, limit);
  for (let i = 0; i < selected.length; i += 4) {
    const batch = await Promise.all(
      selected.slice(i, i + 4).map((team) => resolveTeamBadge(client, team, sofascore)),
    );
    for (const result of batch) {
      if (result === "verified") out.verified++;
      if (result === "failed") out.failed++;
      if (result === "quota") out.quota = true;
    }
    if (out.quota) break;
  }

  // Spare capacity in this run upgrades Wikipedia badges to SofaScore crests, one try per team.
  const upgrades = !sofascore
    ? []
    : teams.filter((t) => {
        const r = state.get(`${t.sport}:${badgeKey(t.name)}`);
        return (
          r?.status === "verified" && r.method === "parallel_wikipedia" && !r.upgrade_checked_at
        );
      });
  out.upgradesDue = upgrades.length;
  const spare = out.quota ? 0 : Math.max(0, limit - selected.length);
  const toUpgrade = upgrades.slice(0, spare);
  for (let i = 0; i < toUpgrade.length; i += 4) {
    const batch = await Promise.all(
      toUpgrade.slice(i, i + 4).map((team) => upgradeTeamBadge(client, team)),
    );
    for (const result of batch) {
      if (result === "verified") out.upgraded++;
      if (result === "quota") out.quota = true;
    }
    if (out.quota) break;
  }
  return out;
}
