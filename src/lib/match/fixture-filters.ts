/** The /fixtures filters as one pure function, shared by the page and its <head> so both describe the same list. */
import { saDayKey } from "@/lib/format";
import { competitionMeta, type CompetitionRegion } from "@/lib/match/competition-meta";

export interface FixtureFilters {
  q?: string | undefined;
  day?: string | undefined;
  region?: CompetitionRegion | undefined;
  comp?: string | undefined;
}

type Filterable = { home: string; away: string; competition: string; kickoff_at: string };

export function filterFixtures<T extends Filterable>(fixtures: T[], f: FixtureFilters) {
  const needle = (f.q ?? "").trim().toLowerCase();
  const bySearch = fixtures.filter(
    (x) =>
      !needle ||
      x.home.toLowerCase().includes(needle) ||
      x.away.toLowerCase().includes(needle) ||
      x.competition.toLowerCase().includes(needle),
  );
  const byRegion = bySearch.filter(
    (x) => !f.region || competitionMeta(x.competition).region === f.region,
  );
  const byComp = byRegion.filter((x) => !f.comp || x.competition === f.comp);
  const shown = byComp.filter((x) => !f.day || saDayKey(x.kickoff_at) === f.day);
  return { bySearch, byRegion, byComp, shown };
}

export const hasFilters = (f: FixtureFilters) => Boolean(f.q || f.day || f.region || f.comp);
