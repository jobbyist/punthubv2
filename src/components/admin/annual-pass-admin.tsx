import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import {
  adminAnnualPassOverview,
  adminLinkBankTransfer,
  adminRecordBankTransfer,
  adminVoidBankTransfer,
  type OfflinePaymentRow,
} from "@/lib/annual-pass-admin.functions";
import { formatDate, formatDateTime, money } from "@/lib/format";

const panel = "card-surface p-5";
const CAP = 20;

/** Founding Annual Pass: counter, PayFast holds/payments and bank transfers recorded by hand. */
export function AnnualPassTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, failed, loading } = useAsync(() => adminAnnualPassOverview(), [tick]);
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState("");
  const [busy, setBusy] = useState(false);

  async function record() {
    setBusy(true);
    try {
      const amountRand = amount.trim() ? Number(amount) : null;
      const res = await adminRecordBankTransfer({
        data: { payerLabel: payer, amountRand, bankReference: reference, paidOn },
      });
      if (res.ok) {
        toast.success(t("pass.recorded"));
        setPayer("");
        setAmount("");
        setReference("");
        setPaidOn("");
        setTick((n) => n + 1);
      } else toast.error(res.message ?? t("pass.error"));
    } catch {
      toast.error(t("pass.error"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <p className="text-sm text-muted-foreground">{t("pass.loading")}</p>;
  if (failed || !data) return <p className="text-sm text-muted-foreground">{t("pass.error")}</p>;

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("pass.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("pass.body")}</p>
        <p className="mt-4 font-display text-3xl font-extrabold">
          {t("pass.remaining", { remaining: data.remaining, cap: CAP })}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.open ? t("pass.open") : t("pass.closed")}
        </p>
      </section>

      <section className={panel}>
        <h2 className="text-lg">{t("pass.recordTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("pass.recordBody")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            placeholder={t("pass.payer")}
            value={payer}
            maxLength={120}
            onChange={(e) => setPayer(e.target.value)}
          />
          <Input
            placeholder={t("pass.amount")}
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          />
          <Input
            placeholder={t("pass.reference")}
            value={reference}
            maxLength={120}
            onChange={(e) => setReference(e.target.value)}
          />
          <Input
            type="date"
            aria-label={t("pass.paidOn")}
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </div>
        <Button
          className="mt-4"
          disabled={busy || payer.trim().length < 2 || data.remaining === 0}
          onClick={() => void record()}
        >
          {t("pass.recordButton")}
        </Button>
      </section>

      <section className={panel}>
        <h2 className="text-lg">{t("pass.transfersTitle")}</h2>
        {data.offline.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("pass.none")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {data.offline.map((row) => (
              <TransferRow key={row.id} row={row} onChange={() => setTick((n) => n + 1)} />
            ))}
          </ul>
        )}
      </section>

      <section className={panel}>
        <h2 className="text-lg">{t("pass.claimsTitle")}</h2>
        {data.claims.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("pass.none")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.claims.map((c, i) => {
              const held =
                c.status === "pending" && c.holdExpiresAt && new Date(c.holdExpiresAt) > new Date();
              const state =
                c.status === "paid" ? t("pass.paid") : held ? t("pass.held") : t("pass.lapsed");
              return (
                <li
                  key={`${c.username}-${i}`}
                  className="flex flex-wrap justify-between gap-2 py-2"
                >
                  <span className="font-semibold">@{c.username ?? "?"}</span>
                  <span>{state}</span>
                  <span className="text-muted-foreground">
                    {c.paidAt
                      ? formatDateTime(c.paidAt)
                      : c.holdExpiresAt
                        ? t("pass.holdUntil", { when: formatDateTime(c.holdExpiresAt) })
                        : formatDateTime(c.claimedAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TransferRow({ row, onChange }: { row: OfflinePaymentRow; onChange: () => void }) {
  const { t } = useTranslation("admin");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  async function link() {
    setBusy(true);
    try {
      const res = await adminLinkBankTransfer({ data: { paymentId: row.id, username } });
      if (res.ok) {
        toast.success(t("pass.linked"));
        onChange();
      } else toast.error(res.message ?? t("pass.error"));
    } finally {
      setBusy(false);
    }
  }
  async function voidRow() {
    if (!window.confirm(t("pass.voidConfirm"))) return;
    setBusy(true);
    try {
      const res = await adminVoidBankTransfer({ data: { paymentId: row.id } });
      if (res.ok) onChange();
      else toast.error(res.message ?? t("pass.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="space-y-2 py-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="font-semibold">{row.payerLabel}</span>
        <span className="text-muted-foreground">
          {formatDate(row.paidOn)}
          {row.amountCents !== null ? ` · ${money(row.amountCents / 100)}` : ""}
          {row.bankReference ? ` · ${row.bankReference}` : ""}
        </span>
      </div>
      {row.username ? (
        <p className="text-primary">{t("pass.linkedTo", { username: row.username })}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Input
            className="max-w-[220px]"
            placeholder={t("pass.username")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || username.trim().length < 2}
            onClick={() => void link()}
          >
            {t("pass.link")}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void voidRow()}>
            {t("pass.void")}
          </Button>
        </div>
      )}
    </li>
  );
}
