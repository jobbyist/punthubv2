/**
 * Team badge resolution, pure parts (unit-tested). The server job in resolve.server.ts does the network calls:
 *   1. Parallel Search finds the best-matching English Wikipedia article for the club or national team.
 *   2. The Wikipedia summary API supplies the lead image, which is checked as a genuine team crest or logo.
 *   3. The verified image is mirrored to Supabase Storage; unsupported or ambiguous matches remain for admin review.
 * The same pipeline covers football, rugby, basketball and cricket teams, including the curated home marquee.
 *
 * SofaScore (owner, 27 Nov 2026) is tried first: the same Parallel Search call also looks for the team's SofaScore page
 * (sofascore.com/<sport>/team/<slug>/<id>), and the crest is taken from SofaScore's team image for that id. Wikipedia
 * stays as the fallback. `[attorney review]`: SofaScore's terms on automated access and reuse.
 */
import { normaliseTeam, teamSlug } from "../pfie/teams";

export function badgeKey(name: string): string {
  return normaliseTeam(name).slice(0, 80);
}

/** Reject malformed fixture/table labels before they become database keys. */
export function validBadgeTeamName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const name = value.trim();
  return name.length >= 2 && badgeKey(name).length > 0;
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

const OFFICIAL_LEAGUE_DOMAINS: Record<string, string[]> = {
  "betway premiership": ["psl.co.za"],
  bundesliga: ["bundesliga.com"],
  "caf confederation cup": ["cafonline.com"],
  "efl championship": ["efl.com"],
  "la liga": ["laliga.com"],
  "liga portugal": ["ligaportugal.pt"],
  "ligue 1": ["ligue1.com"],
  "premier league": ["premierleague.com"],
  "saudi pro league": ["spl.com.sa"],
  "serie a": ["legaseriea.it"],
  "uefa champions league": ["uefa.com"],
  "uefa conference league": ["uefa.com"],
};

const NON_OFFICIAL_LOGO_SOURCES = [
  /(^|\.)footylogos\.com$/i,
  /(^|\.)football-logos\.cc$/i,
  /(^|\.)transfermarkt\./i,
  /(^|\.)soccerway\./i,
  /(^|\.)worldfootball\.net$/i,
  /(^|\.)espn\./i,
  /(^|\.)flashscore\./i,
  /(^|\.)fotmob\.com$/i,
  /(^|\.)goal\.com$/i,
  /(^|\.)wikipedia\.org$/i,
  /(^|\.)sofascore\./i,
];

export function isOfficialBadgeSource(
  hit: { url: string; title?: string; excerpt?: string },
  teamName: string,
  competition: string,
): boolean {
  try {
    const url = new URL(hit.url);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (NON_OFFICIAL_LOGO_SOURCES.some((pattern) => pattern.test(host))) return false;
    if (/(facebook|instagram|twitter|x\.com|youtube|tiktok)\./i.test(host)) return false;

    const text = `${hit.title ?? ""} ${hit.excerpt ?? ""} ${hit.url}`;
    const officialSite = /\bofficial\b.{0,50}\b(website|site|club|team|league)\b|\b(website|site)\b.{0,50}\bofficial\b/i.test(text);
    const knownLeagueDomain = (OFFICIAL_LEAGUE_DOMAINS[competition.trim().toLowerCase()] ?? [])
      .some((domain) => host === domain || host.endsWith(`.${domain}`));

    const teamTokens = badgeKey(teamName)
      .split(" ")
      .filter((token) => token.length >= 4 && !["club", "team", "football", "united", "city"].includes(token));
    const teamDomain = teamTokens.some((token) => host.includes(token));
    return knownLeagueDomain || (officialSite && (teamDomain || /\bofficial\s+(website|site)\b/i.test(text)));
  } catch {
    return false;
  }
}

export function badgeSearchRequest(name: string, competition: string, sport: string) {
  const full = searchName(name);
  const national = /world cup|international|national/i.test(competition);
  const kind =
    sport === "soccer"
      ? national
        ? "national football team"
        : "football club"
      : sport === "rugby"
        ? "rugby union team"
        : sport === "basketball"
          ? "professional basketball team"
          : `${sport} team`;
  return {
    objective: `Search for the official logo, crest or badge for the ${kind} "${name}" (${full}) in ${competition}. Prefer official team or governing-body sources; use an English Wikipedia article as a corroborating image source when needed.`,
    queries: [
      `site:sofascore.com ${full} ${sofaSport(sport)} team`,
      `${full} ${kind} official logo crest badge`,
      `${full} ${kind} Wikipedia`,
    ],
  };
}

