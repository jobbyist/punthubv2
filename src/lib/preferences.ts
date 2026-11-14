import { supabase } from "@/integrations/supabase/client";

/** A member's favourites. Optional, private, used only to personalise their own Matchday card and shortcuts. */
export interface Favourites {
  sports: string[];
  competitions: string[];
  teams: string[];
}

export const EMPTY_FAVOURITES: Favourites = { sports: [], competitions: [], teams: [] };
export const FAVOURITE_SPORTS = [
  "soccer",
  "rugby",
  "basketball",
  "tennis",
  "cricket",
  "combat",
  "athletics",
  "horse-racing",
] as const;
export const MAX_FAVOURITES = 10;

export async function fetchFavourites(userId: string): Promise<Favourites> {
  const { data, error } = await supabase
    .from("member_preferences")
    .select("sports, competitions, teams")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? EMPTY_FAVOURITES;
}

export async function saveFavourites(userId: string, f: Favourites): Promise<void> {
  const clean = (xs: string[]) =>
    Array.from(new Set(xs.map((x) => x.trim()).filter(Boolean))).slice(0, MAX_FAVOURITES);
  const { error } = await supabase.from("member_preferences").upsert({
    user_id: userId,
    sports: clean(f.sports),
    competitions: clean(f.competitions),
    teams: clean(f.teams),
  });
  if (error) throw error;
}

export function hasFavourites(f: Favourites | null | undefined): boolean {
  return !!f && f.competitions.length + f.teams.length > 0;
}

interface RankableFixture {
  home: string;
  away: string;
  competition: string;
  kickoff_at: string;
}

/**
 * Orders fixtures for the Matchday card: favourite teams first, then favourite competitions, then everything else
 * by kick-off. `competitionKey` maps a competition name to its key (PFIE key).
 */
export function rankForMember<T extends RankableFixture>(
  fixtures: T[],
  f: Favourites,
  competitionKey: (name: string) => string | null,
): { fixture: T; reason: "team" | "competition" | null }[] {
  const teams = new Set(f.teams.map((x) => x.toLowerCase()));
  const comps = new Set(f.competitions);
  return fixtures
    .map((fixture) => {
      const team = teams.has(fixture.home.toLowerCase()) || teams.has(fixture.away.toLowerCase());
      const key = competitionKey(fixture.competition);
      const comp = !!key && comps.has(key);
      return { fixture, reason: team ? ("team" as const) : comp ? ("competition" as const) : null };
    })
    .sort((a, b) => {
      const w = (r: string | null) => (r === "team" ? 0 : r === "competition" ? 1 : 2);
      return w(a.reason) - w(b.reason) || a.fixture.kickoff_at.localeCompare(b.fixture.kickoff_at);
    });
}
