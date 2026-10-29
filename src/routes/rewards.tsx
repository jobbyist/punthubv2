import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RgNotice } from "@/components/rg-notice";
import { ReferralCard } from "@/components/referral-card";
import { useSession } from "@/components/session";
import { Button } from "@/components/ui/button";
import { AccountPage } from "@/components/account-gate";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, points } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { affordability, needsGamblingLabels, redeemErrorKey, ruleLimit } from "@/lib/rewards";
import {
  fetchBalance,
  fetchHistory,
  fetchRedemptions,
  fetchRewards,
  fetchRewardsStatus,
  fetchRules,
  notifyPointsChanged,
} from "@/lib/rewards-data";

export const Route = createFileRoute("/rewards")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "rewards");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/rewards" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Rewards,
});

function Earn() {
  const { t } = useTranslation("rewards");
  const { data } = useAsync(fetchRules, []);
  if (!data || data.length === 0) return null;
  return (
    <section className="card-surface mt-5 p-5">
      <h2 className="text-lg">{t("earn.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("earn.body")}</p>
      <ul className="mt-3 divide-y divide-border text-sm">
        {data.map((r) => {
          const limit = ruleLimit(r);
          return (
            <li key={r.code} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
              <span>
                {t(`rule.${r.code}`, { defaultValue: r.title })}
                {limit && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {t(`earn.limit.${limit.kind}`, { count: limit.count })}
                  </span>
                )}
              </span>
              <span className="font-semibold text-primary tnum">
                +{points(r.points)} {t("unit")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Catalogue({ balance, onChange }: { balance: number; onChange: () => void }) {
  const { t } = useTranslation("rewards");
  const [tick, setTick] = useState(0);
  const { data, failed } = useAsync(fetchRewards, [tick, balance]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeem(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("redeem_reward", { p_reward: id });
    setBusy(false);
    setConfirm(null);
    if (error) {
      toast.error(t(`redeem.error.${redeemErrorKey(error)}`));
    } else {
      toast.success(t("redeem.done"));
    }
    notifyPointsChanged();
    setTick((n) => n + 1);
    onChange();
  }

  if (failed) return <p className="mt-5 text-sm text-destructive">{t("catalogue.error")}</p>;
  if (!data) return null;

  return (
    <section className="mt-5" aria-labelledby="catalogue-title">
      <h2 id="catalogue-title" className="text-lg">
        {t("catalogue.title")}
      </h2>
      {data.length === 0 ? (
        <p className="card-surface mt-3 p-5 text-sm text-muted-foreground">
          {t("catalogue.empty")}
        </p>
      ) : (
        <ul className="mt-3 grid gap-4 sm:grid-cols-2">
          {data.map((r) => {
            const afford = affordability(balance, r.points_cost);
            const gambling = needsGamblingLabels(r.kind);
            return (
              <li key={r.id} className="card-surface flex flex-col p-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                  {t(`kind.${r.kind}`)}
                  {gambling && (
                    <span className="ml-2 border border-border px-1.5 text-muted-foreground">
                      {t("ad")}
                    </span>
                  )}
                </p>
                <h3 className="mt-1 text-base">{r.title}</h3>
                {r.sponsor && (
                  <p className="text-xs text-muted-foreground">
                    {t("catalogue.sponsor", { name: r.sponsor })}
                  </p>
                )}
                {r.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                )}
                <p className="mt-3 text-lg font-bold tnum">
                  {points(r.points_cost)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{t("unit")}</span>
                </p>
                {gambling && <RgNotice variant="compact" className="mt-2" />}
                {confirm === r.id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button disabled={busy} onClick={() => void redeem(r.id)}>
                      {busy
                        ? t("redeem.working")
                        : t("redeem.confirm", { cost: points(r.points_cost) })}
                    </Button>
                    <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
                      {t("redeem.cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="mt-3"
                    disabled={!r.in_stock || !afford.ok}
                    onClick={() => setConfirm(r.id)}
                  >
                    {!r.in_stock
                      ? t("redeem.outOfStock")
                      : afford.ok
                        ? t("redeem.button")
                        : t("redeem.short", { short: points(afford.short) })}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Redemptions({ tick }: { tick: number }) {
  const { t } = useTranslation("rewards");
  const { data } = useAsync(fetchRedemptions, [tick]);
  if (!data || data.length === 0) return null;
  return (
    <section className="card-surface mt-5 p-5">
      <h2 className="text-lg">{t("redemptions.title")}</h2>
      <ul className="mt-3 divide-y divide-border text-sm">
        {data.map((r) => (
          <li key={r.id} className="py-3">
            <p className="font-semibold">{r.reward?.title ?? t("redemptions.unknown")}</p>
            <p className="text-xs text-muted-foreground tnum">
              {formatDate(r.created_at)} · {points(r.points)} {t("unit")} ·{" "}
              {t(`redemptions.status.${r.status}`)}
            </p>
            {r.status === "fulfilled" && r.voucher_code && (
              <p className="mt-2 flex flex-wrap items-center gap-2">
                <code className="break-all border border-border bg-muted/40 px-2 py-1 text-xs">
                  {r.voucher_code}
                </code>
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(r.voucher_code ?? "");
                      toast.success(t("redemptions.copied"));
                    } catch {
                      toast.error(t("redemptions.copyFailed"));
                    }
                  }}
                >
                  {t("redemptions.copy")}
                </button>
              </p>
            )}
            {r.status === "cancelled" && r.note && (
              <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function History({ tick }: { tick: number }) {
  const { t } = useTranslation("rewards");
  const { data } = useAsync(() => fetchHistory(20), [tick]);
  if (!data || data.length === 0) return null;
  return (
    <section className="card-surface mt-5 p-5">
      <h2 className="text-lg">{t("history.title")}</h2>
      <ul className="mt-3 divide-y divide-border text-sm">
        {data.map((h) => (
          <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span>
              {h.rule_code
                ? t(`rule.${h.rule_code}`, { defaultValue: t(`history.kind.${h.kind}`) })
                : t(`history.kind.${h.kind}`)}
              <span className="ml-2 text-xs text-muted-foreground tnum">
                {formatDate(h.created_at)}
              </span>
            </span>
            <span className={`font-semibold tnum ${h.points < 0 ? "" : "text-primary"}`}>
              {h.points > 0 ? "+" : ""}
              {points(h.points)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Rewards() {
  const { t } = useTranslation("rewards");
  const { loading, user, profile, emailConfirmed } = useSession();
  const [tick, setTick] = useState(0);
  const status = useAsync(fetchRewardsStatus, [tick]);
  const bal = useAsync(() => (profile ? fetchBalance() : Promise.resolve(0)), [profile?.id, tick]);

  const header = (
    <>
      <h1 className="text-3xl">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
    </>
  );

  if (loading || !status.data) return <AccountPage>{header}</AccountPage>;
  const on = status.data.points;

  return (
    <AccountPage>
      {header}
      {!on && (
        <section className="card-surface mt-6 p-5">
          <h2 className="text-lg">{t("soon.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("soon.body")}</p>
        </section>
      )}

      {on && !user && (
        <section className="card-surface mt-6 p-5">
          <p className="text-sm">{t("signIn.body")}</p>
          <Button asChild className="mt-3">
            <Link to="/join">{t("signIn.cta")}</Link>
          </Button>
        </section>
      )}

      {on && user && profile && !emailConfirmed && (
        <section className="card-surface mt-6 p-5">
          <p className="text-sm font-semibold">{t("confirm.title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("confirm.body")}</p>
          <Button asChild className="mt-3">
            <Link to="/account/security">{t("confirm.cta")}</Link>
          </Button>
        </section>
      )}

      {on && profile && (
        <section className="card-surface mt-6 p-5" aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("balance")}
          </p>
          <p className="mt-1 text-4xl font-extrabold tnum">
            {points(bal.data ?? 0)}{" "}
            <span className="text-base font-semibold text-muted-foreground">{t("unit")}</span>
          </p>
        </section>
      )}

      {on && <Earn />}
      {on && profile && <ReferralCard />}
      {on && profile && status.data.rewards && (
        <Catalogue balance={bal.data ?? 0} onChange={() => setTick((n) => n + 1)} />
      )}
      {on && profile && !status.data.rewards && (
        <section className="card-surface mt-5 p-5">
          <h2 className="text-lg">{t("catalogue.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("catalogue.soon")}</p>
        </section>
      )}
      {on && profile && <Redemptions tick={tick} />}
      {on && profile && <History tick={tick} />}

      <p className="mt-6 text-xs text-muted-foreground">{t("rules.note")}</p>
      <RgNotice variant="compact" className="mt-4" />
    </AccountPage>
  );
}
