import { Check, Coins, Crown, Sparkles } from "lucide-react";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { AnnualPassClaim } from "@/components/annual-pass-claim";
import { Em } from "@/components/em";
import { OptionalStepHeader } from "@/components/onboarding/join-progress";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { trackEvent } from "@/lib/analytics";
import { PACKS, PRO_MONTHLY_PRICE } from "@/lib/economics";
import { money } from "@/lib/format";
import { postToPayfast } from "@/lib/payfast-form";
import { getProStatus, startCreditPurchase, startProSubscription } from "@/lib/payments.functions";

const FREE = ["f1", "f2", "f3"] as const;
const PRO = ["f1", "f2", "f3", "f4", "f5"] as const;
const USES = [
  ["preview", 5],
  ["slip", 3],
  ["stats", 2],
] as const;

type PackName = (typeof PACKS)[number]["name"];

/**
 * Sign-up step 5 (optional): the free plan, the Founding Annual Pass (while places last), Puntr Pro and
 * Pay-As-You-Go credits. Checkout goes straight to PayFast when payments are switched on; until then the offers are
 * shown with their launch status and nothing can be bought. Skipping keeps the member on the free plan.
 */
export function PlanStep({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation("auth");
  const { t: tp } = useTranslation("pricing");
  const { emailConfirmed } = useSession();
  const pro = useAsync(() => getProStatus(), []);
  const available = pro.data?.available === true;
  const hasPro = pro.data?.hasPro === true;
  const [pack, setPack] = useState<PackName>("matchday");
  const [busy, setBusy] = useState<"pro" | "pack" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const skip = (action: "skipped" | "free") => {
    trackEvent("onboarding_plan", { action });
    onNext();
  };

  const startPro = async () => {
    setBusy("pro");
    setError(null);
    trackEvent("onboarding_plan", { action: "pro_checkout" });
    try {
      const r = await startProSubscription();
      if (!r.ok) {
        if (r.error === "already_pro") return onNext();
        setError(t("join.plan.error"));
        setBusy(null);
        return;
      }
      postToPayfast(r.action, r.fields);
    } catch (err) {
      console.error("onboarding pro checkout failed", err);
      setError(t("join.plan.error"));
      setBusy(null);
    }
  };

  const buyPack = async () => {
    setBusy("pack");
    setError(null);
    trackEvent("onboarding_plan", { action: "pack_checkout", pack });
    try {
      const r = await startCreditPurchase({ data: { pack } });
      if (!r.ok) {
        setError(t("join.plan.error"));
        setBusy(null);
        return;
      }
      postToPayfast(r.action, r.fields);
    } catch (err) {
      console.error("onboarding pack checkout failed", err);
      setError(t("join.plan.error"));
      setBusy(null);
    }
  };

  const selected = PACKS.find((p) => p.name === pack) ?? PACKS[1];

  return (
    <div className="space-y-5">
      <OptionalStepHeader
        step={5}
        title={t("join.plan.title")}
        subtitle={t("join.plan.subtitle")}
        onSkip={() => skip("skipped")}
        skipDisabled={busy !== null}
      />

      {/* Free: what every member already has. */}
      <section className="rounded-xl border border-border p-4" aria-labelledby="plan-free">
        <div className="flex items-center justify-between gap-3">
          <h3 id="plan-free" className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("join.plan.free.title")}
          </h3>
          <span className="bg-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("join.plan.free.badge")}
          </span>
        </div>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-3">
          {FREE.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              {t(`join.plan.free.${f}`)}
            </li>
          ))}
        </ul>
      </section>

      {emailConfirmed && !hasPro && <AnnualPassClaim compact />}

      {/* Puntr Pro */}
      {hasPro ? (
        <p className="rounded-xl border border-primary/40 bg-primary-soft/50 p-4 text-sm font-semibold">
          {t("join.plan.alreadyPro")}
        </p>
      ) : (
        <section
          className="relative rounded-xl border-2 border-primary p-4"
          aria-labelledby="plan-pro"
        >
          <span className="absolute -top-2.5 right-4 bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
            {t("join.plan.pro.badge")}
          </span>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="plan-pro" className="flex items-center gap-2 text-base font-bold">
              <Crown className="size-4 text-primary" aria-hidden />
              {tp("pro.title")}
            </h3>
            <p className="font-display text-xl font-extrabold tnum">
              {tp("pro.price", { price: money(PRO_MONTHLY_PRICE) })}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("join.plan.pro.tagline")}</p>
          <ul className="mt-3 space-y-2">
            {PRO.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <Trans t={tp} i18nKey={`pro.${f}`} components={{ 1: <Em /> }} />
                </span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            className="mt-4 h-11 w-full"
            disabled={!available || busy !== null}
            onClick={() => void startPro()}
          >
            {busy === "pro"
              ? t("join.plan.redirecting")
              : available
                ? t("join.plan.pro.cta", { price: money(PRO_MONTHLY_PRICE) })
                : tp("pro.cta")}
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {available ? t("join.plan.pro.fine") : t("join.plan.atLaunch")}
          </p>
        </section>
      )}

      {/* Pay-As-You-Go credits */}
      <section className="rounded-xl border border-border p-4" aria-labelledby="plan-payg">
        <h3 id="plan-payg" className="flex items-center gap-2 text-base font-bold">
          <Coins className="size-4 text-primary" aria-hidden />
          {tp("payg.title")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{tp("payg.tagline")}</p>
        <div
          role="radiogroup"
          aria-label={tp("payg.packs")}
          className="mt-3 grid grid-cols-3 gap-2"
        >
          {PACKS.map((p) => {
            const on = p.name === pack;
            return (
              <button
                key={p.name}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={busy !== null}
                onClick={() => setPack(p.name)}
                className={`relative flex flex-col items-center gap-0.5 border p-2.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${on ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              >
                {p.name === "matchday" && (
                  <span className="absolute -top-2 bg-foreground px-1.5 text-[9px] font-bold uppercase tracking-wider text-background">
                    {t("join.plan.payg.popular")}
                  </span>
                )}
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {tp(`payg.pack.${p.name}`)}
                </span>
                <span className="font-display text-lg font-extrabold tnum">{p.credits}</span>
                <span className="text-[10px] text-muted-foreground">
                  {t("join.plan.payg.credits")}
                </span>
                <span className="mt-0.5 text-xs font-semibold tnum">{money(p.price)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {USES.map(([use, cost], i) => (
            <span key={use}>
              {i > 0 && " · "}
              {tp(`payg.use.${use}`)} {tp("payg.use.cost", { count: cost })}
            </span>
          ))}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 w-full"
          disabled={!available || busy !== null}
          onClick={() => void buyPack()}
        >
          {busy === "pack"
            ? t("join.plan.redirecting")
            : available
              ? t("join.plan.payg.cta", {
                  count: selected.credits,
                  price: money(selected.price),
                })
              : t("join.plan.payg.soon")}
        </Button>
      </section>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          className="h-11 w-full"
          disabled={busy !== null}
          onClick={() => skip("free")}
        >
          {t("join.plan.continueFree")}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{t("join.plan.later")}</p>
      </div>
    </div>
  );
}
