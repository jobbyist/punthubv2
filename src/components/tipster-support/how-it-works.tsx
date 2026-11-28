import { Crown, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MyTipsterSupport } from "@/lib/tipster-support";

import { TipsterUnlockProgress } from "./unlock-progress";

const DEFAULTS = { support_limit_pro: 10, fee_pct_free: 10 };

/** Plain-language rules, the Pro difference and the fairness safeguards. */
export function TipsterHowItWorks({ limits }: { limits?: MyTipsterSupport["limits"] | undefined }) {
  const { t } = useTranslation("tipster");
  const limitPro = limits?.support_limit_pro ?? DEFAULTS.support_limit_pro;
  const feeFree = limits?.fee_pct_free ?? DEFAULTS.fee_pct_free;
  const limitFree =
    limits && limits.support_limit_pro !== limits.support_limit ? limits.support_limit : 2;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card-surface p-5 sm:p-6" aria-labelledby="how-title">
        <h2 id="how-title" className="text-lg">
          {t("how.title")}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["s1", "s2", "s3", "s4"] as const).map((k, i) => (
            <li key={k} className="flex gap-3 text-sm text-muted-foreground">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <span>{t(`how.${k}`)}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="border border-border p-4">
            <p className="flex items-center gap-2 font-semibold">
              <Crown className="size-4 text-primary" aria-hidden="true" />
              {t("how.proTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("how.pro", { limitPro, limitFree, feeFree })}
            </p>
          </div>
          <div className="border border-border p-4">
            <p className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              {t("how.safeTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("how.safe")}</p>
          </div>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">{t("card.noAdvice")}</p>
      </section>
      <aside>
        <TipsterUnlockProgress />
      </aside>
    </div>
  );
}
