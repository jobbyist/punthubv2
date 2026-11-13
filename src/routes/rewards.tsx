import { createFileRoute, Link } from "@tanstack/react-router";
import { Coins, Crown, Lock, Shirt, Ticket, Trophy, type LucideIcon } from "lucide-react";
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
import { formatDate, money, points } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import {
  affordability,
  groupByCategory,
  needsGamblingLabels,
  redeemErrorKey,
  ruleLimit,
  type RewardCategory,
} from "@/lib/rewards";
import {
  fetchBalance,
  fetchCatalogue,
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

const CATEGORY_ICON: Record<RewardCategory, LucideIcon> = {
  ott_voucher: Ticket,
  credit_pack: Coins,
  pro_pass: Crown,
  puntr_merch: Shirt,
  sports_merch: Trophy,
  match_tickets: Ticket,
};

function Catalogue({
  balance,
  signedIn,
  onChange,
}: {
  balance: number;
  signedIn: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation("rewards");
  const [tick, setTick] = useState(0);
  const { data, failed } = useAsync(fetchCatalogue, [tick, balance]);
  const { data: betting } = useAsync(
    () => (signedIn ? fetchRewards() : Promise.resolve([])),
    [tick, signedIn],
  );
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function redeem(id: string) {
    setBusy(true);
    const { error } = await supabase.rpc("redeem_reward", { p_reward: id });
    setBusy(false);
    setConfirm(null);
    if (error) {
      const key = redeemErrorKey(error);
      if (key === "identity_not_verified")
        toast.error(t("redeem.error.identity_not_verified"), {
          action: {
            label: t("redeem.verifyCta"),
            onClick: () => window.location.assign("/account#identity"),
          },
        });
      else toast.error(t(`redeem.error.${key}`));
    } else {
      toast.success(t("redeem.done"));
    }
    notifyPointsChanged();
    setTick((n) => n + 1);
    onChange();
  }

  if (failed || !data) return null;
  const groups = groupByCategory(data);
  const bettingVouchers = (betting ?? []).filter((r) => needsGamblingLabels(r.kind));
  const opensAt = data.find((r) => !r.available)?.available_from;

  const action = (r: {
    id: string;
    points_cost: number;
    in_stock: boolean;
    available: boolean;
    available_from?: string;
  }) => {
    const afford = affordability(balance, r.points_cost);
    if (!r.available)
      return (
        <Button className="mt-auto w-full" variant="outline" disabled>
          <Lock className="mr-1.5 size-3.5" aria-hidden="true" />
          {t("catalogue.opens", { date: formatDate(r.available_from ?? opensAt ?? Date.now()) })}
        </Button>
      );
    if (!signedIn)
      return (
        <Button asChild className="mt-auto w-full">
          <Link to="/join">{t("signIn.cta")}</Link>
        </Button>
      );
    if (confirm === r.id)
      return (
        <div className="mt-auto flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void redeem(r.id)}>
            {busy ? t("redeem.working") : t("redeem.confirm", { cost: points(r.points_cost) })}
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>
            {t("redeem.cancel")}
          </Button>
        </div>
      );
    return (
      <Button
        className="mt-auto w-full"
        disabled={!r.in_stock || !afford.ok}
        onClick={() => setConfirm(r.id)}
      >
        {!r.in_stock
          ? t("redeem.outOfStock")
          : afford.ok
            ? t("redeem.button")
            : t("redeem.short", { short: points(afford.short) })}
      </Button>
    );
  };

  return (
    <section className="mt-6" aria-labelledby="catalogue-title">
      <h2 id="catalogue-title" className="text-xl">
        {t("catalogue.title")}
      </h2>
      {opensAt && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          {t("catalogue.preview", { date: formatDate(opensAt) })}
        </p>
      )}
      {groups.length === 0 && bettingVouchers.length === 0 && (
        <p className="card-surface mt-3 p-5 text-sm text-muted-foreground">
          {t("catalogue.empty")}
        </p>
      )}
      {groups.map((g) => {
        const Icon = CATEGORY_ICON[g.category];
        return (
          <div key={g.category} className="mt-5">
            <h3 className="flex items-center gap-2 text-base">
              <span className="grid size-7 place-items-center bg-primary-soft text-primary">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {t(`category.${g.category}`)}
            </h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((r) => (
                <li
                  key={r.id}
                  className={`card-surface flex flex-col gap-2 p-4 ${r.available ? "" : "opacity-90"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-snug">{r.title}</p>
                    {r.face_value_cents !== null && (
                      <span className="shrink-0 bg-foreground px-2 py-0.5 text-xs font-bold text-background tnum">
                        {money(r.face_value_cents / 100)}
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  )}
                  {r.funded_by !== "puntr" && r.sponsor && (
                    <p className="text-xs text-muted-foreground">
                      {r.sponsor_url ? (
                        <a
                          href={r.sponsor_url}
                          target="_blank"
                          rel="noreferrer noopener sponsored"
                          className="underline"
                        >
                          {t(
                            r.funded_by === "partner" ? "catalogue.partner" : "catalogue.sponsor",
                            {
                              name: r.sponsor,
                            },
                          )}
                        </a>
                      ) : (
                        t(r.funded_by === "partner" ? "catalogue.partner" : "catalogue.sponsor", {
                          name: r.sponsor,
                        })
                      )}
                    </p>
                  )}
                  {r.funded_by === "puntr" && (
                    <p className="text-xs text-muted-foreground">{t("catalogue.byPuntr")}</p>
                  )}
                  <p className="text-lg font-extrabold tnum">
                    {points(r.points_cost)}{" "}
                    <span className="text-xs font-normal text-muted-foreground">{t("unit")}</span>
                  </p>
                  {r.terms && <p className="text-[11px] text-muted-foreground">{r.terms}</p>}
                  {action(r)}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {bettingVouchers.length > 0 && (
        <div className="mt-5">
          <h3 className="text-base">
            {t("kind.betting_voucher")}{" "}
            <span className="ml-1 border border-border px-1.5 text-xs text-muted-foreground">
              {t("ad")}
            </span>
          </h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {bettingVouchers.map((r) => (
              <li key={r.id} className="card-surface flex flex-col gap-2 p-4">
                <p className="text-sm font-bold">{r.title}</p>
                {r.sponsor && (
                  <p className="text-xs text-muted-foreground">
                    {t("catalogue.sponsor", { name: r.sponsor })}
                  </p>
                )}
                <p className="text-lg font-extrabold tnum">
                  {points(r.points_cost)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{t("unit")}</span>
                </p>
                <RgNotice variant="compact" />
                {action({ ...r, available: true })}
              </li>
            ))}
          </ul>
        </div>
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
      {on && (
        <section className="card-surface mt-5 p-5" aria-labelledby="tipster-support-rewards">
          <h2 id="tipster-support-rewards" className="text-lg">
            {t("tipSupport.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("tipSupport.body")}
          </p>
        </section>
      )}
      {on && profile && <ReferralCard />}
      {status.data.rewards ? (
        <Catalogue
          balance={bal.data ?? 0}
          signedIn={Boolean(profile)}
          onChange={() => setTick((n) => n + 1)}
        />
      ) : (
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
