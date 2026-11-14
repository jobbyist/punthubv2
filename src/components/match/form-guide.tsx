import { useTranslation } from "react-i18next";

import type { FormEntry } from "@/lib/match/form";
import { cn } from "@/lib/utils";

const TONE = {
  W: "bg-primary text-primary-foreground",
  D: "bg-muted-foreground/25 text-foreground",
  L: "bg-destructive text-destructive-foreground",
} as const;

/** Compact W/D/L squares, newest on the right (how form tables usually read). */
export function FormGuide({
  team,
  entries,
  align = "center",
  size = "sm",
}: {
  team: string;
  entries: FormEntry[] | undefined;
  align?: "start" | "center" | "end";
  size?: "sm" | "md";
}) {
  const { t } = useTranslation("matchcard");
  const justify =
    align === "start" ? "justify-start" : align === "end" ? "justify-end" : "justify-center";
  const box = size === "md" ? "size-6 text-[11px]" : "size-4 text-[9px] sm:size-[18px]";

  if (!entries || entries.length === 0) {
    return (
      <span
        className={cn("flex gap-[3px]", justify)}
        role="img"
        aria-label={t("form.noneAria", { team })}
        title={t("form.none")}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn("rounded-[4px] border border-dashed border-border", box)} />
        ))}
      </span>
    );
  }

  const oldestFirst = [...entries].reverse();
  return (
    <span
      className={cn("flex gap-[3px]", justify)}
      role="img"
      aria-label={t("form.aria", {
        team,
        count: entries.length,
        results: oldestFirst.map((e) => t(`form.${e.result}`)).join(", "),
      })}
    >
      {oldestFirst.map((e, i) => (
        <span
          key={`${e.kickoff_at}-${i}`}
          className={cn(
            "puntr-pop grid place-items-center rounded-[4px] font-bold leading-none",
            box,
            TONE[e.result],
          )}
          style={{ ["--i" as string]: i }}
          title={`${e.result} ${e.scored}-${e.conceded} ${e.venue === "H" ? "v" : "@"} ${e.opponent}`}
          aria-hidden="true"
        >
          {e.result}
        </span>
      ))}
    </span>
  );
}
