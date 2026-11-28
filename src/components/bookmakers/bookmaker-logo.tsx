import { useState } from "react";

import { PartnerLogo } from "@/components/partner-logo";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import type { BookmakerListing } from "@/lib/bookmaker-directory";
import { brandfetchLogo } from "@/lib/bookmaker-profiles";
import { platforms } from "@/lib/mock-data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * Logo priority: an active logo uploaded in Admin > Brand logos, then the bundled /logos file, then the
 * Brandfetch logo CDN for the verified domain, then initials when nothing loads.
 */
export function useBookmakerLogo(item: BookmakerListing): string | undefined {
  const uploaded = useBrandLogos("bookmakers");
  const key = item.name.toLowerCase();
  return (
    uploaded.find((e) => e.active && e.imageUrl && e.name.toLowerCase() === key)?.imageUrl ??
    platforms.find((p) => p.name.toLowerCase() === key)?.logo ??
    (item.domain ? brandfetchLogo(item.domain) : undefined)
  );
}

export function BookmakerLogo({
  item,
  size = "md",
}: {
  item: BookmakerListing;
  size?: "md" | "lg";
}) {
  const src = useBookmakerLogo(item);
  const [failed, setFailed] = useState<string | null>(null);
  const box = size === "lg" ? "h-14 w-24" : "h-10 w-20";
  if (src && failed !== src) {
    return (
      <PartnerLogo
        src={src}
        alt={item.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(src)}
        className={`${box} shrink-0`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-lg border border-border bg-muted font-black text-foreground ${
        size === "lg" ? "size-14 text-sm" : "size-10 text-xs"
      }`}
    >
      {initials(item.name)}
    </span>
  );
}
