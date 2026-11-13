/**
 * Decorative hero background: drifting brand-green glows, a faint grid and pitch markings that draw themselves.
 * Pure CSS/SVG, aria-hidden, paused for prefers-reduced-motion.
 */
export function HeroBackdrop({
  variant = "pitch",
  glow = false,
}: {
  variant?: "pitch" | "grid";
  /** Soft green glows. Off by default: on white they read as a green tint (owner feedback, 13 Nov). */
  glow?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.3]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black 30%, transparent 75%)",
        }}
      />
      {glow && (
        <>
          <div className="puntr-float absolute -left-24 -top-24 size-[420px] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/15" />
          <div
            className="puntr-float absolute -right-32 top-24 size-[360px] rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/10"
            style={{ animationDelay: "-4s" }}
          />
        </>
      )}
      {variant === "pitch" && (
        <svg
          className="absolute right-[-120px] top-1/2 hidden h-[520px] w-[820px] -translate-y-1/2 text-foreground/[0.07] lg:block dark:text-primary/20"
          viewBox="0 0 820 520"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect className="puntr-draw" x="10" y="10" width="800" height="500" rx="6" />
          <line className="puntr-draw" x1="410" y1="10" x2="410" y2="510" />
          <circle className="puntr-draw" cx="410" cy="260" r="80" />
          <rect className="puntr-draw" x="10" y="140" width="130" height="240" />
          <rect className="puntr-draw" x="680" y="140" width="130" height="240" />
          <rect className="puntr-draw" x="10" y="205" width="50" height="110" />
          <rect className="puntr-draw" x="760" y="205" width="50" height="110" />
        </svg>
      )}
    </div>
  );
}
