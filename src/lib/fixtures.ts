import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import type { FixtureStatus, Sport } from "@/lib/sports/types";

export interface UpcomingFixture {
  id: string;
  sport: Sport;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
  status: FixtureStatus;
}

export interface FixtureDay {
  /** "Sat 31 Oct 2026" in Africa/Johannesburg. */
  label: string;
  fixtures: UpcomingFixture[];
}

/** Groups fixtures (already ordered by kick-off) by their calendar day in South Africa. */
export function groupFixturesByDay(fixtures: UpcomingFixture[]): FixtureDay[] {
  const days: FixtureDay[] = [];
  for (const f of fixtures) {
    const label = formatDate(f.kickoff_at);
    const last = days[days.length - 1];
    if (last && last.label === label) last.fixtures.push(f);
    else days.push({ label, fixtures: [f] });
  }
  return days;
}

/** Fixtures from three hours ago (so matches in play still show) to `days` ahead. Public read through RLS. */
export async function fetchUpcomingFixtures(opts: {
  sport?: Sport | undefined;
  days?: number;
  limit?: number;
  now?: Date;
}): Promise<UpcomingFixture[]> {
  const now = opts.now ?? new Date();
  const from = new Date(now.getTime() - 3 * 3600 * 1000).toISOString();
  const to = new Date(now.getTime() + (opts.days ?? 14) * 24 * 3600 * 1000).toISOString();
  let q = supabase
    .from("fixtures")
    .select("id, sport, competition, home, away, kickoff_at, status")
    .in("status", ["scheduled", "live"])
    .gte("kickoff_at", from)
    .lte("kickoff_at", to)
    .order("kickoff_at", { ascending: true })
    .limit(opts.limit ?? 200);
  if (opts.sport) q = q.eq("sport", opts.sport);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as UpcomingFixture[];
}

/** Matches in play right now, for the side rail. */
export async function fetchLiveFixtures(limit = 3): Promise<UpcomingFixture[]> {
  const { data, error } = await supabase
    .from("fixtures")
    .select("id, sport, competition, home, away, kickoff_at, status")
    .eq("status", "live")
    .order("kickoff_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as UpcomingFixture[];
}
