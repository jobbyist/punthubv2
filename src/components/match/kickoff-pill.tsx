import { useTranslation } from "react-i18next";

import { useNow } from "@/hooks/use-now";
import { formatShortDay, formatTime, saDayKey } from "@/lib/format";
import { countdownTo, formatSpan } from "@/lib/picks";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 3600 * 1000;

/**
 * "Today 15:30 SAST", "Tomorrow 20:00 SAST" or "Sat 21 Nov · 15:30 SAST", plus a live countdown inside the last
 * six hours. Before mount it shows the date form, so server and first client render agree.
 */
export function KickoffPill({
  kickoff,
  status,
  className,
}: {
  kickoff: string;
  status?: string | undefined;
  className?: string;
}) {
  const { t } = useTranslation("matchcard");
  const now = useNow();

  if (status === "live") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground",
          className,
        )}
      >
        <span
          className="puntr-blink size-1.5 rounded-full bg-primary-foreground"
          aria-hidden="true"
        />
        {t("live")}
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground",
          className,
        )}
      >
        {t("fullTime")}
      </span>
    );
  }

  let day = formatShortDay(kickoff);
  let soon: string | null = null;
  if (now) {
    const key = saDayKey(kickoff);
    if (key === saDayKey(now)) day = t("today");
    else if (key === saDayKey(now.getTime() + DAY_MS)) day = t("tomorrow");
    const c = countdownTo(kickoff, now);
    if (c.state === "open" && c.days === 0 && c.hours < 6)
      soon = t("startsIn", { span: formatSpan(c) });
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold tnum",
        soon && "bg-primary-soft text-primary",
        className,
      )}
    >
      <span>
        {day} {formatTime(kickoff)}
      </span>
      {soon && <span className="font-bold">· {soon}</span>}
    </span>
  );
}
