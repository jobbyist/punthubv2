import { useTranslation } from "react-i18next";

import { useAsync } from "@/hooks/use-async";
import { getFoundingSpots } from "@/lib/founding.functions";

export function FoundingCounter({
  className = "",
  compact = false,
  tracker = false,
}: {
  className?: string;
  compact?: boolean;
  tracker?: boolean;
}) {
  const { t } = useTranslation("common");
  const { data } = useAsync(() => getFoundingSpots(), []);
  if (!data) return null;

  const claimed = Math.max(0, Math.min(data.cap, data.cap - data.left));
  const progress = data.cap > 0 ? (claimed / data.cap) * 100 : 0;
  const full = data.left <= 0;

  if (tracker) {
    return (
      <div
        className={`w-full ${className}`}
        aria-label={t("foundingCounter.claimed", { claimed, cap: data.cap })}
        aria-live="polite"
      >
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
          <span>{full ? t("foundingCounter.full") : t("foundingCounter.claimed", { claimed, cap: data.cap })}</span>
          <span className="shrink-0 tabular-nums">{Math.max(0, data.left)} {t("foundingCounter.remaining")}</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={t("foundingCounter.progressLabel")}
          aria-valuemin={0}
          aria-valuemax={data.cap}
          aria-valuenow={claimed}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`inline-flex h-9 max-w-[156px] items-center gap-2 rounded-lg border border-primary/30 bg-primary-soft/70 px-2.5 text-[11px] font-semibold text-primary ${className}`}
        aria-label={t("foundingCounter.compact", { left: Math.max(0, data.left), cap: data.cap })}
        title={t("foundingCounter.compact", { left: Math.max(0, data.left), cap: data.cap })}
      >
        <span
          className={`size-1.5 shrink-0 rounded-full ${full ? "bg-muted-foreground" : "animate-pulse bg-primary"}`}
        />
        <span className="truncate tabular-nums">
          {full
            ? t("foundingCounter.full")
            : t("foundingCounter.left", { left: data.left, cap: data.cap })}
        </span>
      </div>
    );
  }

  return (
    <section
      className={`w-full max-w-xl overflow-hidden border border-primary/40 bg-primary-soft/70 p-4 shadow-sm sm:p-5 ${className}`}
      aria-label="Founding Member availability"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {full ? "Founding spots claimed" : "Limited founding access"}
          </p>
          <p className="mt-1 text-2xl font-black leading-none tracking-tight text-foreground sm:text-3xl tnum">
            {full ? "All spots claimed" : `${data.left} / ${data.cap} left`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {full
              ? "The first 100 Founding Member places have been taken."
              : `${claimed} of ${data.cap} places claimed. Join before the founding allocation closes.`}
          </p>
        </div>
        {!full && (
          <span className="inline-flex w-fit shrink-0 items-center gap-2 border border-primary/30 bg-background px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            Limited places
          </span>
        )}
      </div>
      <div
        className="mt-4 h-2.5 overflow-hidden rounded-full bg-background/80"
        role="progressbar"
        aria-label="Founding places claimed"
        aria-valuemin={0}
        aria-valuemax={data.cap}
        aria-valuenow={claimed}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-semibold text-muted-foreground">
        <span>{claimed} claimed</span>
        <span>{data.left} remaining</span>
      </div>
    </section>
  );
}
