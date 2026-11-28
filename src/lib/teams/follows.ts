/**
 * Team follows for signed-in members. Writes go through the `set_team_follow` database function, which also logs
 * the follow for admin analytics, keeps the favourites list in step and, only with separate PFIE-learning consent,
 * records a learning event. If the database migration is not applied yet, follow buttons stay hidden.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/session";
import { trackEvent } from "@/lib/analytics";

const db = supabase as unknown as SupabaseClient;

export interface FollowedTeam {
  sport: string;
  teamKey: string;
  teamName: string;
  createdAt: string;
}

/** True when PostgREST says the table or function does not exist (migration not applied yet). */
function missing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42883" ||
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    /does not exist|could not find/i.test(error.message ?? "")
  );
}

export async function fetchMyFollows(
  userId: string,
): Promise<{ follows: FollowedTeam[]; available: boolean }> {
  const { data, error } = await db
    .from("team_follows")
    .select("sport, team_key, team_name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    if (!missing(error)) console.error("team follows load failed", error.message);
    return { follows: [], available: !missing(error) };
  }
  return {
    available: true,
    follows: (
      (data ?? []) as { sport: string; team_key: string; team_name: string; created_at: string }[]
    ).map((r) => ({
      sport: r.sport,
      teamKey: r.team_key,
      teamName: r.team_name,
      createdAt: r.created_at,
    })),
  };
}

export async function setTeamFollow(
  team: { key: string; name: string; sport?: string },
  follow: boolean,
  source = "directory",
): Promise<void> {
  const sport = team.sport ?? "soccer";
  const { error } = await db.rpc("set_team_follow", {
    p_sport: sport,
    p_team_key: team.key,
    p_team_name: team.name,
    p_follow: follow,
    p_source: source,
  });
  if (error) throw error;
  trackEvent(follow ? "team_followed" : "team_unfollowed", { sport, what: team.name, source });
}

/** Follow state for the signed-in member, with optimistic toggling. */
export function useTeamFollows() {
  const { user, isSignedIn } = useSession();
  const [follows, setFollows] = useState<FollowedTeam[]>([]);
  const [available, setAvailable] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    if (!user) {
      setFollows([]);
      setLoaded(true);
      return;
    }
    let live = true;
    void fetchMyFollows(user.id).then((r) => {
      if (!live) return;
      setFollows(r.follows);
      setAvailable(r.available);
      setLoaded(true);
    });
    return () => {
      live = false;
    };
  }, [user]);

  const isFollowing = useCallback(
    (key: string, sport = "soccer") => follows.some((f) => f.teamKey === key && f.sport === sport),
    [follows],
  );

  const toggle = useCallback(
    async (team: { key: string; name: string; sport?: string }, source?: string) => {
      const sport = team.sport ?? "soccer";
      // One change at a time per team, even when called outside the (disabled-while-busy) button.
      if (inFlight.current.has(team.key)) return;
      inFlight.current.add(team.key);
      const next = !follows.some((f) => f.teamKey === team.key && f.sport === sport);
      const before = follows;
      setPending(team.key);
      setFollows((fs) =>
        next
          ? [
              {
                sport,
                teamKey: team.key,
                teamName: team.name,
                createdAt: new Date().toISOString(),
              },
              ...fs,
            ]
          : fs.filter((f) => !(f.teamKey === team.key && f.sport === sport)),
      );
      try {
        await setTeamFollow(team, next, source);
        return next;
      } catch (error) {
        setFollows(before);
        if (missing(error as { code?: string })) setAvailable(false);
        throw error;
      } finally {
        inFlight.current.delete(team.key);
        setPending(null);
      }
    },
    [follows],
  );

  return { follows, isFollowing, toggle, pending, available, loaded, isSignedIn };
}
