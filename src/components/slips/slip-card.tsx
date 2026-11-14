import { Eye, EyeOff, Lock, Send, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { money, odds as fmtOdds } from "@/lib/format";
import type { SlipView } from "@/lib/slips/slips-data";
import { cn } from "@/lib/utils";

const RESULT_TONE: Record<SlipView["result"], string> = {
  won: "bg-primary text-primary-foreground",
  lost: "bg-destructive text-destructive-foreground",
  pending: "bg-muted text-foreground",
  partial: "bg-muted text-muted-foreground",
  void: "bg-muted text-muted-foreground",
};

export function SlipCard({
  slip,
  busy,
  onPublish,
  onDelete,
  onToggleStake,
}: {
  slip: SlipView;
  busy?: boolean;
  onPublish?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStake?: (id: string, show: boolean) => void;
}) {
  const { t } = useTranslation("slips");
  const draft = slip.status === "draft";
  const label = (
    market: string | null,
    selection: string | null,
    home: string | null,
    away: string | null,
  ) => {
    if (!market || !selection) return null;
    const base = t(`selections.${selection}`);
    if (market === "1X2" && selection === "home" && home) return home;
    if (market === "1X2" && selection === "away" && away) return away;
    return `${t(`markets.${market}`)}: ${base}`;
  };

  return (
    <article className="border border-border bg-card p-4">
      <header className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {draft ? (
          <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 text-xs font-semibold">
            <Lock className="size-3" aria-hidden /> {t("card.draft")}
          </span>
        ) : (
          <span className={cn("px-2 py-0.5 text-xs font-semibold", RESULT_TONE[slip.result])}>
            {t(`result.${slip.result}`)}
          </span>
        )}
        {slip.username && !slip.mine && (
          <span className="text-muted-foreground">{t("card.by", { name: slip.username })}</span>
        )}
        {slip.mine && slip.bookmaker && <span className="font-semibold">{slip.bookmaker}</span>}
        <span className="ml-auto text-muted-foreground">
          {t("card.legs", { count: slip.legs.length })}
        </span>
      </header>

      <ol className="divide-y divide-border">
        {slip.legs.map((l) => (
          <li key={l.position} className="flex items-start justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="truncate font-semibold">
                {l.home} v {l.away}
              </p>
              <p className="text-muted-foreground">
                {label(l.market, l.selection, l.home, l.away) ??
                  ([l.raw_market, l.raw_selection].filter(Boolean).join(": ") ||
                    t("review.trackedOnly"))}
                {!l.prediction_id && !draft && (
                  <span className="ml-2 text-xs">· {t("review.trackedOnly")}</span>
                )}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {l.odds != null && (
                <p className="font-mono font-semibold">{fmtOdds(Number(l.odds))}</p>
              )}
              {l.result && (
                <p className="text-xs text-muted-foreground">{t(`result.${l.result}`, l.result)}</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {slip.total_odds != null && (
          <span>{t("card.odds", { odds: fmtOdds(Number(slip.total_odds)) })}</span>
        )}
        {slip.stake != null && (
          <span>{t("card.stake", { amount: money(Number(slip.stake)) })}</span>
        )}
        {slip.potential_return != null && (
          <span>{t("card.return", { amount: money(Number(slip.potential_return)) })}</span>
        )}
        {slip.note && <p className="w-full text-muted-foreground">{slip.note}</p>}
        {slip.mine && (
          <div className="ml-auto flex gap-2">
            {draft && onPublish && (
              <Button size="sm" disabled={busy} onClick={() => onPublish(slip.id)}>
                <Send className="size-4" aria-hidden /> {t("card.publish")}
              </Button>
            )}
            {!draft && onToggleStake && (slip.stake != null || slip.potential_return != null) && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onToggleStake(slip.id, !slip.show_stake)}
              >
                {slip.show_stake ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
                {slip.show_stake ? t("card.hideStake") : t("card.showStake")}
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                aria-label={t("card.delete")}
                onClick={() => {
                  if (window.confirm(t("card.confirmDelete"))) onDelete(slip.id);
                }}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}
