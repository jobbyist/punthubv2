/**
 * Team badge resolution, pure parts (unit-tested). The server job in resolve.server.ts does the network calls:
 *   1. Parallel Search finds the team's English Wikipedia article.
 *   2. The Wikipedia summary API gives the article's lead image, which for clubs is the crest.
 *   3. Checks: the article is about a football club or national team (not a person, stadium or disambiguation page),
 *      the image is on upload.wikimedia.org and looks like a crest/logo, then it is mirrored to Supabase Storage.
 * Nothing is guessed: a team that fails the checks stays unbadged and its fixtures stay hidden until an admin sets
 * a badge by hand.
 */
import { normaliseTeam, teamSlug } from "../pfie/teams";

export function badgeKey(name: string): string {
  return normaliseTeam(name).slice(0, 80);
}

export function badgePath(sport: string, name: string): string {
  return `teams/${sport}/${teamSlug(name).slice(0, 80) || "team"}.png`;
}

/** Long names searched for common short forms ("Man Utd" -> "Manchester United"). */
export function searchName(name: string): string {
  const n = normaliseTeam(name);
  return n
    .split(" ")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0]!.toUpperCase() + w.slice(1)))
    .join(" ");
}

export function badgeSearchRequest(name: string, competition: string, sport: string) {
  const full = searchName(name);
  const kind = sport === "soccer" ? "football club" : `${sport} team`;
  return {
    objective: `Find the English Wikipedia article for the ${kind} "${name}" (${full}) that plays in ${competition}. The article's infobox shows the official club crest or badge.`,
    queries: [`${full} ${kind} Wikipedia`, `${full} ${competition} crest`],
  };
}

const WIKI = /^https:\/\/en\.(?:m\.)?wikipedia\.org\/wiki\/([^#?]+)$/;
const NOT_ARTICLE = /^(File|Category|Template|Talk|Special|Help|Portal|Wikipedia|List_of)[:_]/i;
const NOT_CLUB_TITLE =
  /(season|stadium|academy|women|ladies|reserves|_u\d\d|under-\d\d|_\d{4}[–-]\d{2})/i;

/** First search hit that is an English Wikipedia article about the club itself. Returns the article title. */
export function pickWikipediaTitle(
  hits: { url: string; title?: string }[],
  name: string,
): string | null {
  const words = badgeKey(name)
    .split(" ")
    .filter((w) => w.length >= 3);
  for (const h of hits) {
    const m = WIKI.exec(h.url.split("#")[0] ?? "");
    if (!m) continue;
    const title = decodeURIComponent(m[1]!);
    if (NOT_ARTICLE.test(title) || NOT_CLUB_TITLE.test(title)) continue;
    const t = badgeKey(title.replace(/_/g, " "));
    // The title must share a real word with the team name (or an alias of it).
    if (words.length > 0 && !words.some((w) => t.includes(w))) continue;
    return title;
  }
  return null;
}

export interface WikiSummary {
  type?: string;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string; width?: number; height?: number };
  originalimage?: { source?: string; width?: number; height?: number };
}

const CLUB_WORDS =
  /(football club|association football|soccer club|football team|national (football|soccer|rugby|cricket) team|basketball team|rugby union team|cricket team|professional football)/i;
const PERSON_WORDS = /\b(born|footballer|player|manager|coach|politician|singer|actor)\b/i;
const CREST_FILE = /(logo|crest|badge|emblem|fc|f\.c\.|afc|club|united|city|\.svg)/i;
const PHOTO_FILE = /(stadium|ground|arena|park|squad|team_photo|players|kit|\.jpe?g$)/i;

export type CrestCheck = { ok: true; image: string } | { ok: false; reason: string };

/** Checks a Wikipedia summary and returns the crest image (a PNG thumbnail of at most ~320px when available). */
export function pickCrestImage(summary: WikiSummary): CrestCheck {
  if (summary.type && summary.type !== "standard")
    return { ok: false, reason: `page type ${summary.type}` };
  const about = `${summary.description ?? ""} ${summary.extract?.slice(0, 400) ?? ""}`;
  if (!CLUB_WORDS.test(about)) return { ok: false, reason: "article is not about a club or team" };
  if (PERSON_WORDS.test(summary.description ?? ""))
    return { ok: false, reason: "article is about a person" };
  const thumb = summary.thumbnail?.source ?? "";
  const original = summary.originalimage?.source ?? "";
  const image = thumb || original;
  if (!image) return { ok: false, reason: "article has no lead image" };
  let url: URL;
  try {
    url = new URL(image);
  } catch {
    return { ok: false, reason: "bad image url" };
  }
  if (url.protocol !== "https:" || url.hostname !== "upload.wikimedia.org")
    return { ok: false, reason: "image not on upload.wikimedia.org" };
  const file =
    decodeURIComponent(original || image)
      .split("/")
      .pop() ?? "";
  if (PHOTO_FILE.test(file) && !CREST_FILE.test(file.replace(/\.jpe?g$/i, "")))
    return { ok: false, reason: `lead image looks like a photo (${file})` };
  if (!CREST_FILE.test(file) && !/\.(svg|png)$/i.test(file))
    return { ok: false, reason: `lead image does not look like a crest (${file})` };
  return { ok: true, image };
}

/** A manual badge URL from an admin: https only, no credentials. */
export function cleanManualLogoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}
