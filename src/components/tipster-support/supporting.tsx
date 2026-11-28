import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate, formatDateTime, odds, points } from "@/lib/format";
import { selectionLabel } from "@/lib/pick-labels";
import {
  setTipsterSupport,
  tipsterErrorKey,
  type CopiedPick,
  type MyTipsterSupport,
  type SupportRow,
} from "@/lib/tipster-support";

import { TipsterUnlockProgress } from "./unlock-progress";

const RESULT_TONE: Record<string, string> = {
  won: "bg-primary-soft text-primary",
  lost: "bg-destructive/10 text-destructive",
  void: "bg-muted text-muted-foreground",
  push: "bg-muted text-muted-foreground",
  pending: "border border-border text-muted-foreground",
};

/** The supporter's side: who they back, the copied picks feed, limits and spend. */
export function SupportingPanel({
  data,
  onChange,
}: {
  data: MyTipsterSupport;
  onChange: () => void;
}) {
  const { t } = useTranslation("tipster");
  const live = data.supporting.filter((s) => s.status === "active" || s.status === "paused");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section aria-labelledby="copies-title">
        <h2 id="copies-title" className="mb-1 text-lg">
          {t("copies.title")}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">{t("copies.notCounted")}</p>
        {data.copies.length === 0 ? (
          <div className="card-surface p-5 text-sm text-muted-foreground">
            {t("copies.empty")}
            <div className="mt-3">
              <Button asChild size="sm" variant="outline">
                <Link to="/tipster-support" search={{ tab: "discover" }}>
                  {t("supporting.findCta")}
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.copies.map((c) => (
              <CopiedPickCard key={c.prediction_id} pick={c} />
            ))}
          </ul>
        )}
      </section>

      <aside className="space-y-6">
        <section className="card-surface p-5" aria-labelledby="supporting-title">
          <h2 id="supporting-title" className="text-base">
            {t("supporting.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("supporting.limit", { used: live.length, limit: data.limits.support_limit })}
            {!data.is_pro && (
              <>
                {" · "}
                <Link to="/pricing" className="underline">
                  {t("supporting.limitPro", { limit: data.limits.support_limit_pro })}
                </Link>
              </>
            )}
          </p>
          {data.supporting.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("supporting.empty")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {data.supporting.map((s) => (
                <SupportItem key={s.id} row={s} onChange={onChange} />
              ))}
            </ul>
          )}
          <p className="mt-4 text-[11px] text-muted-foreground">
            {t("supporting.spent", {
              spent: points(data.spent_30d),
              cap: points(data.limits.spend_cap),
            })}
          </p>
        </section>
        <TipsterUnlockProgress compact data={data} />
      </aside>
    </div>
  );
}

function SupportItem({ row, onChange }: { row: SupportRow; onChange: () => void }) {
  const { t } = useTranslation("tipster");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = row.status === "active" || row.status === "paused";

  async function toggle(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setTipsterSupport(row.id, on);
      onChange();
    } catch (e) {
      setError(t(tipsterErrorKey(e instanceof Error ? e.message : null)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <UserAvatar username={row.tipster} url={row.avatar_url} alt="" className="size-9 text-xs" />
        <div className="min-w-0 flex-1">
          <Link
            to="/u/$username"
            params={{ username: row.tipster }}
            className="truncate text-sm font-semibold hover:underline"
          >
            @{row.tipster}
          </Link>
          <p className="text-xs text-muted-foreground">
            {t(`card.price.${row.plan}`, { points: points(row.price) })}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 text-[11px] font-semibold ${row.status === "active" ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}
        >
          {t(`supporting.status.${row.status}`)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("supporting.copies", { count: row.copies })}
        {row.period_end && live && (
          <>
            {" · "}
            {row.auto_renew
              ? t("supporting.renews", { date: formatDate(row.period_end) })
              : t("supporting.ends", { date: formatDate(row.period_end) })}
          </>
        )}
      </p>
      {row.status === "paused" && (
        <p className="mt-1 text-xs text-muted-foreground">{t("supporting.pausedReason")}</p>
      )}
      {live && (
        <div className="mt-2 flex gap-2">
          {row.status === "paused" ? (
            <Button size="sm" disabled={busy} onClick={() => void toggle(true)}>
              {t("supporting.resume")}
            </Button>
          ) : row.plan !== "pick" && !row.auto_renew ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(true)}>
              {t("supporting.renewOn")}
            </Button>
          ) : null}
          {(row.plan === "pick" || row.auto_renew) && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void toggle(false)}>
              {row.plan === "pick" ? t("supporting.stop") : t("supporting.stopRenewal")}
            </Button>
          )}
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

function CopiedPickCard({ pick }: { pick: CopiedPick }) {
  const { t } = useTranslation("tipster");
  const { t: tm } = useTranslation("match");
  const result = pick.result ?? "pending";
  const teams = { home: pick.fixture.home, away: pick.fixture.away };
  return (
    <li className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {pick.fixture.competition} · {formatDateTime(pick.fixture.kickoff_at)}
          </p>
          <Link
            to="/match/$fixtureId"
            params={{ fixtureId: pick.fixture.id }}
            className="mt-0.5 block font-semibold hover:underline"
          >
            {pick.fixture.home} vs {pick.fixture.away}
          </Link>
        </div>
        <span className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold ${RESULT_TONE[result]}`}>
          {t(`copies.result.${result}`)}
        </span>
      </div>
      <p className="mt-2 text-sm">
        <span className="text-muted-foreground">{tm(`market.${pick.market}`)}: </span>
        <span className="font-semibold">{selectionLabel(tm, pick, teams)}</span>{" "}
        <span className="tnum text-muted-foreground">
          {t("copies.odds", { odds: odds(pick.odds) })}
        </span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        <Link to="/u/$username" params={{ username: pick.tipster }} className="hover:underline">
          {t("copies.from", { username: pick.tipster })}
        </Link>
      </p>
      {pick.reasoning && <p className="mt-2 text-sm text-muted-foreground">{pick.reasoning}</p>}
      {pick.note && (
        <div className="mt-3 border-l-2 border-primary bg-primary-soft/40 p-3">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Lock className="size-3" aria-hidden="true" />
            {t("copies.note")}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm">{pick.note}</p>
        </div>
      )}
    </li>
  );
}
