import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { RequireMember } from "@/components/account-gate";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LaunchGate } from "@/components/launch-gate";
import { RgNotice } from "@/components/rg-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import {
  fetchWallet,
  fetchWalletHistory,
  sendableNow,
  sendPoints,
  type Wallet,
} from "@/lib/wallet";

export const Route = createFileRoute("/wallet")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "wallet");
    return { meta: [{ title: t("meta.title") }, { name: "robots", content: "noindex, nofollow" }] };
  },
  component: WalletPage,
});

function WalletPage() {
  const { t } = useTranslation("wallet");
  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      <RequireMember>
        {() => (
          <LaunchGate feature={t("title")}>
            <WalletBody />
          </LaunchGate>
        )}
      </RequireMember>
      <div className="mt-8">
        <RgNotice />
      </div>
    </AppShell>
  );
}

function WalletBody() {
  const { t } = useTranslation("wallet");
  const [nonce, setNonce] = useState(0);
  const wallet = useAsync(() => fetchWallet(), [nonce]);
  const history = useAsync(() => fetchWalletHistory(50), [nonce]);
  const w = wallet.data;
  const refresh = () => setNonce((n) => n + 1);

  if (wallet.loading && !w)
    return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />;
  if (wallet.failed || !w) return <p className="text-sm text-destructive">{t("error")}</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("points.label")}
          </p>
          <p className="mt-1 font-display text-4xl font-bold tnum">
            {w.points.toLocaleString("en-ZA")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("points.transferable", { count: w.pointsTransferable })}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{t("points.note")}</p>
        </section>
        <section className="card-surface p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("credits.label")}
          </p>
          <p className="mt-1 font-display text-4xl font-bold tnum">
            {w.credits.toLocaleString("en-ZA")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`credits.plan.${w.accountType}`, { defaultValue: w.accountType })}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{t("credits.note")}</p>
          <Button className="mt-3" size="sm" variant="outline" disabled>
            {t("credits.buy")}
          </Button>
        </section>
      </div>

      <SendForm wallet={w} onSent={refresh} />

      {w.prices.length > 0 && (
        <section className="card-surface p-5">
          <h2 className="font-display text-lg font-bold">{t("prices.title")}</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {w.prices.map((p) => (
              <li key={p.feature} className="flex justify-between gap-3 py-2">
                <span>{p.title}</span>
                <span className="font-semibold tnum">
                  {t("prices.credits", { count: p.credits })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("prices.note")}</p>
        </section>
      )}

      <section className="card-surface p-5">
        <h2 className="font-display text-lg font-bold">{t("history.title")}</h2>
        {history.loading ? (
          <div className="mt-3 h-24 animate-pulse rounded-lg bg-muted" aria-hidden />
        ) : (history.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("history.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {(history.data ?? []).map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2"
              >
                <span>
                  <span className="font-medium">{e.description}</span>{" "}
                  <span className="text-xs text-muted-foreground">{formatDateTime(e.at)}</span>
                </span>
                <span
                  className={`font-semibold tnum ${e.amount < 0 ? "text-destructive" : "text-primary"}`}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount} {t(`history.unit.${e.currency}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SendForm({ wallet: w, onSent }: { wallet: Wallet; onSent: () => void }) {
  const { t } = useTranslation("wallet");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const max = sendableNow(w);
  const points = Number(amount);
  const valid =
    to.trim().length >= 3 && Number.isInteger(points) && points >= w.limits.min && points <= max;

  async function send() {
    setBusy(true);
    try {
      const r = await sendPoints(to, points, note);
      if (!r.ok) {
        toast.error(t(`send.errors.${r.error}`));
        return;
      }
      toast.success(t("send.done", { count: points, to: to.replace(/^@/, "") }));
      setTo("");
      setAmount("");
      setNote("");
      setConfirm(false);
      onSent();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface p-5">
      <h2 className="font-display text-lg font-bold">{t("send.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("send.limits", {
          min: w.limits.min,
          max: w.limits.max,
          daily: w.limits.daily,
          monthly: w.limits.monthly,
          days: w.limits.minAccountDays,
          hold: w.limits.holdDays,
        })}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem]">
        <Input
          placeholder={t("send.to")}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setConfirm(false);
          }}
          aria-label={t("send.to")}
        />
        <Input
          inputMode="numeric"
          placeholder={t("send.amount")}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value.replace(/\D/g, ""));
            setConfirm(false);
          }}
          aria-label={t("send.amount")}
        />
      </div>
      <Input
        className="mt-2"
        placeholder={t("send.note")}
        maxLength={140}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label={t("send.note")}
      />
      <p className="mt-2 text-xs text-muted-foreground">{t("send.max", { count: max })}</p>
      {!confirm ? (
        <Button className="mt-3" disabled={!valid || busy} onClick={() => setConfirm(true)}>
          {t("send.review")}
        </Button>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <p>{t("send.confirm", { count: points, to: to.trim().replace(/^@/, "") })}</p>
          <div className="mt-2 flex gap-2">
            <Button disabled={busy} onClick={() => void send()}>
              {t("send.confirmButton")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setConfirm(false)}>
              {t("send.cancel")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
