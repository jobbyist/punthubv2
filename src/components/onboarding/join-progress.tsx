import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

export const JOIN_STEPS = ["account", "confirm", "profile", "avatar", "plan"] as const;
export type JoinStepKey = (typeof JOIN_STEPS)[number];

/** Five short steps, so new members always know how far along they are. The last two can be skipped. */
export function JoinProgress({ current }: { current: number }) {
  const { t } = useTranslation("auth");
  return (
    <ol className="mt-6 grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={t("join.progress.label")}>
      {JOIN_STEPS.map((key, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li key={key} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
            <span
              className={`block h-1.5 rounded-full transition-colors duration-500 ${state === "todo" ? "bg-muted" : "bg-primary"}`}
            />
            <span
              className={`mt-1.5 flex items-center gap-1 truncate text-[11px] font-semibold ${state === "current" ? "text-foreground" : "text-muted-foreground"}`}
            >
              {state === "done" ? (
                <Check className="size-3 shrink-0 text-primary" aria-hidden />
              ) : (
                <span className="tnum">{i + 1}.</span>
              )}
              <span className="truncate">{t(`join.progress.${key}`)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Eyebrow and skip link shared by the optional steps. */
export function OptionalStepHeader({
  step,
  title,
  subtitle,
  onSkip,
  skipDisabled,
}: {
  step: number;
  title: string;
  subtitle: string;
  onSkip: () => void;
  skipDisabled?: boolean;
}) {
  const { t } = useTranslation("auth");
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          {t("join.stepOf", { step, total: JOIN_STEPS.length })} · {t("join.optional")}
        </p>
        <button
          type="button"
          onClick={onSkip}
          disabled={skipDisabled}
          className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
        >
          {t("join.skip")}
        </button>
      </div>
      <h2 className="mt-2 text-xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}
