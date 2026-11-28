import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SPORTS_AVATARS } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/** A member's profile picture, or the first letter of their username. */
export function UserAvatar({
  username,
  url,
  alt,
  className,
}: {
  username: string;
  url?: string | null | undefined;
  alt?: string | undefined;
  className?: string | undefined;
}) {
  const sportsKey = url?.startsWith("puntr-avatar://") ? url.slice("puntr-avatar://".length) : null;
  const sportsAvatar = SPORTS_AVATARS.find((item) => item.key === sportsKey);
  const col = sportsAvatar ? sportsAvatar.index % 4 : 0;
  const row = sportsAvatar ? Math.floor(sportsAvatar.index / 4) : 0;
  const position = `${(col / 3) * 100}% ${(row / 3) * 100}%`;

  return (
    <Avatar className={cn("size-7", className)}>
      {sportsAvatar ? (
        <span
          role="img"
          aria-label={alt ?? sportsAvatar.label}
          className="size-full bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/avatars/sports/avatar-sheet.svg')",
            backgroundSize: "400% 400%",
            backgroundPosition: position,
          }}
        />
      ) : url ? (
        <AvatarImage src={url} alt={alt ?? username} className="object-cover" />
      ) : null}
      <AvatarFallback className="text-xs font-semibold uppercase">
        {username.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
