import { TeamLogo } from "@/components/team-logo";
import { MARQUEE_BADGE_TEAMS } from "@/lib/marquee-matchups";

/**
 * Endless strip of curated team badges across sports. TeamLogo resolves the verified Parallel-sourced badge from
 * the registry and keeps a neutral initials fallback while a team is being resolved.
 */
export function BadgeMarquee({ label }: { label: string }) {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {MARQUEE_BADGE_TEAMS.map((item) => (
        <li
          key={`${hidden ? "b" : "a"}-${item.sport}:${item.team}`}
          className="flex items-center gap-2.5"
        >
          <TeamLogo team={item.team} sport={item.sport} size="lg" />
          <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={label} className="relative overflow-hidden py-6">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-background to-transparent" />
      <div className="puntr-marquee flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
