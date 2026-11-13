import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAsync } from "@/hooks/use-async";
import { formatDateTime } from "@/lib/format";
import {
  adminNewsroomDesk,
  adminNewsroomDetail,
  adminNewsroomGenerate,
  adminNewsroomSave,
  adminNewsroomSettings,
  adminNewsroomStatus,
  adminProjectUpdate,
  type DeskArticle,
  type DeskData,
} from "@/lib/newsroom-admin.functions";
import { NEWSROOM_CATEGORIES } from "@/lib/newsroom";
import { sastDate } from "@/lib/sast";

const panel = "card-surface p-5";
const STATUS_FILTERS = ["REVIEW", "PUBLISHED", "ARCHIVED", "all"] as const;

/** /admin > Newsroom: review queue, data quality, editing, publishing, generation and the project-update feed. */
export function NewsroomTab() {
  const { t } = useTranslation("admin");
  const [nonce, setNonce] = useState(0);
  const desk = useAsync(() => adminNewsroomDesk(), [nonce]);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("REVIEW");
  const [open, setOpen] = useState<string | null>(null);
  const reload = () => setNonce((n) => n + 1);
  const d = desk.data;

  if (desk.loading && !d)
    return <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden />;
  if (desk.failed || !d) return <p className="text-sm text-destructive">{t("desk.error")}</p>;
  const articles = d.articles.filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="space-y-5">
      <Generate onDone={reload} />
      <EngineSettings settings={d.settings} onSaved={reload} />

      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("desk.queue")}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              aria-pressed={filter === s}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === s ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"}`}
            >
              {t(`desk.status.${s}`)} (
              {s === "all" ? d.articles.length : d.articles.filter((a) => a.status === s).length})
            </button>
          ))}
        </div>
        {articles.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("desk.none")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {articles.map((a) => (
              <ArticleRow
                key={a.id}
                article={a}
                open={open === a.id}
                onToggle={() => setOpen(open === a.id ? null : a.id)}
                onChanged={reload}
              />
            ))}
          </ul>
        )}
      </section>

      <ProjectUpdates updates={d.updates} onChanged={reload} />

      <section className={panel}>
        <h2 className="font-display text-lg font-bold">{t("desk.jobs")}</h2>
        {d.jobs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("desk.noJobs")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {d.jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-2 py-2">
                <span
                  className={`inline-block size-2.5 rounded-full ${j.status === "succeeded" ? "bg-primary" : j.status === "running" ? "bg-[oklch(0.8_0.15_85)]" : "bg-destructive"}`}
                  aria-hidden
                />
                <span className="font-mono text-xs">{j.jobKey}</span>
                <span className="text-muted-foreground">{j.kind}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(j.startedAt)}</span>
                {j.model && <span className="text-xs text-muted-foreground">{j.model}</span>}
                {j.error && (
                  <span className="w-full break-words text-xs text-destructive">{j.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Generate({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation("admin");
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);

  async function one(kind: "sports" | "development", beatOffset: number, label: string) {
    const r = await adminNewsroomGenerate({ data: { kind, beatOffset } });
    const status = r.ok
      ? r.data?.error
        ? `${r.data.status}: ${r.data.error}`
        : (r.data?.status ?? "")
      : r.code;
    setResults((list) => [...list, `${label}: ${status}`]);
  }

  async function run(
    plan: { kind: "sports" | "development"; beatOffset: number; label: string }[],
    key: string,
  ) {
    setBusy(key);
    setResults([]);
    try {
      for (const p of plan) await one(p.kind, p.beatOffset, p.label);
      onDone();
    } catch {
      toast.error(t("desk.generateError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("desk.generate")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("desk.generateBody")}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          disabled={busy !== null}
          onClick={() =>
            void run(
              [
                { kind: "sports", beatOffset: 0, label: t("desk.kind.sports") + " 1" },
                { kind: "sports", beatOffset: 1, label: t("desk.kind.sports") + " 2" },
                { kind: "development", beatOffset: 0, label: t("desk.kind.development") },
              ],
              "batch",
            )
          }
        >
          {busy === "batch" ? t("desk.working") : t("desk.firstRun")}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            void run([{ kind: "sports", beatOffset: 0, label: t("desk.kind.sports") }], "sports")
          }
        >
          {t("desk.oneSports")}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() =>
            void run(
              [{ kind: "development", beatOffset: 0, label: t("desk.kind.development") }],
              "dev",
            )
          }
        >
          {t("desk.oneDev")}
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {results.map((r) => (
            <li key={r} className="break-words font-mono text-xs">
              {r}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("desk.generateNote")}</p>
    </section>
  );
}

function EngineSettings({
  settings,
  onSaved,
}: {
  settings: DeskData["settings"];
  onSaved: () => void;
}) {
  const { t } = useTranslation("admin");
  const [s, setS] = useState(settings);
  const changed = JSON.stringify(s) !== JSON.stringify(settings);
  async function save() {
    try {
      const r = await adminNewsroomSettings({ data: s });
      if (!r.ok) throw new Error();
      toast.success(t("desk.saved"));
      onSaved();
    } catch {
      toast.error(t("desk.saveError"));
    }
  }
  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("desk.engine")}</h2>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.enabled}
            onChange={(e) => setS({ ...s, enabled: e.target.checked })}
          />
          {t("desk.enabled")}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={s.autoPublish}
            onChange={(e) => setS({ ...s, autoPublish: e.target.checked })}
          />
          {t("desk.autoPublish")}
        </label>
        <label className="flex items-center gap-2">
          {t("desk.minQuality")}
          <Input
            className="h-8 w-20"
            inputMode="numeric"
            value={String(s.minQuality)}
            onChange={(e) => setS({ ...s, minQuality: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="flex items-center gap-2">
          {t("desk.schedule")}
          <select
            className="rounded-lg border border-border bg-background px-2 py-1"
            value={s.scheduleMode}
            onChange={(e) => setS({ ...s, scheduleMode: e.target.value })}
          >
            {["alternate", "sports", "development"].map((m) => (
              <option key={m} value={m}>
                {t(`desk.mode.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          {t("desk.next")}
          <select
            className="rounded-lg border border-border bg-background px-2 py-1"
            value={s.nextKindOverride ?? ""}
            onChange={(e) => setS({ ...s, nextKindOverride: e.target.value || null })}
          >
            <option value="">{t("desk.mode.none")}</option>
            <option value="sports">{t("desk.kind.sports")}</option>
            <option value="development">{t("desk.kind.development")}</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{t("desk.engineNote")}</p>
      <Button className="mt-3" disabled={!changed} onClick={() => void save()}>
        {t("desk.save")}
      </Button>
    </section>
  );
}

function ArticleRow({
  article: a,
  open,
  onToggle,
  onChanged,
}: {
  article: DeskArticle;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const { t } = useTranslation("admin");
  const detail = useAsync(
    () => (open ? adminNewsroomDetail({ data: { id: a.id } }) : Promise.resolve(null)),
    [open, a.id],
  );
  const [edit, setEdit] = useState({
    title: a.title,
    excerpt: a.excerpt,
    body: a.body,
    category: a.category,
    seoTitle: a.seoTitle ?? "",
    seoDescription: a.seoDescription ?? "",
  });
  const [busy, setBusy] = useState(false);
  const critical = a.qualityIssues.filter((i) => i.critical);

  async function status(next: string) {
    setBusy(true);
    try {
      const r = await adminNewsroomStatus({ data: { id: a.id, status: next } });
      if (!r.ok) throw new Error(r.message);
      toast.success(t("desk.saved"));
      onChanged();
    } catch {
      toast.error(t("desk.saveError"));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const r = await adminNewsroomSave({ data: { id: a.id, ...edit } });
      if (!r.ok) throw new Error(r.message);
      toast.success(t("desk.saved"));
      onChanged();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? `${t("desk.saveError")}: ${e.message}`
          : t("desk.saveError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-border p-4">
      <button
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-2 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold">{a.title}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
          {t(`desk.status.${a.status}`, { defaultValue: a.status })}
        </span>
        {a.origin === "ai" && (
          <span className="rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">
            AI · {a.aiModel ?? "?"}
          </span>
        )}
        {a.qualityScore !== null && (
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${critical.length ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary"}`}
          >
            {t("desk.quality", { score: a.qualityScore })}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {formatDateTime(a.publishedAt ?? a.createdAt)}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4 text-sm">
          {a.coverImageUrl && (
            <img
              src={a.coverImageUrl}
              alt=""
              className="w-full max-w-md border border-border"
              loading="lazy"
            />
          )}

          {a.qualityIssues.length > 0 && (
            <div>
              <h3 className="font-semibold">{t("desk.issues")}</h3>
              <ul className="mt-1 space-y-1">
                {a.qualityIssues.map((i, n) => (
                  <li key={n} className={i.critical ? "text-destructive" : "text-muted-foreground"}>
                    {i.critical ? "■" : "□"} <span className="font-mono text-xs">{i.code}</span>{" "}
                    {i.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Input
              value={edit.title}
              onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              aria-label={t("desk.f.title")}
            />
            <Textarea
              value={edit.excerpt}
              onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })}
              rows={2}
              aria-label={t("desk.f.excerpt")}
            />
            <Textarea
              value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })}
              rows={12}
              className="font-mono text-xs"
              aria-label={t("desk.f.body")}
            />
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-lg border border-border bg-background px-2 py-1"
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                aria-label={t("desk.f.category")}
              >
                {NEWSROOM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Input
                className="min-w-[12rem] flex-1"
                placeholder={t("desk.f.seoTitle")}
                value={edit.seoTitle}
                onChange={(e) => setEdit({ ...edit, seoTitle: e.target.value })}
              />
            </div>
            <Input
              placeholder={t("desk.f.seoDescription")}
              value={edit.seoDescription}
              onChange={(e) => setEdit({ ...edit, seoDescription: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void save()}>
              {t("desk.saveEdits")}
            </Button>
            {a.status !== "PUBLISHED" && (
              <Button size="sm" disabled={busy} onClick={() => void status("PUBLISHED")}>
                {t("desk.publish")}
              </Button>
            )}
            {a.status === "PUBLISHED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void status("REVIEW")}
              >
                {t("desk.unpublish")}
              </Button>
            )}
            {a.status !== "ARCHIVED" && (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void status("ARCHIVED")}
              >
                {t("desk.reject")}
              </Button>
            )}
            {a.status === "PUBLISHED" && (
              <a
                className="text-sm font-semibold text-primary hover:underline"
                href={`/newsroom/${a.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("desk.view")}
              </a>
            )}
          </div>
          {critical.length > 0 && a.status !== "PUBLISHED" && (
            <p className="text-xs text-destructive">{t("desk.criticalWarning")}</p>
          )}

          {detail.data && (
            <>
              <div>
                <h3 className="font-semibold">{t("desk.sources")}</h3>
                {detail.data.sources.length === 0 ? (
                  <p className="text-muted-foreground">{t("desk.noSources")}</p>
                ) : (
                  <ol className="mt-1 space-y-1">
                    {detail.data.sources.map((s) => (
                      <li key={s.ordinal} className={s.cited ? "" : "text-muted-foreground"}>
                        [{s.ordinal}]{" "}
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer nofollow"
                          className="underline"
                        >
                          {s.title}
                        </a>{" "}
                        <span className="text-xs">
                          ({s.domain}, {s.via}
                          {s.cited ? `, ${t("desk.cited")}` : ""})
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {detail.data.logs.length > 0 && (
                <details>
                  <summary className="cursor-pointer font-semibold">{t("desk.log")}</summary>
                  <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
                    {detail.data.logs.map((l, n) => (
                      <li
                        key={n}
                        className={
                          l.level === "error"
                            ? "text-destructive"
                            : l.level === "warn"
                              ? "text-[oklch(0.55_0.15_60)]"
                              : "text-muted-foreground"
                        }
                      >
                        {l.stage}: {l.message}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function ProjectUpdates({
  updates,
  onChanged,
}: {
  updates: DeskData["updates"];
  onChanged: () => void;
}) {
  const { t } = useTranslation("admin");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(sastDate());
  const [approved, setApproved] = useState(true);

  async function op(data: Record<string, unknown>) {
    try {
      const r = await adminProjectUpdate({ data });
      if (!r.ok) throw new Error(r.message);
      toast.success(t("desk.saved"));
      onChanged();
      return true;
    } catch {
      toast.error(t("desk.saveError"));
      return false;
    }
  }

  return (
    <section className={panel}>
      <h2 className="font-display text-lg font-bold">{t("desk.updates")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("desk.updatesBody")}</p>
      <div className="mt-3 space-y-2">
        <Input
          placeholder={t("desk.f.updateTitle")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder={t("desk.f.updateDetail")}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            className="w-44"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            {t("desk.approvedNow")}
          </label>
          <Button
            onClick={() =>
              void op({ op: "create", title, detail, happenedOn: date, approved }).then((ok) => {
                if (ok) {
                  setTitle("");
                  setDetail("");
                }
              })
            }
          >
            {t("desk.addUpdate")}
          </Button>
        </div>
      </div>
      {updates.length > 0 && (
        <ul className="mt-4 divide-y divide-border text-sm">
          {updates.map((u) => (
            <li key={u.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{u.title}</span>
                <span className="text-xs text-muted-foreground">{u.happenedOn}</span>
                {u.used ? (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {t("desk.used")}
                  </span>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void op({ op: u.approved ? "unapprove" : "approve", id: u.id })
                      }
                    >
                      {u.approved ? t("desk.unapprove") : t("desk.approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void op({ op: "delete", id: u.id })}
                    >
                      {t("desk.delete")}
                    </Button>
                  </>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{u.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
