import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Check, CircleDashed, Flag, Gauge, Rocket } from "lucide-react";
import { useMemo, useState } from "react";

import { setDevReadinessTask } from "@/lib/dev-gate.functions";
import {
  computeReadiness,
  daysToLaunch,
  readinessVerdict,
  type ReadinessSnapshot,
  type ScoredTask,
  type StoredState,
} from "@/lib/mvp-readiness";
import { cn } from "@/lib/utils";

/**
 * /dev readiness tab. Internal and English-only (excluded from i18n like the rest of /dev).
 * The score is computed in the browser from the same pure function the server uses, so a tick
 * moves it instantly; the tick is then saved and rolled back if the save fails.
 */

const fmt = new Intl.NumberFormat("en-ZA");

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 128 128"
      className="size-32 shrink-0"
      role="img"
      aria-label={`Readiness ${score} out of 100`}
    >
      <circle cx="64" cy="64" r={r} fill="none" strokeWidth="12" className="stroke-muted" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        strokeWidth="12"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - score / 100)}
        transform="rotate(-90 64 64)"
        className="stroke-primary transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
      />
      <text
        x="64"
        y="70"
        textAnchor="middle"
        className="fill-foreground font-display text-[30px] font-extrabold"
      >
        {score}
      </text>
      <text x="64" y="90" textAnchor="middle" className="fill-muted-foreground text-[10px]">
        / 100
      </text>
    </svg>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="h-2 w-full bg-muted"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className="h-full bg-primary transition-[width] duration-500 motion-reduce:transition-none"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="card-surface flex items-center gap-3 p-4">
      <Icon className="size-5 text-primary" aria-hidden />
      <div>
        <div className="font-display text-xl font-extrabold leading-none">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export function ReadinessPanel({ snapshot }: { snapshot: ReadinessSnapshot }) {
  const save = useServerFn(setDevReadinessTask);
  const [state, setState] = useState<StoredState>(snapshot.state);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const r = useMemo(() => computeReadiness(state, snapshot.metrics), [state, snapshot.metrics]);
  const verdict = readinessVerdict(r.score, r.openBlockers.length);
  const days = daysToLaunch();

  async function toggle(task: ScoredTask) {
    if (task.metric || !snapshot.stateAvailable || pending) return;
    const prev = state;
    const next = {
      ...state,
      [task.id]: { done: !task.isDone, updatedAt: new Date().toISOString() },
    };
    setState(next);
    setPending(task.id);
    setError(null);
    try {
      const res = await save({ data: { taskId: task.id, done: !task.isDone } });
      if (!res.ok) {
        setState(prev);
        setError(
          res.reason === "locked"
            ? "Your session has ended. Reload and sign in again."
            : "Could not save. Try again.",
        );
      }
    } catch {
      setState(prev);
      setError("Could not save. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="card-surface flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <ScoreRing score={r.score} />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            MVP readiness · launch 1 Dec 2026
          </p>
          <h1 className="text-2xl sm:text-3xl">{verdict}</h1>
          <p className="text-sm text-muted-foreground">
            Weighted across {r.workstreams.length} workstreams. Ticks save for the whole team;
            launch metrics are read live from the database (
            {new Date(snapshot.readAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}{" "}
            SAST).
          </p>
          {!snapshot.stateAvailable ? (
            <p className="text-sm text-destructive">
              Checklist storage is not set up yet (migration `dev_readiness_state` not applied).
              Showing defaults; ticking is off.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Rocket} label="days to launch" value={String(days)} />
        <Stat icon={Check} label="tasks done" value={`${r.doneCount}/${r.totalCount}`} />
        <Stat
          icon={AlertTriangle}
          label="launch blockers open"
          value={String(r.openBlockers.length)}
        />
        <Stat
          icon={Flag}
          label="Founding Members / 100"
          value={
            snapshot.metrics.foundingMembers == null
              ? "–"
              : fmt.format(snapshot.metrics.foundingMembers)
          }
        />
      </div>

      <section className="space-y-3" aria-labelledby="ws-heading">
        <h2 id="ws-heading" className="text-lg">
          Score by workstream
        </h2>
        <div className="card-surface divide-y divide-border">
          {r.workstreams.map((w) => (
            <a
              key={w.id}
              href={`#ws-${w.id}`}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 hover:bg-muted/40 sm:grid-cols-[14rem_1fr_6rem]"
            >
              <span className="text-sm font-semibold">{w.title}</span>
              <span className="text-right text-sm tabular-nums text-muted-foreground sm:order-last">
                {w.points.toFixed(1)} / {w.weight}
              </span>
              <span className="col-span-2 sm:col-span-1">
                <Bar value={w.progress} label={`${w.title} progress`} />
              </span>
            </a>
          ))}
        </div>
      </section>

      {r.openBlockers.length ? (
        <section className="space-y-3" aria-labelledby="blockers-heading">
          <h2 id="blockers-heading" className="text-lg">
            Open launch blockers
          </h2>
          <ul className="card-surface divide-y divide-border">
            {r.openBlockers.map((t) => (
              <li key={t.id} className="flex items-start gap-3 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <span className="flex-1">{t.title}</span>
                {t.metric ? (
                  <span className="tabular-nums text-muted-foreground">
                    {t.value == null ? "no data" : fmt.format(t.value)} /{" "}
                    {fmt.format(t.metric.target)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r.workstreams.map((w) => (
        <section
          key={w.id}
          id={`ws-${w.id}`}
          className="scroll-mt-24 space-y-3"
          aria-labelledby={`h-${w.id}`}
        >
          <div className="flex items-baseline justify-between gap-4">
            <h2 id={`h-${w.id}`} className="text-lg">
              {w.title}
            </h2>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(w.progress * 100)}%
            </span>
          </div>
          <ul className="card-surface divide-y divide-border">
            {w.tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 p-3">
                {t.metric ? (
                  <Gauge
                    className={cn(
                      "mt-0.5 size-5 shrink-0",
                      t.isDone ? "text-primary" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                ) : (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={t.isDone}
                    aria-label={t.title}
                    disabled={!snapshot.stateAvailable || pending === t.id}
                    onClick={() => void toggle(t)}
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center border-2 transition-colors disabled:opacity-50",
                      t.isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary",
                    )}
                  >
                    {t.isDone ? <Check className="size-3.5" aria-hidden /> : null}
                  </button>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={cn(t.isDone && !t.metric && "text-muted-foreground line-through")}
                    >
                      {t.title}
                    </span>
                    {t.blocker && !t.isDone ? (
                      <span className="bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
                        Blocker
                      </span>
                    ) : null}
                    {pending === t.id ? (
                      <CircleDashed
                        className="size-3.5 animate-spin text-muted-foreground"
                        aria-label="Saving"
                      />
                    ) : null}
                  </div>
                  {t.metric ? (
                    <div className="flex items-center gap-3">
                      <Bar value={t.progress} label={`${t.title} progress`} />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {t.value == null ? "no data" : fmt.format(t.value)} /{" "}
                        {fmt.format(t.metric.target)} {t.metric.unit}
                      </span>
                    </div>
                  ) : null}
                  {t.ref ? <div className="text-xs text-muted-foreground">{t.ref}</div> : null}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  w{t.weight}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
