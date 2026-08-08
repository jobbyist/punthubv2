import { getTeamLogo } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type TeamLogoProps = {
  team: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "size-8",
  md: "size-9",
  lg: "size-10",
};

/**
 * Consistent rounded team logo. Falls back to a neutral circle with initials
 * when no logo asset exists for the team.
 */
export function TeamLogo({ team, size = "md", className }: TeamLogoProps) {
  const src = getTeamLogo(team);
  const dim = sizeMap[size];

  if (src) {
    return (
      <img
        src={src}
        alt={`${team} logo`}
        loading="lazy"
        className={cn(
          dim,
          "shrink-0 rounded-full object-cover bg-muted ring-1 ring-border",
          className,
        )}
      />
    );
  }

  // Fallback: coloured circle with initials
  const initials = team
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        dim,
        "grid shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-1 ring-border",
        className,
      )}
      aria-label={team}
    >
      {initials}
    </span>
  );
}
