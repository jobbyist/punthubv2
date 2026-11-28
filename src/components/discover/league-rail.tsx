import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import type { UpcomingFixture } from "@/lib/fixtures";

/** Every league with matches coming up, as a swipeable rail. Favourite leagues are not reordered here on purpose. */
export function LeagueRail({ fixtures }: { fixtures: UpcomingFixture[] }) {
  const { t } = useTranslation("predictions");
  const counts = Array.from(
    fixtures.reduce(
      (m, f) => m.set(f.competition, (m.get(f.competition) ?? 0) + 1),
      new Map<string, number>(),
    ),
  ).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (counts.length < 2) return null;
  return (
    <section aria-labelledby="league-rail-title" className="mb-8">
      <h2 id="league-rail-title" className="mb-3 text-lg sm:text-xl">
        {t("discover.leagues.title")}
      </h2>
      <ul className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {counts.map(([name, n]) => (
          <li key={name} className="shrink-0 snap-start">
            <Link
              to="/fixtures"
              search={{ comp: name }}
              className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-muted"
            >
              <CompetitionBadge name={name} showName={false} />
              <span className="whitespace-nowrap">{name}</span>
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold text-muted-foreground tnum">
                {t("discover.leagues.count", { count: n })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
