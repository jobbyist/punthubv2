import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { probabilities } from "@/lib/practice/simulator";
import { fetchDemoWallet, spendDemoCredits } from "@/lib/wallet";

/**
 * Practice Mode demo wallet: demo PAYG credits (30 to start, a free top-up when low) and the practice points
 * balance. Demo credits unlock the practice match insight, the same way real credits will unlock premium tools.
 * Nothing here touches real credits or PuntPoints.
 */
export function DemoWalletCard({ nonce }: { nonce: number }) {
  const { t } = useTranslation("practice");
  const wallet = useAsync(() => fetchDemoWallet(), [nonce]);
  const w = wallet.data;
  return (
    <section className="card-surface mt-6 p-5" aria-labelledby="demo-wallet">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="demo-wallet" className="text-lg">
          {t("wallet.title")}
        </h2>
        <span className="border border-border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {t("wallet.demo")}
        </span>
      </div>
      {wallet.loading && !w ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : !w ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("wallet.error")}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("wallet.credits")}
              </p>
              <p className="font-display text-3xl font-bold tnum">{w.credits}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {t("wallet.points")}
              </p>
              <p className="font-display text-3xl font-bold tnum">{w.points}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("wallet.note")}</p>
          {w.history.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold">{t("wallet.history")}</summary>
              <ul className="mt-2 divide-y divide-border">
                {w.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex justify-between gap-2 py-1.5">
                    <span>{t(`wallet.kind.${h.kind}`, { defaultValue: h.kind })}</span>
                    <span
                      className={`tnum font-semibold ${h.credits < 0 ? "text-destructive" : "text-primary"}`}
                    >
                      {h.credits > 0 ? "+" : ""}
                      {h.credits}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/** Practice match insight: the simulator's own model, unlocked for 2 demo credits per fixture. */
export function MatchInsight({
  fixtureId,
  lambdaHome,
  lambdaAway,
  onSpent,
}: {
  fixtureId: string;
  lambdaHome: number;
  lambdaAway: number;
  onSpent: () => void;
}) {
  const { t } = useTranslation("practice");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);

  async function unlock() {
    setBusy(true);
    try {
      const r = await spendDemoCredits("match_insight", `insight:${fixtureId}`);
      if (!r.ok) {
        toast.error(
          r.error === "insufficient_credits" ? t("insight.noCredits") : t("insight.error"),
        );
        return;
      }
      setShown(true);
      onSpent();
    } finally {
      setBusy(false);
    }
  }

  if (!shown)
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void unlock()}>
        {t("insight.unlock")}
      </Button>
    );
  const p = probabilities(lambdaHome, lambdaAway);
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
      <p className="font-semibold">{t("insight.title")}</p>
      <p className="mt-1 tnum">
        {t("insight.result", { home: pct(p.home), draw: pct(p.draw), away: pct(p.away) })}
      </p>
      <p className="tnum">{t("insight.goals", { over: pct(p.over25), btts: pct(p.bttsYes) })}</p>
      <p className="mt-1 text-muted-foreground">{t("insight.note")}</p>
    </div>
  );
}
