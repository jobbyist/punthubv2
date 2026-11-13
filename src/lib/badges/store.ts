/**
 * Verified team badges for the browser and SSR. Loaded once per page load (a few hundred rows at most) and shared.
 * TeamLogo reads from it; fixture lists use it to enforce the owner's rule that a team is only shown with its
 * real badge.
 */
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { badgeKey } from "@/lib/badges/resolve";
import { getTeamLogo } from "@/lib/mock-data";

export type BadgeMap = Map<string, string>;

let cache: BadgeMap | null = null;
let inflight: Promise<BadgeMap> | null = null;
const listeners = new Set<(m: BadgeMap) => void>();

const k = (sport: string, name: string) => `${sport}:${badgeKey(name)}`;

export function loadBadges(): Promise<BadgeMap> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = (async () => {
    const map: BadgeMap = new Map();
    const { data, error } = await supabase
      .from("team_badges")
      .select("sport, team_key, logo_url")
      .eq("status", "verified");
    if (!error) {
      for (const r of (data ?? []) as {
        sport: string;
        team_key: string;
        logo_url: string | null;
      }[])
        if (r.logo_url) map.set(`${r.sport}:${r.team_key}`, r.logo_url);
    } else {
      console.error("team badges unavailable", error.message);
    }
    // Only cache in the browser; on the server each request loads fresh.
    if (typeof window !== "undefined") cache = map;
    inflight = null;
    for (const l of listeners) l(map);
    return map;
  })();
  return inflight;
}

/** Badge for a team: verified badge from the registry first, then the bundled logos. */
export function badgeFor(map: BadgeMap | null, name: string, sport = "soccer"): string | undefined {
  return map?.get(k(sport, name)) ?? getTeamLogo(name, sport);
}

export function hasBadge(map: BadgeMap, name: string, sport = "soccer"): boolean {
  return Boolean(badgeFor(map, name, sport));
}

/**
 * Strict rule: drop anything whose teams have no real badge. `TEAM_BADGES_REQUIRED=false` (Vite env
 * `VITE_TEAM_BADGES_REQUIRED=false`) switches the filter off in an emergency.
 */
export async function onlyBadged<T extends { sport: string; home: string; away: string }>(
  rows: T[],
): Promise<T[]> {
  if (import.meta.env["VITE_TEAM_BADGES_REQUIRED"] === "false") return rows;
  const map = await loadBadges();
  return rows.filter((r) => hasBadge(map, r.home, r.sport) && hasBadge(map, r.away, r.sport));
}

export function useBadges(): BadgeMap | null {
  const [map, setMap] = useState<BadgeMap | null>(cache);
  useEffect(() => {
    if (cache) {
      setMap(cache);
      return;
    }
    listeners.add(setMap);
    void loadBadges();
    return () => {
      listeners.delete(setMap);
    };
  }, []);
  return map;
}
