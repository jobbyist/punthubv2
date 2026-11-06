import { BarChart3, Brain, Gauge, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Intelligence metadata for a fixture: Confidence Score, Algorithmic Pick, odds comparison and model analysis.
 * Owner decision (6 Nov 2026): placeholders until the Puntr model is live; odds comparison shows "coming soon"
 * (no odds comparison at launch, no bookmaker names). Nothing here invents a number.
 */
export function IntelPanel({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("intel");
  return (
    <div className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2"} text-xs`}>
      <div className="flex items-center gap-3 border border-border p-2">
        <Gauge className="size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{t("confidence")}</p>
          <div className="mt-1 h-1.5 w-full bg-muted" role="presentation">
            <div className="h-full w-0 bg-primary" />
          </div>
          <p className="mt-1 text-muted-foreground">{t("confidencePending")}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 border border-border p-2">
        <Target className="size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{t("algoPick")}</p>
          <p className="mt-0.5 inline-block border border-dashed border-border px-1.5 py-0.5 text-muted-foreground">
            {t("algoPickPending")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 border border-border p-2">
        <BarChart3 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{t("odds")}</p>
          <p className="mt-0.5 text-muted-foreground">{t("oddsSoon")}</p>
        </div>
      </div>
      <div className="flex items-start gap-3 border border-border p-2">
        <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold">{t("analysis")}</p>
          <p className="mt-0.5 line-clamp-2 text-muted-foreground">{t("analysisPending")}</p>
        </div>
      </div>
    </div>
  );
}