const WIKI = /^https:\/\/en\.(?:m\.)?wikipedia\.org\/wiki\/([^#?]+)$/;
const NOT_ARTICLE = /^(File|Category|Template|Talk|Special|Help|Portal|Wikipedia|List_of)[:_]/i;
const NOT_CLUB_TITLE = /(season|stadium|academy|reserves|_u\d\d|under-\d\d|_\d{4}[–-]\d{2})/i;
const WOMEN = /(women|ladies)/i;

const CLUBBY_TITLE =
  /(F\.?C\.?|A\.?F\.?C\.?|S\.?C\.?|C\.?F\.?|football|basketball|rugby|club|united|city|national|team)/i;

/**
 * English Wikipedia articles in the search hits that could be the club, best first: titles that look like a club
 * ("Bournemouth" the town comes after "AFC Bournemouth"). The caller tries them in order until one passes the crest
 * checks.
 */
export function wikipediaCandidates(
  hits: { url: string; title?: string }[],
  name: string,
): string[] {
  const words = badgeKey(name)
    .split(" ")
    .filter((w) => w.length >= 3);
  const clubby: string[] = [];
  const other: string[] = [];
  for (const h of hits) {
    const m = WIKI.exec(h.url.split("#")[0] ?? "");
    if (!m) continue;
    let title: string;
    try {
      title = decodeURIComponent(m[1]!).replace(/ /g, "_");
    } catch {
      continue;
    }
    if (NOT_ARTICLE.test(title) || NOT_CLUB_TITLE.test(title)) continue;
    // A men's side must not pick up the women's team article, and the reverse.
    if (WOMEN.test(title) !== WOMEN.test(name)) continue;
    const t = badgeKey(title.replace(/_/g, " "));
    // The title must share a real word with the team name (or an alias of it).
    // Require the first meaningful team-name token: "Iberia Tbilisi" must not match "Dinamo Tbilisi".
    if (words.length > 0 && !t.includes(words[0]!)) continue;
    const list = CLUBBY_TITLE.test(title) ? clubby : other;
    if (!clubby.includes(title) && !other.includes(title)) list.push(title);
  }
  return [...clubby, ...other].slice(0, 3);
}

/** Best single candidate (kept for callers and tests). */
export function pickWikipediaTitle(
  hits: { url: string; title?: string }[],
  name: string,
): string | null {
  return wikipediaCandidates(hits, name)[0] ?? null;
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
  /(football club|association football|soccer club|football team|national.*(football|soccer|rugby|basketball|cricket).*team|basketball team|rugby union team|cricket team|professional football)/i;
const PERSON_WORDS = /\b(born|footballer|player|manager|coach|politician|singer|actor)\b/i;
const CREST_FILE = /(logo|crest|badge|emblem|fc|f\.c\.|afc|club|united|city|\.svg)/i;
const PHOTO_FILE = /(stadium|ground|arena|park|squad|team_photo|players|kit|\.jpe?g$)/i;

const WIKIMEDIA_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);

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
  // Wikimedia serves images from upload.wikimedia.org and, since 2026, thumbnails from thumb.wikimedia.org.
  if (url.protocol !== "https:" || !WIKIMEDIA_HOSTS.has(url.hostname))
    return { ok: false, reason: `image not on Wikimedia (${url.hostname})` };
  const file =
    decodeURIComponent(original || image)
      .split("/")
      .pop() ?? "";
  if (PHOTO_FILE.test(file) && !CREST_FILE.test(file.replace(/\.jpe?g$/i, "")))
    return { ok: false, reason: `lead image looks like a photo (${file})` };
  if (!CREST_FILE.test(file) && !/\.(svg|png)$/i.test(file))
    return { ok: false, reason: `lead image does not look like a crest (${file})` };
  url.search = "";
  return { ok: true, image: url.toString() };
}

/** A manual badge URL from an admin: https only, no credentials. */
export function cleanManualLogoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
    const host = u.hostname.toLowerCase();
    // Hostnames only: no IP literals, localhost or internal names (the server fetches this URL).
    if (
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      host === "localhost" ||
      !host.includes(".") ||
      /\.(local|internal|localhost)$/.test(host)
    )
      return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** SofaScore's sport segment in team URLs. */
export function sofaSport(sport: string): string {
  return sport === "soccer" ? "football" : sport === "rugby" ? "rugby" : sport;
}

const SOFA_TEAM =
  /^https:\/\/(?:www\.)?sofascore\.com\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?([a-z-]+)\/team\/([a-z0-9-]+)\/(\d{1,9})\/?$/;
/** Youth, women's, reserve and B sides: never the senior men's crest unless the team name says so. */
const SOFA_VARIANT =
  /(^|-)(u\d{2}|under-\d{2}|wfc|women|ladies|ii|b|reserves|youth|academy|res)(-|$)/;

/**
 * SofaScore team ids in the search hits that match the team, best first. A hit counts only when it is a team page for
 * the right sport, its slug shares every meaningful word of the team name (or the reverse), and it is not a youth,
 * women's or reserve side the name does not ask for. Ids seen on several hits (language versions) rank higher.
 */
export function sofascoreCandidates(
  hits: { url: string; title?: string }[],
  name: string,
  sport: string,
): number[] {
  const words = badgeKey(name)
    .split(" ")
    .filter((w) => w.length >= 3);
  const wantVariant = SOFA_VARIANT.test(teamSlug(name));
  const score = new Map<number, number>();
  for (const h of hits) {
    const m = SOFA_TEAM.exec((h.url.split(/[?#]/)[0] ?? "").toLowerCase());
    if (!m || m[1] !== sofaSport(sport)) continue;
    const slug = m[2]!;
    if (SOFA_VARIANT.test(slug) !== wantVariant) continue;
    const slugWords = new Set(badgeKey(slug.replace(/-/g, " ")).split(" "));
    const nameWords = new Set(badgeKey(name).split(" "));
    const covered =
      (words.length > 0 && words.every((w) => slugWords.has(w))) ||
      ([...slugWords].filter((w) => w.length >= 3).length > 0 &&
        [...slugWords].filter((w) => w.length >= 3).every((w) => nameWords.has(w)));
    if (!covered) continue;
    const id = Number(m[3]);
    score.set(id, (score.get(id) ?? 0) + 1);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 2);
}

/** SofaScore team image addresses for an id, tried in order. */
export function sofascoreImageUrls(id: number): string[] {
  return [
    `https://img.sofascore.com/api/v1/team/${id}/image`,
    `https://api.sofascore.app/api/v1/team/${id}/image`,
  ];
}

/** Hosts a SofaScore image may be served from (after redirects). */
export function isSofascoreImageHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /(^|\.)sofascore\.(com|app)$/.test(u.hostname);
  } catch {
    return false;
  }
}
