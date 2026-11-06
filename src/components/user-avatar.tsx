import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  return (
    <Avatar className={cn("size-7", className)}>
      {url ? <AvatarImage src={url} alt={alt ?? username} className="object-cover" /> : null}
      <AvatarFallback className="text-xs font-semibold uppercase">
        {username.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
}
