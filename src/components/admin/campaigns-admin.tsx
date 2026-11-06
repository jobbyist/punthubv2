import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import { getFoundingSpots } from "@/lib/founding.functions";
import { supabase } from "@/integrations/supabase/client";

const panel = "card-surface p-5";

/** Funnel steps, in order. Each is a first-party analytics event (consented visitors only). */
const STEPS = [
  "landing_viewed",
  "founding_cta_clicked",
  "join_started",
  "otp_verified",
  "signup_completed",
] as const;
type Step = (typeof STEPS)[number];

const PERIODS = ["24h", "48h", "7d", "30d"] as const;
type Period = (typeof PERIODS)[number];
const HOURS: Record<Period, number> = { "24h": 24, "48h": 48, "7d": 168, "30d": 720 };

interface Row {
  key: string;
  source: string;
  campaign: string;
  content: string;
  counts: Record<Step, number>;
}

function pct(n: number, d: number): string {
  if (!d) return "–";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

export function CampaignsTab() {
  const { t } = useTranslation("admin");
  const [period, setPeriod] = useState<Period>("48h");
  const [campaign, setCampaign] = useState("");
  const [applied, setApplied] = useState("");
  const [tick, setTick] = useState(0);

  const { data, failed } = useAsync(async () => {
    const since = new Date(Date.now() - HOURS[period] * 3600_000).toISOString();
    const { data: rows, error } = await supabase.rpc("admin_campaign_report", {
      p_since: since,
      p_campaign: applied.trim() || undefined,
    });
    if (error) throw error;
    return rows ?? [];
  }, [period, applied, tick]);

  const { data: spots } = useAsync(() => getFoundingSpots(), [tick]);

  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    for (const r of data ?? []) {
      if (!(STEPS as readonly string[]).includes(r.event)) continue;
      const key = `${r.utm_source}|${r.utm_campaign}|${r.utm_content}`;
      const row = map.get(key) ?? {
        key,
        source: r.utm_source,
        campaign: r.utm_campaign,
        content: r.utm_content,
        counts: Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>,
      };
      row.counts[r.event as Step] += Number(r.visitors);
      map.set(key, row);
    }
    return [...map.values()].sort(
      (a, b) =>
        b.counts.signup_completed - a.counts.signup_completed ||
        b.counts.landing_viewed - a.counts.landing_viewed,
    );
  }, [data]);

  const totals = useMemo(() => {
    const out = Object.fromEntries(STEPS.map((s) => [s, 0])) as Record<Step, number>;
    for (const r of rows.filter((x) => x.source !== "(direct)"))
      for (const s of STEPS) out[s] += r.counts[s];
    return out;
  }, [rows]);

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("campaigns.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("campaigns.body")}</p>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="flex gap-1" role="group" aria-label={t("campaigns.period")}>
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-2 text-sm font-medium ${
                  period === p
                    ? "bg-ink text-ink-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {t(`campaigns.periods.${p}`)}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setApplied(campaign);
            }}
          >
            <Input
              aria-label={t("campaigns.filter")}
              placeholder={t("campaigns.filter")}
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              className="w-56"
            />
            <Button type="submit" variant="outline">
              {t("campaigns.apply")}
            </Button>
          </form>
          <Button variant="ghost" onClick={() => setTick((n) => n + 1)}>
            {t("campaigns.refresh")}
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label={t("campaigns.kpi.visits")} value={totals.landing_viewed} />
        <Stat label={t("campaigns.kpi.signups")} value={totals.signup_completed} />
        <Stat
          label={t("campaigns.kpi.rate")}
          value={pct(totals.signup_completed, totals.landing_viewed)}
        />
        <Stat
          label={t("campaigns.kpi.founding")}
          value={spots ? `${spots.taken} / ${spots.cap}` : "–"}
        />
      </section>

      <section className={panel}>
        {failed ? (
          <p className="text-sm text-destructive">{t("campaigns.error")}</p>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{t("campaigns.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("campaigns.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 pr-3">{t("campaigns.col.ad")}</th>
                  {STEPS.map((s) => (
                    <th key={s} className="py-1 pr-3 text-right">
                      {t(`campaigns.step.${s}`)}
                    </th>
                  ))}
                  <th className="py-1 text-right">{t("campaigns.col.rate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{r.content}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.source} · {r.campaign}
                      </span>
                    </td>
                    {STEPS.map((s) => (
                      <td key={s} className="py-2 pr-3 text-right tnum">
                        {r.counts[s]}
                      </td>
                    ))}
                    <td className="py-2 text-right font-semibold tnum">
                      {pct(r.counts.signup_completed, r.counts.landing_viewed)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("campaigns.note")}</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tnum">{value}</p>
    </div>
  );
}
