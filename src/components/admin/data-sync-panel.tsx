import { useEffect, useState } from "react";

import { formatDate, formatTime } from "@/lib/format";
import { fetchSyncStatuses, isStale, type SyncStatus } from "@/lib/standings-data";
import { cn } from "@/lib/utils";

/** Admin: standings and history sync health (last success, failures, last error). Admin text stays English. */
export function DataSyncPanel() {
  const [rows, setRows] = useState<SyncStatus[] | null>(null);
  useEffect(() => {
    fetchSyncStatuses()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  const when = (iso: string | null) => (iso ? `${formatDate(iso)} ${formatTime(iso)}` : "never");
  return (
    <section className="card-surface mt-6 p-4">
      <h2 className="font-display text-lg font-bold">Data sync (standings and form history)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Runs every 10 minutes 04:10-05:50 SAST, two jobs per run. Failures retry after 20 and 40
        minutes, then wait for the next day. Manual run:{" "}
        <code>/api/cron/sync-tables?only=epl&amp;job=standings</code>.
      </p>
      {rows === null ? (
        <div className="mt-3 h-24 animate-pulse rounded bg-muted" />
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No sync has run yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2">Job</th>
                <th className="py-1 pr-2">Scope</th>
                <th className="py-1 pr-2">Last success</th>
                <th className="py-1 pr-2">Failures</th>
                <th className="py-1 pr-2">Last error / detail</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.job}-${r.scope}`} className="border-t border-border align-top">
                  <td className="py-1.5 pr-2">{r.job}</td>
                  <td className="py-1.5 pr-2 font-semibold">{r.scope}</td>
                  <td
                    className={cn(
                      "py-1.5 pr-2 tnum",
                      r.job === "standings" && isStale(r) && "text-destructive",
                    )}
                  >
                    {when(r.last_success_at)}
                  </td>
                  <td className="py-1.5 pr-2 tnum">{r.consecutive_failures}</td>
                  <td className="max-w-[360px] py-1.5 pr-2 text-muted-foreground">
                    {r.last_error ?? JSON.stringify(r.meta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
