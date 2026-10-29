import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { FixtureCsvImport } from "@/components/admin/fixture-csv-import";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import {
  adminFindUsers,
  adminResync,
  adminSetBanned,
  adminSettleAll,
  adminSettlementOverview,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { formatDate, formatDateTime, formatUnits } from "@/lib/format";
import { isPickId } from "@/lib/verify";
import { supabase } from "@/integrations/supabase/client";

const panel = "card-surface p-5";

export function FixturesTab() {
  const { t } = useTranslation("admin");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setNote(null);
    try {
      const r = await adminResync();
      if (!r.ok) setNote(t(`fixtures.resync.error.${r.code}`));
      else {
        const base = t("fixtures.resync.done", {
          fcalls: r.fixtures.calls,
          fupserted: r.fixtures.upserted,
          rcalls: r.results.calls,
          rupserted: r.results.upserted,
        });
        setNote(
          r.skipped.length
            ? `${base} ${t("fixtures.resync.skipped")}: ${r.skipped.join("; ")}`
            : base,
        );
      }
    } catch {
      setNote(t("fixtures.resync.error.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className={panel}>
        <h2 className="text-lg">{t("fixtures.resync.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("fixtures.resync.body")}</p>
        <Button className="mt-4" disabled={busy} onClick={() => void run()}>
          {busy ? t("fixtures.resync.working") : t("fixtures.resync.button")}
        </Button>
        {note && (
          <p role="status" className="mt-3 text-sm">
            {note}
          </p>
        )}
      </section>
      <FixtureCsvImport />
    </div>
  );
}

interface HistoryRow {
  result: string;
  units: number;
  source: string;
  settled_at: string;
  reason: string | null;
}

export function SettlementTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, failed: error } = useAsync(() => adminSettlementOverview(), [tick]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [pickId, setPickId] = useState("");
  const [result, setResult] = useState<"won" | "lost" | "void">("won");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  async function settleAll() {
    setBusy(true);
    setNote(null);
    try {
      const r = await adminSettleAll();
      setNote(
        r.ok
          ? t("settle.allDone", { graded: r.graded, inserted: r.inserted, skipped: r.skipped })
          : t("settle.error"),
      );
      setTick((n) => n + 1);
    } catch {
      setNote(t("settle.error"));
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory(id: string) {
    const { data: rows } = await supabase
      .from("prediction_results")
      .select("result, units, source, settled_at")
      .eq("prediction_id", id)
      .order("settled_at", { ascending: false });
    setHistory(((rows ?? []) as Omit<HistoryRow, "reason">[]).map((r) => ({ ...r, reason: null })));
  }

  async function correct(e: React.FormEvent) {
    e.preventDefault();
    const id = pickId.trim().toLowerCase();
    if (!isPickId(id)) {
      setMsg(t("settle.manual.error.prediction_not_found"));
      return;
    }
    if (!reason.trim()) {
      setMsg(t("settle.manual.error.reason_required"));
      return;
    }
    setSaving(true);
    setMsg(null);
    const { error: err } = await supabase.rpc("admin_settle_prediction", {
      p_prediction: id,
      p_result: result,
      p_reason: reason.trim(),
    });
    setSaving(false);
    if (err) {
      const m = err.message;
      const known = ["forbidden", "reason_required", "prediction_not_found", "invalid_result"];
      const key = known.find((k) => m.includes(k)) ?? "generic";
      {
        setMsg(t(`settle.manual.error.${key}`));
        return;
      }
    }
    setMsg(t("settle.manual.done"));
    setReason("");
    await loadHistory(id);
    setTick((n) => n + 1);
  }

  return (
    <div className="space-y-5">
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg">{t("settle.overview")}</h2>
          <Button disabled={busy} onClick={() => void settleAll()}>
            {busy ? t("settle.allWorking") : t("settle.all")}
          </Button>
        </div>
        {note && (
          <p role="status" className="mt-3 text-sm">
            {note}
          </p>
        )}
        {error ? (
          <p className="mt-3 text-sm text-destructive">{t("settle.error")}</p>
        ) : !data || data.fixtures.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("settle.none")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {data.fixtures.map((f) => (
              <li key={f.fixtureId} className="flex flex-wrap items-center gap-x-3 py-2">
                <span className="font-semibold">{f.label}</span>
                <span className="text-muted-foreground tnum">{f.score ?? "–"}</span>
                <span className="text-muted-foreground">
                  {t("settle.pending", { count: f.pending })}
                </span>
                {!f.settleable && (
                  <span className="text-xs text-destructive">{t("settle.noScore")}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(e) => void correct(e)} className={panel}>
        <h2 className="text-lg">{t("settle.manual.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("settle.manual.body")}</p>
        <label htmlFor="a-pick" className="mt-4 block text-sm font-medium">
          {t("settle.manual.pickId")}
        </label>
        <Input
          id="a-pick"
          value={pickId}
          onChange={(e) => setPickId(e.target.value)}
          onBlur={() =>
            isPickId(pickId.trim().toLowerCase()) && void loadHistory(pickId.trim().toLowerCase())
          }
          className="mt-1 font-mono text-xs"
          autoComplete="off"
        />
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">{t("settle.manual.result")}</legend>
          <div className="mt-1 flex gap-2">
            {(["won", "lost", "void"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={result === r}
                onClick={() => setResult(r)}
                className={`px-4 py-2 text-sm font-medium ${
                  result === r
                    ? "bg-ink text-ink-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {t(`settle.manual.${r}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <label htmlFor="a-reason" className="mt-4 block text-sm font-medium">
          {t("settle.manual.reason")}
        </label>
        <Textarea
          id="a-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1"
          rows={3}
        />
        <Button type="submit" className="mt-4" disabled={saving}>
          {saving ? t("settle.manual.working") : t("settle.manual.submit")}
        </Button>
        {msg && (
          <p role="status" className="mt-3 text-sm">
            {msg}
          </p>
        )}
        {history.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">{t("settle.manual.history")}</h3>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {history.map((h, i) => (
                <li key={i} className="tnum">
                  {formatDateTime(h.settled_at)} ·{" "}
                  {t("settle.manual.by", {
                    source: h.source,
                    result: h.result,
                    units: formatUnits(h.units),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}

interface ReportRow {
  id: string;
  prediction_id: string;
  reason: string;
  created_at: string;
}

export function ReportsTab() {
  const { t } = useTranslation("admin");
  const [tick, setTick] = useState(0);
  const { data, failed: error } = useAsync(async () => {
    const { data: rows, error: err } = await supabase
      .from("reports")
      .select("id, prediction_id, reason, created_at")
      .is("resolved_at", null)
      .order("created_at", { ascending: true })
      .limit(50);
    if (err) throw err;
    return rows as ReportRow[];
  }, [tick]);
  const [hideReason, setHideReason] = useState<Record<string, string>>({});

  async function resolve(id: string) {
    const { error: err } = await supabase
      .from("reports")
      .update({ resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (err) {
      toast.error(t("reports.error"));
      return;
    }
    toast.success(t("reports.resolved"));
    setTick((n) => n + 1);
  }

  async function hide(r: ReportRow) {
    const reason = (hideReason[r.id] ?? "").trim();
    const { data: me } = await supabase.auth.getUser();
    if (!reason || !me.user) {
      toast.error(t("reports.error"));
      return;
    }
    const { error: err } = await supabase
      .from("hidden_predictions")
      .insert({ prediction_id: r.prediction_id, reason, admin_id: me.user.id });
    if (err && err.code !== "23505") {
      toast.error(t("reports.error"));
      return;
    }
    toast.success(t("reports.hidden"));
    await resolve(r.id);
  }

  if (error) return <p className="text-sm text-destructive">{t("reports.error")}</p>;
  if (!data || data.length === 0)
    return <p className={`${panel} text-sm text-muted-foreground`}>{t("reports.empty")}</p>;

  return (
    <ul className="space-y-4">
      {data.map((r) => (
        <li key={r.id} className={panel}>
          <p className="text-xs text-muted-foreground tnum">{formatDate(r.created_at)}</p>
          <p className="mt-1 text-sm">
            <span className="font-medium">{t("reports.reason")}:</span> {r.reason}
          </p>
          <p className="mt-1 text-xs">
            {t("reports.pick")}:{" "}
            <a className="font-mono text-primary underline" href={`/verify?id=${r.prediction_id}`}>
              {r.prediction_id}
            </a>
          </p>
          <Input
            aria-label={t("reports.hideReason")}
            placeholder={t("reports.hideReason")}
            value={hideReason[r.id] ?? ""}
            onChange={(e) => setHideReason((s) => ({ ...s, [r.id]: e.target.value }))}
            className="mt-3"
          />
          <div className="mt-3 flex gap-2">
            <Button variant="outline" onClick={() => void resolve(r.id)}>
              {t("reports.resolve")}
            </Button>
            <Button variant="destructive" onClick={() => void hide(r)}>
              {t("reports.hide")}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function UsersTab() {
  const { t } = useTranslation("admin");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [hideId, setHideId] = useState("");
  const [hideWhy, setHideWhy] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    try {
      setRows((await adminFindUsers({ data: { query } })) ?? []);
    } catch {
      setRows([]);
    }
  }

  async function ban(u: AdminUserRow) {
    try {
      const r = await adminSetBanned({ data: { userId: u.id, banned: !u.isBanned } });
      if (!r.ok) {
        toast.error(t("users.banError"));
        return;
      }
      toast.success(t("users.banDone"));
      await search();
    } catch {
      toast.error(t("users.banError"));
    }
  }

  async function hidePick(e: React.FormEvent) {
    e.preventDefault();
    const id = hideId.trim().toLowerCase();
    const { data: me } = await supabase.auth.getUser();
    if (!isPickId(id) || !hideWhy.trim() || !me.user) {
      toast.error(t("users.hideError"));
      return;
    }
    const { error } = await supabase
      .from("hidden_predictions")
      .insert({ prediction_id: id, reason: hideWhy.trim(), admin_id: me.user.id });
    if (error && error.code !== "23505") {
      toast.error(t("users.hideError"));
      return;
    }
    toast.success(t("users.hideDone"));
    setHideId("");
    setHideWhy("");
  }

  return (
    <div className="space-y-5">
      <section className={panel}>
        <form onSubmit={(e) => void search(e)} className="flex gap-2">
          <Input
            aria-label={t("users.search")}
            placeholder={t("users.search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button type="submit">{t("users.go")}</Button>
        </form>
        {rows && rows.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">{t("users.none")}</p>
        )}
        {rows && rows.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-sm">
            {rows.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="font-semibold">{u.username}</span>
                {u.foundingNumber !== null && (
                  <span className="text-xs text-muted-foreground">
                    {t("users.founding", { number: u.foundingNumber })}
                  </span>
                )}
                {u.isBanned && (
                  <span className="text-xs font-semibold text-destructive">
                    {t("users.banned")}
                  </span>
                )}
                {u.role !== "admin" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => void ban(u)}
                  >
                    {u.isBanned ? t("users.unban") : t("users.ban")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={(e) => void hidePick(e)} className={panel}>
        <h2 className="text-lg">{t("users.hideTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("users.hideBody")}</p>
        <Input
          aria-label={t("users.hideId")}
          placeholder={t("users.hideId")}
          value={hideId}
          onChange={(e) => setHideId(e.target.value)}
          className="mt-3 font-mono text-xs"
        />
        <Input
          aria-label={t("users.hideReason")}
          placeholder={t("users.hideReason")}
          value={hideWhy}
          onChange={(e) => setHideWhy(e.target.value)}
          className="mt-2"
        />
        <Button type="submit" variant="destructive" className="mt-3">
          {t("users.hideButton")}
        </Button>
      </form>
    </div>
  );
}

export function WaitlistTab() {
  const { t } = useTranslation("admin");
  const { data } = useAsync(async () => {
    const [ea, inv, unsub] = await Promise.all([
      supabase
        .from("early_access")
        .select("email, name, created_at")
        .order("created_at")
        .limit(1000),
      supabase.from("waitlist_invites").select("email"),
      supabase.from("waitlist_unsubscribes").select("email"),
    ]);
    const invited = new Set((inv.data ?? []).map((r) => r.email.toLowerCase()));
    const gone = new Set((unsub.data ?? []).map((r) => r.email.toLowerCase()));
    return (ea.data ?? []).map((r) => ({
      ...r,
      status: gone.has(r.email.toLowerCase())
        ? "unsubscribed"
        : invited.has(r.email.toLowerCase())
          ? "invited"
          : "notInvited",
    }));
  }, []);

  return (
    <section className={panel}>
      <h2 className="text-lg">{t("waitlist.total", { count: data?.length ?? 0 })}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("waitlist.note")}</p>
      {data && data.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("waitlist.empty")}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 pr-3">{t("waitlist.col.email")}</th>
                <th className="py-1 pr-3">{t("waitlist.col.name")}</th>
                <th className="py-1 pr-3">{t("waitlist.col.joined")}</th>
                <th className="py-1">{t("waitlist.col.status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data ?? []).map((r) => (
                <tr key={r.email}>
                  <td className="py-1.5 pr-3">{r.email}</td>
                  <td className="py-1.5 pr-3">{r.name}</td>
                  <td className="py-1.5 pr-3 tnum">{formatDate(r.created_at)}</td>
                  <td className="py-1.5">{t(`waitlist.status.${r.status}`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
