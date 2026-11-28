import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { activeCompetitions, type CompetitionKey } from "./competitions";
import { orderKeys } from "./fixture-order";
import { isPfieLaunchCompetition } from "../pfie/launch-scope";

/**
 * Soccer competitions whose last PFIE fixtures run is older than `staleHours` (or that never ran), least recently
 * run first. Pure ordering lives in `fixture-order.ts`.
 */
export async function orderForFixtureSync(opts: { staleHours: number }): Promise<CompetitionKey[]> {
  const keys = activeCompetitions()
    .filter((c) => c.sport === "soccer" && isPfieLaunchCompetition(c.key))
    .map((c) => c.key);
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data } = await (
    supabaseAdmin as never as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (
            c: string,
            v: string,
          ) => {
            gte: (
              c: string,
              v: string,
            ) => Promise<{ data: { competition: string; started_at: string }[] | null }>;
          };
        };
      };
    }
  )
    .from("pfie_runs")
    .select("competition, started_at")
    .eq("kind", "fixtures")
    .gte("started_at", since);
  return orderKeys(keys, data ?? [], opts.staleHours, Date.now());
}
