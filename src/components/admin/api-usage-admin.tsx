import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { adminApiUsage } from "@/lib/api-usage.functions";
import { formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";

const INTEGRATIONS = [
  { name: "Parallel API", status: "Primary research provider", purpose: "PFIE fixtures, results, standings and historical research via Search, Extract and Responses; team badge discovery; Newsroom; PUNT AI and synthetic QA.", boundary: "PFIE is configured to use Parallel exclusively." },
  { name: "Gemini API", status: "Integrated · non-PFIE", purpose: "Structured generation for non-PFIE content and odds workflows.", boundary: "Not used by PFIE after the provider migration." },
  { name: "Firecrawl API", status: "Integrated · non-PFIE", purpose: "Web-page scraping for non-PFIE content workflows.", boundary: "Not used by PFIE after the provider migration." },
  { name: "API-Sports", status: "Conditional sports provider", purpose: "Alternative fixtures and results provider when SPORTS_PROVIDER is not set to pfie.", boundary: "PFIE mode takes precedence when explicitly configured." },
  { name: "Supabase", status: "Core infrastructure", purpose: "Postgres database, authentication, object storage, RPCs and realtime application data.", boundary: "Stores PFIE observations, standings, team badges and API audit records." },
  { name: "SofaScore image service", status: "Public source · team badges", purpose: "Supplies team crest images after Parallel Search identifies and validates the matching team page.", boundary: "Images are mirrored into Puntr's Supabase Storage; the app does not embed the third-party image host." },
  { name: "Wikipedia REST API", status: "Public source · fallback badges", purpose: "Retrieves article summary and image metadata after Parallel Search identifies a candidate team article.", boundary: "Used only as a team-badge source fallback; not used for PFIE fixtures, results or standings." },
  { name: "Vercel Cron", status: "Scheduled job runner", purpose: "Triggers PFIE standings/history refreshes, badge resolution, learning ingestion and synthetic workflows.", boundary: "Runs Puntr server routes; it is not a sports-data provider." },
  { name: "Resend", status: "Transactional email", purpose: "Authentication, launch and transactional email delivery.", boundary: "Usage is separately quota-controlled." },
  { name: "PayFast", status: "Payments", purpose: "Payment checkout and Instant Transaction Notification handling.", boundary: "Payment status is confirmed server-side through verified callbacks." },
] as const;

function money(value: number) {
  return "$" + value.toFixed(2);
}
function percent(value: number, cap: number) {
  return cap > 0 ? Math.min(100, (value / cap) * 100) : 0;
}
function Meter({ used, cap }: { used: number; cap: number }) {
  const width = percent(used, cap);
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: width + "%" }} /></div>;
}

