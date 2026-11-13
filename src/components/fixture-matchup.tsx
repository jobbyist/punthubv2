import type { ReactNode } from "react";

import { TeamLogo } from "@/components/team-logo";

/**
 * Mobile-first matchup: home team (badge + name) | kick-off or score | away team. Names wrap to two lines and
 * never push the badges around, at any width. Used by fixture lists, results and pick cards.
 */
export function FixtureMatchup({
  home,
  away,
  sport,
  center,
  size = "md",
}: {
  home: string;
  away: string;
  sport?: string;
  center: ReactNode;
  size?: "sm" | "md";
}) {
  const logo = size === "md" ? "lg" : "sm";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-end sm:text-right">
        <span className="line-clamp-2 order-2 text-sm font-semibold leading-tight sm:order-1">
          {home}
        </span>
        <TeamLogo team={home} sport={sport} size={logo} className="order-1 sm:order-2" />
      </div>
      <div className="min-w-[4.5rem] text-center">{center}</div>
      <div className="flex min-w-0 flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-start sm:text-left">
        <TeamLogo team={away} sport={sport} size={logo} />
        <span className="line-clamp-2 text-sm font-semibold leading-tight">{away}</span>
      </div>
    </div>
  );
}
