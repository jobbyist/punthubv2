import { useTranslation } from "react-i18next";

/** "LIVE" with a softly glowing green dot. Decorative motion respects reduced-motion settings. */
export function LiveBadge({ className = "" }: { className?: string }) {
  const { t } = useTranslation("common");
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary ${className}`}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_2px_var(--color-primary)] motion-safe:animate-pulse"
      />
      {t("badge.live")}
    </span>
  );
}
