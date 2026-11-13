import { useBadges } from "@/lib/badges/store";

/**
 * Endless strip of real club badges (verified badges only). Decorative: the names are in the alt text of the first
 * copy and the duplicate copy is hidden from screen readers.
 */
export function BadgeMarquee({ label }: { label: string }) {
  const badges = useBadges();
  const items = badges
    ? [...badges.entries()].filter(([k]) => k.startsWith("soccer:")).slice(0, 30)
    : [];
  if (items.length < 6) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-10 pr-10" aria-hidden={hidden || undefined}>
      {items.map(([key, url]) => (
        <li key={`${hidden ? "b" : "a"}-${key}`}>
          <img
            src={url}
            alt={hidden ? "" : key.replace("soccer:", "")}
            loading="lazy"
            className="size-12 rounded-full bg-white object-contain p-1 opacity-80 ring-1 ring-border grayscale transition hover:opacity-100 hover:grayscale-0"
          />
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
