import { cn } from "@/lib/utils";

/** File name of a practice club's badge: "Harbour City FC" -> harbour-city-fc. */
export function practiceBadgeSlug(team: string): string {
  return team
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Badge of one of the invented Practice Mode clubs (`public/teams/practice`). The clubs and their badges are
 * original and fictional; they are decorative, so the image has no alt text and the club name is always printed
 * next to it.
 */
export function ClubBadge({ team, className }: { team: string; className?: string }) {
  return (
    <img
      src={`/teams/practice/${practiceBadgeSlug(team)}.svg`}
      alt=""
      aria-hidden
      loading="lazy"
      width={28}
      height={30}
      className={cn("h-8 w-7 shrink-0", className)}
      onError={(e) => {
        e.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}
