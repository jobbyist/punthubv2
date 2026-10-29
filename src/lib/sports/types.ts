export type Sport = "soccer" | "rugby";

export type FixtureStatus =
  "scheduled" | "live" | "finished" | "postponed" | "abandoned" | "cancelled";

/** A fixture in the shape of public.fixtures, independent of any provider. */
export interface NormalisedFixture {
  provider: string;
  providerRef: string;
  sport: Sport;
  competition: string;
  home: string;
  away: string;
  /** ISO 8601 with offset. */
  kickoffAt: string;
  status: FixtureStatus;
  /** Full-time score for grading: 90 minutes for soccer (no extra time or penalties). Null until known. */
  homeScore: number | null;
  awayScore: number | null;
}
