import { Link } from "@tanstack/react-router";
import { BadgeCheck, Flame, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import {
  fetchMyTipsterSupport,
  streakShare,
  unlockStage,
  winsToGo,
  type MyTipsterSupport,
  type StreakMark,
} from "@/lib/tipster-support";

const MARK: Record<StreakMark, string> = {
  W: "bg-primary text-primary-foreground",
  L: "bg-destructive/15 text-destructive",
  S: "bg-muted text-muted-foreground",
};

/**
 * The "predict to unlock" nudge: streak ring, last results and the next step. Shows nothing to guests or while
 * the Tipster Support migration is not live. Pass `data` when the parent already loaded it.
 */
export function TipsterUnlockProgress({
  compact = false,
  data: preloaded,
  className = "",
}: {
  compact?: boolean;
  data?: MyTipsterSupport | null;
  className?: string;
}) {
  const { user } = useSession();
  const { data: loaded } = useAsync(
    () => (preloaded !== undefined || !user ? Promise.resolve(null) : fetchMyTipsterSupport()),
    [user?.id, preloaded === undefined],
  );
  const data = preloaded !== undefined ? preloaded : loaded;
  if (!user || !data || !data.enabled) return null;
  return <UnlockCard data={data} compact={compact} className={className} />;
}

function UnlockCard({
  data,
  compact,
  className,
}: {
  data: MyTipsterSupport;
  compact: boolean;
  className: string;
}) {
  const { t } = useTranslation("tipster");
  const stage = unlockStage(data);
  const { progress } = data;
  if (compact && stage === "paused") return null;

  const share = streakShare(progress);
  const r = 26;
  const circ = 2 * Math.PI * r;
  const heading =
    stage === "close"
      ? t("nudge.close", { count: winsToGo(progress) })
      : stage === "building"
        ? t("nudge.building", { target: progress.target })
        : t(`nudge.${stage}`);

  return (
    <section
      className={`card-surface relative overflow-hidden p-5 ${className}`}
      aria-labelledby="tipster-nudge-title"
    >
      <div className="flex items-start gap-4">
        <div className="relative grid size-16 shrink-0 place-items-center" aria-hidden="true">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle cx="32" cy="32" r={r} className="fill-none stroke-muted" strokeWidth="6" />
            <circle
              cx="32"
              cy="32"
              r={r}
              className="fill-none stroke-primary transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none"
              strokeWidth="6"
              strokeDasharray={circ}
              strokeDashoffset={stage === "unlocked" ? 0 : circ * (1 - share)}
            />
          </svg>
          {stage === "unlocked" ? (
            <BadgeCheck className="size-6 text-primary" />
          ) : stage === "verify" ? (
            <ShieldCheck className="size-6 text-primary" />
          ) : (
            <span className="font-display text-lg font-extrabold tnum">{progress.streak}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
            <Flame className="size-3.5" aria-hidden="true" />
            {t("nudge.eyebrow")}
          </p>
          <h2 id="tipster-nudge-title" className="mt-1 text-base leading-snug">
            {heading}
          </h2>
          {stage === "unlocked" ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("nudge.unlockedBody")}</p>
          ) : (
            stage !== "paused" && (
              <>
                {!compact && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("nudge.body", { target: progress.target, days: progress.window_days })}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  <span className="sr-only">{t("nudge.streak")}: </span>
                  {t("nudge.of", { streak: progress.streak, target: progress.target })}
                </p>
              </>
            )
          )}
        </div>
      </div>

      {!compact && progress.recent.length > 0 && stage !== "unlocked" && (
        <ol className="mt-4 flex flex-wrap gap-1" aria-label={t("nudge.streak")}>
          {progress.recent.map((m, i) => (
            <li
              key={i}
              title={t(`nudge.mark${m}`)}
              className={`grid size-7 place-items-center text-xs font-bold ${MARK[m]}`}
            >
              <span aria-hidden="true">{m === "S" ? "·" : m}</span>
              <span className="sr-only">{t(`nudge.mark${m}`)}</span>
            </li>
          ))}
        </ol>
      )}

      {!compact && stage !== "unlocked" && stage !== "paused" && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("nudge.rules", { odds: progress.min_odds.toFixed(2) })}
        </p>
      )}

      {stage !== "paused" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {stage === "unlocked" ? (
            <Button asChild size="sm">
              <Link to="/tipster-support" search={{ tab: "tipster" }}>
                {t("nudge.setupCta")}
              </Link>
            </Button>
          ) : stage === "verify" ? (
            <Button asChild size="sm">
              <Link to="/account" hash="identity">
                {t("nudge.verifyCta")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/fixtures">{t("nudge.cta")}</Link>
            </Button>
          )}
          {compact && (
            <Button asChild size="sm" variant="outline">
              <Link to="/tipster-support" search={{ tab: "how" }}>
                {t("nudge.learn")}
              </Link>
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
