/**
 * Marquee matchups for the home page preview card (src/components/match-preview.tsx).
 *
 * ILLUSTRATIVE ONLY. Every number here (AI confidence, community split) is a sample for the guest preview, not a
 * model output or a real poll. Copy (titles, venues, insights) lives in the `home` namespace under `matchups.items.<id>`
 * so it is translated with the rest of the site. Real form and head-to-head numbers come only from recorded results
 * (owner rule, 14 Nov 2026), so this file carries none.
 *
 * Sports other than football are on the roadmap, not live: their tag is derived from SPORT_ROADMAP so the card never
 * claims coverage the platform does not have yet.
 */
import { SPORT_ROADMAP, type RoadmapSport } from "@/lib/roadmap";

export type MatchupSport = Extract<RoadmapSport, "soccer" | "rugby" | "basketball" | "cricket">;
export type OutcomeKey = "home" | "draw" | "away";

export type MarqueeTeam = {
  /** Name used for the badge lookup (team_badges registry / bundled logos). */
  team: string;
  /** Name shown on the card. */
  label: string;
};

export type MarqueeMatchup = {
  id: "soweto" | "boks-ab" | "clasico" | "north-south" | "celtics-lakers" | "proteas-aus";
  sport: MatchupSport;
  home: MarqueeTeam;
  away: MarqueeTeam;
  /** Sample AI confidence for the lean, 0-100. */
  confidence: number;
  /** The outcome the sample model leans to. */
  lean: OutcomeKey;
  /** Sample community split. Two-way sports have no draw. Shares sum to 100. */
  split: Partial<¶»§q«^