export function ApiUsageTab() {
  const [nonce, setNonce] = useState(0);
  const { data, loading, failed } = useAsync(() => adminApiUsage(), [nonce]);
  if (loading && !data) return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-hidden />;
  if (failed || data === null) return <p className="text-sm text-destructive">Could not load API usage. Check admin permissions and the API attribution migration.</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Admin access required.</p>;

  const today = new Map(data.today.map((r) => [r.provider, r]));
  const month = new Map(data.month.map((r) => [r.provider, r]));
  const prices = new Map(data.prices.map((r) => [r.provider, r]));

  return <div className="space-y-5">
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Platform operations</p>
          <h2 className="mt-1 font-display text-xl font-bold">API usage & limits</h2>
          <p className="mt-1 text-sm text-muted-foreground">Quota claims, provider limits, budget allocations and attributable request history. Estimated costs use the configured per-call prices, not provider invoices.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)}>Refresh</Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Updated {formatDateTime(data.generatedAt)}</p>
    </section>

    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Parallel budget allocations</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.budgets.map((budget) => <div key={budget.family} className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{budget.family}</p>
          <p className="mt-1 text-xl font-bold tnum">{money(budget.spentUsd)} <span className="text-xs font-normal text-muted-foreground">/ {money(budget.monthlyUsd)}</span></p>
          <Meter used={budget.spentUsd} cap={budget.monthlyUsd} />
          <p className="mt-2 text-xs text-muted-foreground">{budget.note}</p>
        </div>)}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Cumulative allowance</th><th>Window</th><th>Cap</th><th>Allocation notes</th></tr></thead>
          <tbody className="divide-y divide-border">{data.spendLimits.map((limit) => <tr key={limit.family}>
            <td className="py-2 font-semibold">{limit.family}</td><td>{limit.periodStart} – {limit.periodEnd}</td><td className="tnum">{money(limit.limitUsd)}</td><td className="text-xs text-muted-foreground">{limit.note}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>

    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Provider quota limits</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Provider / endpoint</th><th>Today</th><th>Daily cap</th><th>Month to date</th><th>Monthly cap</th><th>Unit price</th></tr></thead>
          <tbody className="divide-y divide-border">{data.limits.map((limit) => {
            const d = today.get(limit.provider) ?? { calls: 0, errors: 0, refused: 0 };
            const m = month.get(limit.provider) ?? { calls: 0, errors: 0, refused: 0 };
            const price = prices.get(limit.provider)?.usdPerUnit;
            return <tr key={limit.provider}>
              <td className="py-2 pr-3"><p className="font-semibold">{limit.provider}</p><p className="max-w-64 text-[11px] text-muted-foreground">{limit.note}</p></td>
              <td className="tnum">{d.calls} <span className="text-[10px] text-muted-foreground">({d.errors} err · {d.refused} refused)</span><Meter used={d.calls} cap={limit.dailyCap} /></td>
              <td className="tnum">{limit.dailyCap.toLocaleString()}</td>
              <td className="tnum">{m.calls.toLocaleString()}</td><td className="tnum">{limit.monthlyCap.toLocaleString()}</td>
              <td className="tnum">{price === undefined ? "—" : money(price)}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </section>

    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Usage attribution · last 7 days</h3>
      <p className="mt-1 text-xs text-muted-foreground">Feature-level calls are read from the quota-claim ledger. Historical rows marked unattributed remain explicitly unassigned; they are not guessed or backfilled to a consumer.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Provider</th><th>Consumer / feature</th><th>Calls</th><th>Estimated spend</th><th>Last call</th></tr></thead>
          <tbody className="divide-y divide-border">{data.last7Days.map((row) => <tr key={row.provider + row.feature}>
            <td className="py-2 font-semibold">{row.provider}</td><td>{row.feature}</td><td className="tnum">{row.calls}</td><td className="tnum">{money(row.estimatedUsd)}</td><td className="text-xs text-muted-foreground">{formatDateTime(row.lastCall)}</td>
          </tr>)}</tbody>
        </table>
        {data.last7Days.length === 0 && <p className="py-4 text-sm text-muted-foreground">No usage events recorded in the last seven days.</p>}
      </div>
    </section>

    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Recent API audit history</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Time</th><th>Provider</th><th>Consumer</th><th>Operation</th><th>Status</th><th>Est. cost</th></tr></thead>
          <tbody className="divide-y divide-border">{data.events.map((event) => <tr key={event.id}>
            <td className="py-2 text-xs text-muted-foreground">{formatDateTime(event.claimedAt)}</td><td className="font-semibold">{event.provider}</td><td>{event.consumer ?? "unattributed"}</td><td>{event.operation ?? event.feature}</td><td>{event.status}</td><td className="tnum">{event.estimatedUsd === null ? "—" : money(event.estimatedUsd)}</td>
          </tr>)}</tbody>
        </table>
        {data.events.length === 0 && <p className="py-4 text-sm text-muted-foreground">No audit events recorded.</p>}
      </div>
    </section>

    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Integrated APIs & application responsibilities</h3>
      <div className="mt-3 divide-y divide-border">
        {INTEGRATIONS.map((api) => <div key={api.name} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{api.name}</p><span className="text-xs text-muted-foreground">{api.status}</span></div>
          <p className="mt-1 text-sm">{api.purpose}</p>
          <p className="mt-1 text-xs text-muted-foreground">{api.boundary}</p>
        </div>)}
      </div>
    </section>
  </div>;
}
