import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { adminSyntheticExperiment } from "@/lib/admin-synthetic.functions";
import { formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";
const money = (value: number) => `$${value.toFixed(3)}`;
const stamp = (value: string | null) => value ? formatDateTime(value) : "—";

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="min-w-0"><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold tnum">{value}</p>{detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}</div>;
}

export function SyntheticExperimentTab() {
  const [nonce, setNonce] = useState(0);
  const query = useAsync(() => adminSyntheticExperiment(), [nonce]);
  const data = query.data;

  if (query.loading) return <div className="h-48 animate-pulse rounded-xl bg-muted" aria-hidden />;
  if (query.failed || data === null) return <p className="text-sm text-destructive">Could not load synthetic experiment telemetry. Admin authorization or database access failed.</p>;
  if (!data?.configured || !data.experiment) return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">Synthetic QA experiment</h2>
      <p className="mt-2 text-sm text-muted-foreground">Telemetry tables are not available yet. Apply the synthetic experiment migration and seed the 50 persona profiles to enable monitoring.</p>
      <Button className="mt-4" size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)}>Refresh</Button>
    </section>
  );

  const e = data.experiment;
  const budgetRemaining = Math.max(0, e.budgetCapUsd - e.spentUsd - e.reservedUsd);
  const latestFailures = data.sessions.recent.filter((s) => s.outcome === "failed").length;


  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Internal operations / synthetic QA</p><h2 className="mt-1 font-display text-xl font-bold">{e.label}</h2><p className="mt-1 text-xs text-muted-foreground">{stamp(e.startsAt)} – {stamp(e.endsAt)} · Updated {stamp(e.updatedAt)}</p></div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${e.status === "active" ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"}`}>{e.status}</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Personas" value={`${data.personas.active}/${data.personas.total}`} detail="Active synthetic profiles" />
          <Metric label="Route-check sessions" value={data.sessions.total} detail={`${latestFailures} failures in latest 30`} />
          <Metric label="Research batches" value={data.research.total} detail={`${data.research.recent.length} recent batches loaded`} />
          <Metric label="Budget remaining" value={money(budgetRemaining)} detail={`${money(e.spentUsd)} spent · ${money(e.reservedUsd)} reserved · ${money(e.budgetCapUsd)} cap`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)}>Refresh telemetry</Button><span className="self-center text-xs text-muted-foreground">Latest route check: {stamp(data.personas.lastRunAt)} · Latest forecast: {stamp(data.personas.lastDecisionAt)}</span></div>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Founding campaign / AI community participants</p>
            <h3 className="mt-1 font-display text-lg font-bold">{data.founding.taken}/{data.founding.cap} places counted</h3>
            <p className="mt-1 text-sm text-muted-foreground">{data.founding.aiMembers}/50 AI accounts linked to member profiles. Each account has its own founding number and a visible AI participant label.</p>
          </div>
          <Link to="/admin/founding-hq" className="text-xs font-semibold text-primary hover:underline">Manage in Founding HQ</Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">AI activity is excluded from genuine-member acquisition and PFIE human-learning metrics. All AI profiles, forum posts and H2H leaderboard entries are disclosed as AI participants.</p>
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-lg font-bold">Budget ledger</h3><p className="text-xs text-muted-foreground">Last {data.budget.recent.length} reservations</p></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3"><Metric label="Settled" value={data.budget.settled} /><Metric label="Reserved" value={data.budget.reserved} /><Metric label="Failed" value={data.budget.failed} /></div>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Operation</th><th>Estimated</th><th>Settled</th><th>Status</th><th>Created</th></tr></thead><tbody className="divide-y divide-border">{data.budget.recent.map((r, i) => <tr key={`${r.createdAt}-${i}`}><td className="py-2 pr-2">{r.operation}</td><td>{money(r.estimatedUsd)}</td><td>{r.settledUsd === null ? "—" : money(r.settledUsd)}</td><td>{r.status}</td><td className="text-xs text-muted-foreground">{stamp(r.createdAt)}</td></tr>)}</tbody></table>{data.budget.recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">No provider requests recorded.</p>}</div>
      </section>

      <section className={panel}>
        <h3 className="font-display text-lg font-bold">Public-route QA activity</h3>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[38rem] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Persona</th><th>Type</th><th>Outcome</th><th>Pages visited</th><th>Started</th></tr></thead><tbody className="divide-y divide-border">{data.sessions.recent.map((s) => <tr key={s.id}><td className="py-2 pr-2 font-mono text-xs">{s.personaKey}</td><td>{s.type}</td><td className={s.outcome === "failed" ? "text-destructive" : ""}>{s.outcome}{s.error ? <p className="max-w-xs break-words text-xs text-destructive">{s.error}</p> : null}</td><td className="max-w-xs break-words text-xs">{s.paths.join(" → ") || "—"}</td><td className="text-xs text-muted-foreground">{stamp(s.startedAt)}</td></tr>)}</tbody></table>{data.sessions.recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">No route-check sessions recorded.</p>}</div>
      </section>

      <section className={panel}>
        <h3 className="font-display text-lg font-bold">Forecast research</h3>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[32rem] text-sm"><thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Fixture key</th><th>Decisions</th><th>No-pick</th><th>Sources</th><th>Created</th></tr></thead><tbody className="divide-y divide-border">{data.research.recent.map((r) => <tr key={`${r.fixtureKey}-${r.createdAt}`}><td className="py-2 pr-2 font-mono text-xs">{r.fixtureKey}</td><td>{r.decisionCount}</td><td>{r.noPickCount}</td><td>{r.sourceCount}</td><td className="text-xs text-muted-foreground">{stamp(r.createdAt)}</td></tr>)}</tbody></table>{data.research.recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">No research batches recorded.</p>}</div>
      </section>
      <p className="text-xs text-muted-foreground">Synthetic route checks and research are recorded only in the isolated QA tables. The synthetic cookie also blocks analytics delivery, even if analytics consent is present. Member analytics, public picks and founding-member conversion metrics are not used for QA. This panel is read-only; pause or activation controls remain in the deployment/operations runbook.</p>
    </div>
  );
}
