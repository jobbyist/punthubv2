import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import {
  adminActionLog,
  adminAnalytics,
  adminSystemHealth,
  adminUpdateQuota,
  adminUpdateScoring,
  adminUpdateSetting,
  type Json,
  type JsonObject,
} from "@/lib/admin-platform.functions";
import { formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";

function Light({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2.5 rounded-full ${ok ? "bg-primary" : "bg-destructive"}`}
    />
  );
}

/** /admin > System: health, API quotas, launch and transfer settings, scoring rules. */
export function SystemTab() {
  const { t } = useTranslation("admin");
  const [nonce, setNonce] = useState(0);
  const health = useAsync(() => adminSystemHealth(), [nonce]);
  const h = health.data;
  const refresh = () => setNonce((n) => n + 1);

  if (health.loading) return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />;
  if (health.failed || !h) return <p className="text-sm text-destructive">{t("system.error")}</p>;
  const lastPfie = h.pfie[0];

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("system.status")}</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(h.keys).map(([k, v]) => (
            <li key={k} className="flex items-center gap-2">
              <Light ok={v} /> <span className="font-mono text-xs">{k}</span>
              <span className="text-muted-foreground">
                {v ? t("system.set") : t("system.missing")}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <Light ok={h.sportsProvider === "pfie"} />{" "}
            {t("system.sportsProvider", { name: h.sportsProvider })}
          </li>
          <li className="flex items-center gap-2">
            <Light ok={h.fixtures.upcoming > 0} /> {t("system.fixtures", h.fixtures)}
          </li>
          <li className="flex items-center gap-2">
            <Light ok={!lastPfie || lastPfie.ok} />
            {lastPfie
              ? t("system.lastPfie", {
                  when: formatDateTime(lastPfie.startedAt),
                  competition: lastPfie.competition,
                  kind: lastPfie.kind,
                })
              : t("system.noPfie")}
          </li>
          <li className="flex items-center gap-2">
            <Light ok={h.outbox.failed === 0} /> {t("system.outbox", h.outbox)}
          </li>
          <li className="flex items-center gap-2">
            <Light ok={h.content.enabled} />
            {t("system.content", {
              state: h.content.enabled ? t("system.on") : t("system.off"),
              auto: h.content.autoPublish ? t("system.on") : t("system.off"),
            })}
          </li>
        </ul>
        <Button size="sm" variant="outline" className="mt-4" onClick={refresh}>
          {t("system.refresh")}
        </Button>
      </section>

      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("system.quotas")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("system.quotasBody")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2 pr-2">{t("system.q.service")}</th>
                <th className="py-2 pr-2 text-right">{t("system.q.today")}</th>
                <th className="py-2 pr-2 text-right">{t("system.q.month")}</th>
                <th className="py-2 pr-2 text-right">{t("system.q.refused")}</th>
                <th className="py-2">{t("system.q.caps")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {h.quotas.map((q) => (
                <QuotaRow key={q.provider} q={q} onSaved={refresh} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Settings settings={h.settings} onSaved={refresh} />

      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("system.scoring")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("system.scoringBody")}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {h.scoring.map((s) => (
            <ScoringRow key={s.market} market={s.market} points={s.points} onSaved={refresh} />
          ))}
        </ul>
      </section>

      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("system.pfieRuns")}</h2>
        {h.pfie.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("system.noPfie")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {h.pfie.map((r) => (
              <li
                key={`${r.competition}-${r.startedAt}`}
                className="flex flex-wrap items-center gap-2 py-2"
              >
                <Light ok={r.ok} />
                <span className="font-medium">{r.competition.toUpperCase()}</span>
                <span className="text-muted-foreground">{r.kind}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(r.startedAt)}</span>
                <span className="ml-auto text-xs">
                  {r.ok ? (
                    t("system.pfieCounts", r)
                  ) : (
                    <span className="text-destructive">{r.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuotaRow({
  q,
  onSaved,
}: {
  q: {
    provider: string;
    dailyCap: number;
    monthlyCap: number;
    today: number;
    month: number;
    refusedToday: number;
  };
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [daily, setDaily] = useState(String(q.dailyCap));
  const [monthly, setMonthly] = useState(String(q.monthlyCap));
  const near = q.today >= q.dailyCap * 0.8 || q.month >= q.monthlyCap * 0.8;
  async function save() {
    try {
      const r = await adminUpdateQuota({
        data: { provider: q.provider, dailyCap: Number(daily), monthlyCap: Number(monthly) },
      });
      if (!r.ok) throw new Error();
      toast.success(t("system.saved"));
      onSaved();
    } catch {
      toast.error(t("system.saveError"));
    }
  }
  return (
    <tr className={near ? "bg-[oklch(0.97_0.04_85)]" : undefined}>
      <td className="py-2 pr-2 font-mono text-xs">{q.provider}</td>
      <td className="py-2 pr-2 text-right tnum">
        {q.today}/{q.dailyCap}
      </td>
      <td className="py-2 pr-2 text-right tnum">
        {q.month}/{q.monthlyCap}
      </td>
      <td className="py-2 pr-2 text-right tnum">{q.refusedToday}</td>
      <td className="py-2">
        <span className="flex items-center gap-1">
          <Input
            className="h-8 w-16"
            inputMode="numeric"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            aria-label={t("system.q.daily")}
          />
          <Input
            className="h-8 w-20"
            inputMode="numeric"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            aria-label={t("system.q.monthly")}
          />
          <Button size="sm" variant="outline" onClick={() => void save()}>
            {t("system.save")}
          </Button>
        </span>
      </td>
    </tr>
  );
}

const SETTINGS = [
  "launch_at",
  "transfer_enabled",
  "transfer_min_points",
  "transfer_max_points",
  "transfer_daily_cap",
  "transfer_monthly_cap",
  "transfer_min_account_days",
  "transfer_hold_days",
  "duels_enabled",
  "duels_stakes_enabled",
  "duel_stake_min",
  "duel_stake_max",
  "duel_daily_stake_cap",
  "duel_open_limit",
  "duel_pair_weekly_limit",
] as const;

function Settings({
  settings,
  onSaved,
}: {
  settings: Record<string, string>;
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [values, setValues] = useState<Record<string, string>>(settings);
  async function save(key: string) {
    try {
      const r = await adminUpdateSetting({ data: { key, value: values[key] ?? "" } });
      if (!r.ok) throw new Error();
      toast.success(t("system.saved"));
      onSaved();
    } catch {
      toast.error(t("system.saveError"));
    }
  }
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("system.settings")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("system.settingsBody")}</p>
      <ul className="mt-3 space-y-2">
        {SETTINGS.map((k) => (
          <li key={k} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="w-56 text-muted-foreground">{t(`system.s.${k}`)}</span>
            <Input
              className="h-8 w-56"
              value={values[k] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={(values[k] ?? "") === (settings[k] ?? "")}
              onClick={() => void save(k)}
            >
              {t("system.save")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoringRow({
  market,
  points,
  onSaved,
}: {
  market: string;
  points: number;
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [value, setValue] = useState(String(points));
  async function save() {
    try {
      const r = await adminUpdateScoring({ data: { market, points: Number(value) } });
      if (!r.ok) throw new Error();
      toast.success(t("system.saved"));
      onSaved();
    } catch {
      toast.error(t("system.saveError"));
    }
  }
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className="w-40">{t(`system.market.${market}`)}</span>
      <Input
        className="h-8 w-16"
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        disabled={value === String(points)}
        onClick={() => void save()}
      >
        {t("system.save")}
      </Button>
    </li>
  );
}

/** /admin > Log: every admin action, newest first. */
export function ActionLogTab() {
  const { t } = useTranslation("admin");
  const [filter, setFilter] = useState("");
  const log = useAsync(() => adminActionLog({ data: { action: filter } }), [filter]);
  const groups = ["", "member.", "settings.", "quota.", "scoring.", "newsroom.", "wallet."];
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("log.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("log.body")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g || "all"}
            onClick={() => setFilter(g)}
            aria-pressed={filter === g}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === g ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"}`}
          >
            {g ? g.replace(".", "") : t("log.all")}
          </button>
        ))}
      </div>
      {log.loading ? (
        <div className="mt-4 h-32 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : (log.data ?? []).length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("log.empty")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-border text-sm">
          {(log.data ?? []).map((a) => (
            <li key={a.id} className="py-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-xs font-semibold">{a.action}</span>
                {a.target && <span className="font-medium">{a.target}</span>}
                <span className="text-xs text-muted-foreground">@{a.admin ?? "?"}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDateTime(a.createdAt)}
                </span>
              </div>
              {Object.keys(a.detail).length > 0 && (
                <p className="mt-1 break-words font-mono text-[11px] text-muted-foreground">
                  {JSON.stringify(a.detail)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const num = (v: Json | undefined) => (typeof v === "number" ? v : Number(v ?? 0));
const list = (v: Json | undefined) => (Array.isArray(v) ? (v as JsonObject[]) : []);

/** /admin > Analytics: members, activity and the first-party events members agreed to. */
export function AnalyticsTab() {
  const { t } = useTranslation("admin");
  const [days, setDays] = useState(30);
  const data = useAsync(() => adminAnalytics({ data: { days } }), [days]);
  const a = data.data;
  const totals = (a?.["totals"] as JsonObject | undefined) ?? {};
  const daily = list(a?.["daily"]);
  const max = Math.max(1, ...daily.map((d) => num(d["visitors"])));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            aria-pressed={days === d}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${days === d ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"}`}
          >
            {t("analytics.days", { count: d })}
          </button>
        ))}
      </div>
      {data.loading ? (
        <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />
      ) : data.failed || !a ? (
        <p className="text-sm text-destructive">{t("analytics.error")}</p>
      ) : (
        <>
          <section className={`${panel} grid gap-4 sm:grid-cols-3`}>
            {Object.entries(totals).map(([k, v]) => (
              <div key={k}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t(`analytics.t.${k}`)}
                </p>
                <p className="mt-1 font-display text-2xl font-bold tnum">{num(v)}</p>
              </div>
            ))}
          </section>
          <section className={panel}>
            <h2 className="font-display text-lg font-bold">{t("analytics.daily")}</h2>
            <div
              className="mt-4 flex h-32 items-end gap-[2px]"
              role="img"
              aria-label={t("analytics.dailyLabel")}
            >
              {daily.map((d) => (
                <div
                  key={String(d["day"])}
                  className="flex-1 bg-primary/80"
                  style={{ height: `${(num(d["visitors"]) / max) * 100}%` }}
                  title={`${String(d["day"])}: ${num(d["visitors"])} / ${num(d["signups"])}`}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("analytics.dailyNote")}</p>
          </section>
          <div className="grid gap-5 sm:grid-cols-2">
            <Ranked
              title={t("analytics.events")}
              rows={list(a["events"]).map((e) => [String(e["event"]), num(e["count"])])}
            />
            <Ranked
              title={t("analytics.paths")}
              rows={list(a["paths"]).map((e) => [String(e["path"]), num(e["count"])])}
            />
            <Ranked
              title={t("analytics.sources")}
              rows={list(a["sources"]).map((e) => [String(e["source"]), num(e["count"])])}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("analytics.consent")}</p>
        </>
      )}
    </div>
  );
}

function Ranked({ title, rows }: { title: string; rows: [string, number][] }) {
  const { t } = useTranslation("admin");
  return (
    <section className={panel}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t("analytics.none")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-border text-sm">
          {rows.map(([k, v]) => (
            <li key={k} className="flex justify-between gap-3 py-1.5">
              <span className="truncate font-mono text-xs">{k}</span>
              <span className="tnum font-semibold">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
