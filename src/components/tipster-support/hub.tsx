import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session";
import { formatDate, formatDateTime, points } from "@/lib/format";
import {
  addTipsterNote,
  priceError,
  tipsterErrorKey,
  updateTipsterSettings,
  type MyTipsterSupport,
  type OpenPick,
} from "@/lib/tipster-support";

import { TipsterUnlockProgress } from "./unlock-progress";

/** The tipster's side: progress until unlocked, then the dashboard, the offer form and supporters-only notes. */
export function TipsterHub({ data, onChange }: { data: MyTipsterSupport; onChange: () => void }) {
  const { t } = useTranslation("tipster");
  const { profile } = useSession();
  const tp = data.tipster;

  if (!tp || tp.status !== "active") {
    return (
      <div className="max-w-2xl">
        <h2 className="mb-3 text-lg">{t("hub.progressTitle")}</h2>
        <TipsterUnlockProgress data={data} />
      </div>
    );
  }

  const e = data.earnings;
  const stats: [string, string][] = [
    [String(e.supporters), t("hub.stats.supporters")],
    [t("hub.points", { points: points(e.held) }), t("hub.stats.held")],
    [t("hub.points", { points: points(e.paid_7d) }), t("hub.stats.week")],
    [t("hub.points", { points: points(e.paid_30d) }), t("hub.stats.month")],
    [t("hub.points", { points: points(e.paid_all) }), t("hub.stats.all")],
    [t("hub.points", { points: points(e.refunded_30d) }), t("hub.stats.refunded")],
  ];

  return (
    <div className="space-y-6">
      <section className="card-surface p-5" aria-label={t("tabs.tipster")}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(([v, l]) => (
            <div key={l}>
              <p className="font-display text-2xl font-extrabold tnum">{v}</p>
              <p className="text-xs text-muted-foreground">{l}</p>
            </div>
          ))}
        </div>
        {profile && (
          <Link
            to="/u/$username"
            params={{ username: profile.username }}
            className="mt-4 inline-block text-sm text-primary underline"
          >
            {t("hub.publicLink")}
          </Link>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <OfferForm data={data} onSaved={onChange} />
        <NotesPanel picks={data.open_picks} onAdded={onChange} />
      </div>

      <section className="card-surface p-5" aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-base">
          {t("hub.recent.title")}
        </h2>
        {e.recent.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("hub.recent.empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {e.recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  @{r.supporter} · {t(`hub.recent.kind.${r.kind}`)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDate(r.created_at)}
                  </span>
                </span>
                <span className="tnum">
                  {points(r.amount)}
                  {r.fee > 0 && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({t("hub.recent.fee", { fee: points(r.fee) })})
                    </span>
                  )}
                  <span className="ml-2 text-xs font-semibold text-muted-foreground">
                    {t(`hub.recent.status.${r.status}`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OfferForm({ data, onSaved }: { data: MyTipsterSupport; onSaved: () => void }) {
  const { t } = useTranslation("tipster");
  const tp = data.tipster!;
  const [accepting, setAccepting] = useState(tp.accepting);
  const [pick, setPick] = useState(tp.price_pick?.toString() ?? "");
  const [week, setWeek] = useState(tp.price_week?.toString() ?? "");
  const [month, setMonth] = useState(tp.price_month?.toString() ?? "");
  const [pitch, setPitch] = useState(tp.pitch ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const L = data.limits;
  const fields = [
    {
      id: "pick",
      label: t("hub.settings.pricePick"),
      value: pick,
      set: setPick,
      range: L.price_pick,
    },
    {
      id: "week",
      label: t("hub.settings.priceWeek"),
      value: week,
      set: setWeek,
      range: L.price_week,
    },
    {
      id: "month",
      label: t("hub.settings.priceMonth"),
      value: month,
      set: setMonth,
      range: L.price_month,
    },
  ] as const;
  const invalid = fields.some((f) => priceError(f.value, f.range) !== null);
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  async function save() {
    if (invalid) {
      setMsg({ ok: false, text: t("hub.settings.invalid") });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await updateTipsterSettings({
        accepting,
        pricePick: num(pick),
        priceWeek: num(week),
        priceMonth: num(month),
        pitch: pitch.trim() || null,
      });
      setMsg({ ok: true, text: t("hub.settings.saved") });
      onSaved();
    } catch (e) {
      setMsg({ ok: false, text: t(tipsterErrorKey(e instanceof Error ? e.message : null)) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-surface p-5" aria-labelledby="offer-title">
      <h2 id="offer-title" className="text-base">
        {t("hub.settings.title")}
      </h2>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Label htmlFor="tipster-accepting">{t("hub.settings.accepting")}</Label>
        <Switch id="tipster-accepting" checked={accepting} onCheckedChange={setAccepting} />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.id}>
            <Label htmlFor={`tipster-price-${f.id}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`tipster-price-${f.id}`}
              inputMode="numeric"
              value={f.value}
              onChange={(e) => f.set(e.target.value.replace(/[^\d]/g, ""))}
              aria-invalid={priceError(f.value, f.range) !== null}
              className="mt-1 tnum"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("hub.settings.range", { min: f.range[0], max: f.range[1] })}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Label htmlFor="tipster-pitch" className="text-xs">
          {t("hub.settings.pitch")}
        </Label>
        <Textarea
          id="tipster-pitch"
          value={pitch}
          maxLength={280}
          onChange={(e) => setPitch(e.target.value)}
          placeholder={t("hub.settings.pitchPlaceholder")}
          className="mt-1"
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("hub.settings.fee", { pct: L.fee_pct })}
        {!data.is_pro && (
          <>
            {" "}
            <Link to="/pricing" className="underline">
              {t("hub.settings.feePro", { pct: L.fee_pct_pro })}
            </Link>
          </>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("hub.settings.existing")}</p>
      <div className="mt-4 flex items-center gap-3">
        <Button disabled={busy} onClick={() => void save()}>
          {t("hub.settings.save")}
        </Button>
        {msg && (
          <p
            role={msg.ok ? "status" : "alert"}
            className={`text-sm ${msg.ok ? "text-primary" : "text-destructive"}`}
          >
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}

function NotesPanel({ picks, onAdded }: { picks: OpenPick[]; onAdded: () => void }) {
  const { t } = useTranslation("tipster");
  return (
    <section className="card-surface p-5" aria-labelledby="notes-title">
      <h2 id="notes-title" className="text-base">
        {t("hub.notes.title")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">{t("hub.notes.body")}</p>
      {picks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("hub.notes.empty")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {picks.map((p) => (
            <NoteRow key={p.prediction_id} pick={p} onAdded={onAdded} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NoteRow({ pick, onAdded }: { pick: OpenPick; onAdded: () => void }) {
  const { t } = useTranslation("tipster");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await addTipsterNote(pick.prediction_id, note);
      onAdded();
    } catch (e) {
      setError(t(tipsterErrorKey(e instanceof Error ? e.message : null)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border border-border p-3">
      <p className="text-sm font-semibold">
        {pick.home} vs {pick.away}
      </p>
      <p className="text-xs text-muted-foreground">{formatDateTime(pick.kickoff_at)}</p>
      {pick.has_note ? (
        <p className="mt-2 text-xs font-semibold text-primary">{t("hub.notes.hasNote")}</p>
      ) : (
        <>
          <Textarea
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("hub.notes.placeholder")}
            aria-label={t("hub.notes.placeholder")}
            className="mt-2"
          />
          <Button
            size="sm"
            className="mt-2"
            disabled={busy || note.trim().length === 0}
            onClick={() => void add()}
          >
            {t("hub.notes.add")}
          </Button>
          {error && (
            <p className="mt-1 text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </li>
  );
}
