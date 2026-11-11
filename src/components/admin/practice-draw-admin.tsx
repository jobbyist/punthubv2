import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import { getDrawOverview, runPracticeDraw, type DrawResult } from "@/lib/practice-draw.functions";

const panel = "card-surface p-5";

/** R500 OTT voucher draw. Entries are listed here; the winner is picked at random by the system, never by hand. */
export function PracticeDrawTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, failed, loading } = useAsync(() => getDrawOverview(), [tick]);
  const [witness, setWitness] = useState("");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<DrawResult, { ok: true }> | null>(null);

  async function run() {
    setBusy(true);
    try {
      const res = await runPracticeDraw({
        data: { witness, ...(note.trim() ? { note } : {}) },
      });
      if (res.ok) {
        setResult(res);
        setConfirm("");
        setTick((n) => n + 1);
      } else {
        toast.error(t(`draw.error.${res.error}`));
      }
    } catch (e) {
      console.error("draw failed", e);
      toast.error(t("draw.error.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <p className="text-sm text-muted-foreground">{t("draw.loading")}</p>;
  if (failed || !data)
    return <p className="text-sm text-muted-foreground">{t("draw.loadError")}</p>;

  const canRun =
    data.closed && data.entries.length > 0 && witness.trim().length >= 2 && confirm === "DRAW";

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("draw.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("draw.body")}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[11px] font-bold uppercase text-muted-foreground">
              {t("draw.entries")}
            </dt>
            <dd className="text-xl font-bold tnum">{data.entries.length}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-muted-foreground">
              {t("draw.closes")}
            </dt>
            <dd>{formatDateTime(data.closesAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase text-muted-foreground">
              {t("draw.status")}
            </dt>
            <dd className="font-semibold">{data.closed ? t("draw.closed") : t("draw.open")}</dd>
          </div>
        </dl>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setTick((n) => n + 1)}>
          {t("draw.refresh")}
        </Button>
      </section>

      <section className={panel}>
        <h3 className="text-base">{t("draw.runTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("draw.runBody")}</p>
        {!data.closed && <p className="mt-2 text-sm font-semibold">{t("draw.notClosed")}</p>}
        <div className="mt-3 space-y-2">
          <Input
            value={witness}
            onChange={(e) => setWitness(e.target.value)}
            placeholder={t("draw.witness")}
            maxLength={120}
            disabled={!data.closed}
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("draw.note")}
            maxLength={300}
            disabled={!data.closed}
          />
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={t("draw.confirm")}
            disabled={!data.closed}
          />
          <Button disabled={!canRun || busy} onClick={run}>
            {busy ? t("draw.running") : t("draw.run")}
          </Button>
        </div>
        {result && (
          <div className="mt-4 border border-primary p-4 text-sm" role="status">
            <p className="font-bold uppercase text-primary">{t("draw.winner")}</p>
            <p className="mt-1 text-lg font-bold">
              @{result.winner.username} · #{result.winner.founding_number}
            </p>
            <p className="mt-1 text-muted-foreground">
              {result.winner.email}
              {result.winner.phone ? ` · ${result.winner.phone}` : ""}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t("draw.announce", {
                username: result.winner.username,
                number: result.winner.founding_number,
              })}
            </p>
          </div>
        )}
      </section>

      <section className={panel}>
        <h3 className="text-base">{t("draw.entriesTitle")}</h3>
        {data.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("draw.noEntries")}</p>
        ) : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1">#</th>
                <th>{t("draw.col.member")}</th>
                <th className="text-right">{t("draw.col.picks")}</th>
                <th className="text-right">{t("draw.col.entered")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.entries.map((e) => (
                <tr key={e.user_id}>
                  <td className="py-2 tnum">{e.founding_number}</td>
                  <td>@{e.username}</td>
                  <td className="text-right tnum">{e.practice_picks}</td>
                  <td className="text-right">{formatDateTime(e.entered_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={panel}>
        <h3 className="text-base">{t("draw.logTitle")}</h3>
        {data.log.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("draw.noLog")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.log.map((l) => (
              <li key={l.id} className="py-2">
                <span className="font-semibold">
                  @{l.winner_username ?? "?"} · #{l.winner_founding_number}
                </span>{" "}
                <span className="text-muted-foreground">
                  {formatDateTime(l.drawn_at)} ·{" "}
                  {t("draw.logLine", { count: l.entries, witness: l.witness })}
                  {l.note ? ` · ${l.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
