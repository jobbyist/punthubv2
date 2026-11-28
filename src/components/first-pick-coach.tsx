import { Lightbulb, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useUserContext } from "@/components/user-context";
import { trackEvent } from "@/lib/analytics";

const TIP_ID = "first-pick-coach";

/**
 * A short, dismissible walkthrough shown above the pick form to signed-in members who haven't posted a pick yet.
 * It disappears on its own once they post (the context layer counts the pick) or when they close it.
 */
export function FirstPickCoach({ open }: { open: boolean }) {
  const { t } = useTranslation("match");
  const ctx = useUserContext();
  if (!open || !ctx.ready || ctx.segment !== "member-onboarding" || ctx.isDismissed(TIP_ID))
    return null;
  const steps = ["market", "outcome", "post"] as const;
  return (
    <aside
      aria-labelledby="first-pick-coach-title"
      className="relative rounded-xl border border-primary/30 bg-primary-soft/60 p-4 sm:p-5"
    >
      <button
        type="button"
        onClick={() => {
          ctx.dismiss(TIP_ID);
          trackEvent("first_pick_coach_dismissed", {});
        }}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        aria-label={t("coach.dismiss")}
      >
        <X className="size-4" aria-hidden />
      </button>
      <div className="flex items-center gap-2 pr-8">
        <Lightbulb className="size-4 shrink-0 text-primary" aria-hidden />
        <h2 id="first-pick-coach-title" className="text-sm font-bold">
          {t("coach.title")}
        </h2>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-2 text-sm leading-snug">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{t(`coach.steps.${step}`)}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
