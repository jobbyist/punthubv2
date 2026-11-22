/**
 * Team badge resolution, pure parts (unit-tested). The server job in resolve.server.ts does the network calls:
 *   1. Parallel Search finds the best-matching English Wikipedia article for the club or national team.
 *   2. The Wikipedia summary API supplies the lead image, which is checked as a genuine team crest or logo.
 *   3. The verified image is mirrored to Supabase Storage; unsupported or ambiguous matches remain for admin review.
 * The same pipeline covers football, rugby, basketball and cricket teams, including the curated home marquee.
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
  const national = /world cup|international|national/i.test(competition);
  const kind =
    sport === "soccer"
      ? national
        ? "national football team"
        : "football club"
      : sport === "rugby"
      ¶»§q«^