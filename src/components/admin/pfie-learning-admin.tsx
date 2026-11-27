import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { adminPfieLearning, approvePfieLearningExample } from "@/lib/admin-pfie-learning.functions";
import { formatDateTime } from "@/lib/format";

const panel = "card-surface p-5";
function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl font-bold tnum">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

export function PfieLearningTab() {
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const query = useAsync(() => adminPfieLearning(), [nonce]);
  const data = query.data;
  const approve = async (id: string) => {
    setBusy(id);
    try {
      await approvePfieLearningExample({ data: { id } });
      toast.success("Verified example approved for the PFIE training dataset.");
      setNonce(n => n + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify this example.");
    } finally { setBusy(null); }
  };

  if (query.loading) return <div className="h-40 animate-pulse rounded-xl bg-muted" aria-hidden />;
  if (query.failed || data === null) return <p className="text-sm text-destructive">Could not load PFIE learning data. Check admin authorization and migration status.</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Admin access required.</p>;

  return <div className="space-y-5">
    <section className={panel}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">PFIE / PUNT AI · learning pipeline</p>
      <h2 className="mt-1 font-display text-xl font-bold">Learning corpus & training readiness</h2>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Real, consented member activity is the primary PFIE learning source. Published pick actions and feature interactions become pseudonymous preference signals. Synthetic QA is secondary and diagnoses operational quality. Forecast research stays quarantined until independent PFIE observations verify the final score; synthetic predictions are never their own ground truth.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Ingest runs" value={data.runs} detail="Scheduled corpus syncs" />
        <Metric label="Total examples" value={data.total} detail="Across current and future experiments" />
        <Metric label="Approved" value={data.approved} detail="Verified and dataset-eligible" />
        <Metric label="Quarantined" value={data.quarantined} detail="Awaiting independent verification" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Real member activity" value={data.realActivity} detail="Primary, consented learning source" />
        <Metric label="Synthetic QA" value={data.syntheticExamples} detail="Secondary diagnostics and evaluation" />
        <Metric label="Route QA" value={data.routeQuality} detail="Deterministic labels approved" />
        <Metric label="Forecast pending" value={data.forecastPending} detail="Needs two independent PFIE sources" />
        <Metric label="Excluded" value={data.excluded} detail="Non-training session types" />
      </div>
      <Button className="mt-4" size="sm" variant="outline" onClick={() => setNonce(n => n + 1)}>Refresh learning data</Button>
    </section>
    <section className={panel}>
      <h3 className="font-display text-lg font-bold">Recent learning examples</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Task</th><th>Source</th><th>Fixture</th><th>Training status</th><th>Label</th><th>Captured</th><th>Review</th></tr></thead>
          <tbody className="divide-y divide-border">{data.recent.map(row => <tr key={row.id}>
            <td className="py-2 pr-2">{row.taskType}</td><td>{row.sourceKind}</td><td className="font-mono text-xs">{row.fixtureKey ?? "—"}</td>
            <td><span className={row.status === "approved" ? "text-primary" : row.status === "quarantined" ? "text-amber-600" : "text-muted-foreground"}>{row.status}</span></td>
            <td>{row.labelStatus}</td><td className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</td>
            <td>{row.taskType === "forecast_evaluation" && row.status === "quarantined" && row.labelStatus === "pending_verification"
              ? <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void approve(row.id)}>{busy === row.id ? "Checking…" : "Verify with PFIE"}</Button>
              : "—"}</td>
          </tr>)}</tbody>
        </table>
        {data.recent.length === 0 && <p className="py-4 text-sm text-muted-foreground">No examples ingested yet. The scheduled PFIE learning job will populate this panel after synthetic QA runs.</p>}
      </div>
    </section>
    <p className="text-xs text-muted-foreground">The approved dataset is exposed only to the service role through public.pfie_training_dataset. Forecast approval requires at least two distinct official/trusted PFIE source domains. This pipeline creates supervised data and evaluation corpora; it does not silently fine-tune or replace a language model.</p>
  </div>;
}
