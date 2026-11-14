import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  Languages,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/provider";
import { LEGAL_PAGES, REVIEW_LOCALES, sameTokens, type ReviewLocale } from "@/lib/translations";
import {
  approveTranslationSection,
  getTranslationOverview,
  listTranslationStrings,
  saveTranslationReview,
  signOffTranslation,
  type NamespaceSummary,
  type StringRow,
  type TranslationOverview,
} from "@/lib/translations-admin.functions";
import { comingSoonLocales, locales } from "@/locales/config";

type Filter = "all" | "pending" | "changes" | "stale" | "approved";

const STATUS_STYLE: Record<StringRow["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-primary-soft text-primary",
  changes: "bg-[oklch(0.95_0.06_85)] text-[oklch(0.45_0.12_70)]",
  stale: "bg-destructive/10 text-destructive",
};

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function Bar({ value, total }: { value: number; total: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${pct(value, total)}%` }}
      />
    </div>
  );
}

/** Admin > Translations: native-speaker review of each translated string and legal page, then a sign-off. */
export function TranslationsTab() {
  const { t } = useTranslation("admin");
  const { setLocale } = useLocale();
  const overviewFn = useServerFn(getTranslationOverview);
  const [locale, setReviewLocale] = useState<ReviewLocale>(REVIEW_LOCALES[0]);
  const [overview, setOverview] = useState<TranslationOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await overviewFn({ data: { locale } });
    if (res.ok) setOverview(res);
    else setError(res.message ?? t(`translations.error.${res.code}`));
  }, [overviewFn, locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const langName = locales.find((l) => l.code === locale)?.nativeName ?? locale;
  const totals = overview?.totals;
  const ready = !!totals && totals.total > 0 && totals.approved === totals.total;

  return (
    <div className="space-y-6">
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg">
              <Languages className="size-5 text-primary" aria-hidden="true" />
              {t("translations.title")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("translations.intro")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {REVIEW_LOCALES.map((code) => (
              <Button
                key={code}
                size="sm"
                variant={code === locale ? "default" : "outline"}
                onClick={() => {
                  setReviewLocale(code);
                  setSection(null);
                }}
              >
                {locales.find((l) => l.code === code)?.nativeName ?? code}
              </Button>
            ))}
            {comingSoonLocales().map((l) => (
              <Button
                key={l.code}
                size="sm"
                variant="outline"
                disabled
                title={t("translations.comingSoon")}
              >
                {l.nativeName} · {t("translations.comingSoon")}
              </Button>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        {totals && (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">
                {t("translations.progress", {
                  approved: totals.approved,
                  total: totals.total,
                  name: langName,
                })}
              </span>
              <span className="text-muted-foreground tnum">
                {pct(totals.approved, totals.total)}%
              </span>
            </div>
            <Bar value={totals.approved} total={totals.total} />
            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              {(
                [
                  ["translated", totals.translated],
                  ["approved", totals.approved],
                  ["changes", totals.changes],
                  ["stale", totals.stale],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-border p-3">
                  <dt className="text-muted-foreground">{t(`translations.count.${k}`)}</dt>
                  <dd className="mt-1 text-lg font-bold tnum">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setLocale(locale, { preview: true });
                  window.open("/", "_blank", "noopener");
                }}
              >
                <Eye className="size-4" /> {t("translations.preview", { name: langName })}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setLocale("en-ZA")}>
                {t("translations.backToEnglish")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("translations.howLive")}</p>
          </div>
        )}
      </section>

      {overview && !section && (
        <section className="card-surface overflow-hidden">
          <h3 className="border-b border-border p-5 text-base">{t("translations.sections")}</h3>
          <ul className="divide-y divide-border">
            {overview.namespaces.map((n) => (
              <SectionRow key={n.namespace} n={n} onOpen={() => setSection(n.namespace)} />
            ))}
          </ul>
        </section>
      )}

      {overview && section && (
        <StringList
          locale={locale}
          namespace={section}
          onBack={() => {
            setSection(null);
            void load();
          }}
        />
      )}

      {overview && (
        <SignOff
          locale={locale}
          langName={langName}
          ready={ready}
          totals={overview.totals}
          signoffs={overview.signoffs}
          onDone={load}
        />
      )}
    </div>
  );
}

function SectionRow({ n, onOpen }: { n: NamespaceSummary; onOpen: () => void }) {
  const { t } = useTranslation("admin");
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="min-w-[9rem] font-semibold">
          {n.namespace === "legal" ? t("translations.legal") : n.namespace}
        </span>
        <span className="min-w-[8rem] flex-1">
          <Bar value={n.approved} total={n.total} />
        </span>
        <span className="text-xs text-muted-foreground tnum">
          {n.approved}/{n.total}
          {n.translated < n.total &&
            ` · ${t("translations.untranslated", { count: n.total - n.translated })}`}
          {n.changes > 0 && ` · ${t("translations.changesShort", { count: n.changes })}`}
          {n.stale > 0 && ` · ${t("translations.staleShort", { count: n.stale })}`}
        </span>
      </button>
    </li>
  );
}

function StringList({
  locale,
  namespace,
  onBack,
}: {
  locale: ReviewLocale;
  namespace: string;
  onBack: () => void;
}) {
  const { t } = useTranslation("admin");
  const listFn = useServerFn(listTranslationStrings);
  const approveAllFn = useServerFn(approveTranslationSection);
  const [rows, setRows] = useState<StringRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const isLegal = namespace === "legal";

  const load = useCallback(async () => {
    const res = await listFn({ data: { locale, namespace } });
    if (res.ok) setRows(res.rows);
    else setMsg(res.message ?? t(`translations.error.${res.code}`));
  }, [listFn, locale, namespace, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (filter === "all" || r.status === filter) &&
        (!q ||
          r.key.toLowerCase().includes(q) ||
          r.en.toLowerCase().includes(q) ||
          r.tr.toLowerCase().includes(q)),
    );
  }, [rows, filter, query]);

  const pending = (rows ?? []).filter((r) => r.status === "pending" && r.tr).length;

  return (
    <section className="card-surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← {t("translations.allSections")}
          </button>
          <h3 className="mt-1 text-base">{isLegal ? t("translations.legal") : namespace}</h3>
          {isLegal && (
            <p className="mt-1 text-xs text-muted-foreground">{t("translations.legalHelp")}</p>
          )}
        </div>
        {!isLegal && pending > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              if (!window.confirm(t("translations.approveAllConfirm", { count: pending }))) return;
              const res = await approveAllFn({ data: { locale, namespace } });
              setMsg(
                res.ok
                  ? t("translations.approvedAll", { count: res.approved })
                  : (res.message ?? t(`translations.error.${res.code}`)),
              );
              await load();
            }}
          >
            <CheckCircle2 className="size-4" /> {t("translations.approveAll", { count: pending })}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        {(["all", "pending", "changes", "stale", "approved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === f ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"}`}
          >
            {t(`translations.filter.${f}`)}
          </button>
        ))}
        {!isLegal && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("translations.search")}
            className="ml-auto h-8 min-w-[10rem] rounded-md border border-input bg-background px-2 text-sm"
          />
        )}
      </div>
      {msg && <p className="px-5 pt-3 text-sm text-muted-foreground">{msg}</p>}
      {!rows && <div className="puntr-shimmer m-5 h-24 rounded-lg" aria-hidden="true" />}
      <ul className="divide-y divide-border">
        {shown.map((r) => (
          <StringItem
            key={r.key}
            row={r}
            locale={locale}
            namespace={namespace}
            isLegal={isLegal}
            onSaved={load}
          />
        ))}
      </ul>
      {rows && shown.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">{t("translations.none")}</p>
      )}
    </section>
  );
}

function StringItem({
  row,
  locale,
  namespace,
  isLegal,
  onSaved,
}: {
  row: StringRow;
  locale: ReviewLocale;
  namespace: string;
  isLegal: boolean;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const { setLocale } = useLocale();
  const saveFn = useServerFn(saveTranslationReview);
  const [editing, setEditing] = useState(false);
  const [suggestion, setSuggestion] = useState(row.suggestion ?? "");
  const [note, setNote] = useState(row.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tokensOk = isLegal || !row.tr || sameTokens(row.en, row.tr);
  const legal = isLegal ? LEGAL_PAGES.find((p) => p.slug === row.key) : undefined;

  const save = async (status: "approved" | "changes" | "clear") => {
    setBusy(true);
    setErr(null);
    const res = await saveFn({
      data: { locale, namespace, key: row.key, status, suggestion, note },
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.message ?? t(`translations.error.${res.code}`));
      return;
    }
    setEditing(false);
    await onSaved();
  };

  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 break-all text-[11px] text-muted-foreground">{row.key}</code>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[row.status]}`}
        >
          {t(`translations.status.${row.status}`)}
        </span>
        {!tokensOk && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> {t("translations.tokens")}
          </span>
        )}
      </div>

      {legal ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <a href={legal.path} target="_blank" rel="noopener" onClick={() => setLocale("en-ZA")}>
              <ExternalLink className="size-4" /> {t("translations.openEnglish")}
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a
              href={legal.path}
              target="_blank"
              rel="noopener"
              onClick={() => setLocale(locale, { preview: true })}
            >
              <ExternalLink className="size-4" /> {t("translations.openTranslated")}
            </a>
          </Button>
          {!row.tr.includes("#") && (
            <span className="text-xs text-destructive">{t("translations.legalMissing")}</span>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              English
            </p>
            <p className="whitespace-pre-wrap text-sm">{row.en}</p>
          </div>
          <div className="rounded-lg border border-border p-3" lang={locale}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {locales.find((l) => l.code === locale)?.nativeName}
            </p>
            {row.tr ? (
              <p className="whitespace-pre-wrap text-sm">{row.tr}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">{t("translations.missing")}</p>
            )}
          </div>
        </div>
      )}

      {(row.suggestion || row.note) && !editing && (
        <div className="rounded-lg border border-dashed border-border p-3 text-sm">
          {row.suggestion && (
            <p>
              <span className="font-semibold">{t("translations.suggestion")}:</span>{" "}
              {row.suggestion}
            </p>
          )}
          {row.note && (
            <p className="mt-1 text-muted-foreground">
              <span className="font-semibold">{t("translations.note")}:</span> {row.note}
            </p>
          )}
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          {!isLegal && (
            <label className="block text-xs font-semibold">
              {t("translations.suggestion")}
              <textarea
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
                rows={2}
                lang={locale}
                className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm font-normal"
              />
            </label>
          )}
          <label className="block text-xs font-semibold">
            {t("translations.note")}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm font-normal"
            />
          </label>
        </div>
      )}

      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => void save("changes")}>
              {t("translations.saveChanges")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("translations.cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" disabled={busy || !row.tr} onClick={() => void save("approved")}>
              <CheckCircle2 className="size-4" /> {t("translations.approve")}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
              <PenLine className="size-4" />{" "}
              {isLegal ? t("translations.addNote") : t("translations.suggest")}
            </Button>
            {row.status !== "pending" && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void save("clear")}>
                <RotateCcw className="size-4" /> {t("translations.reset")}
              </Button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

function SignOff({
  locale,
  langName,
  ready,
  totals,
  signoffs,
  onDone,
}: {
  locale: ReviewLocale;
  langName: string;
  ready: boolean;
  totals: TranslationOverview["totals"];
  signoffs: TranslationOverview["signoffs"];
  onDone: () => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const signFn = useServerFn(signOffTranslation);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const live = locales.find((l) => l.code === locale)?.enabled ?? false;
  const latest = signoffs[0];

  const sign = async (decision: "approved" | "withdrawn") => {
    if (
      decision === "approved" &&
      !window.confirm(t("translations.signConfirm", { name: langName }))
    )
      return;
    const res = await signFn({
      data: {
        locale,
        decision,
        reviewerName: name,
        note,
        counts: { approved: totals.approved, total: totals.total },
      },
    });
    setMsg(
      res.ok
        ? t(`translations.signed.${decision}`)
        : (res.message ?? t(`translations.error.${res.code}`)),
    );
    if (res.ok) await onDone();
  };

  return (
    <section className="card-surface p-5">
      <h3 className="text-base">{t("translations.signTitle", { name: langName })}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {live
          ? t("translations.live", { name: langName })
          : latest?.decision === "approved"
            ? t("translations.awaitingRelease", { name: langName, reviewer: latest.reviewerName })
            : t("translations.signHelp")}
      </p>
      {!ready && (
        <p className="mt-2 text-xs font-semibold text-destructive">{t("translations.notReady")}</p>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold">
          {t("translations.reviewerName")}
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-semibold">
          {t("translations.note")}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={!ready || name.trim().length < 2}
          onClick={() => void sign("approved")}
        >
          {t("translations.signApprove", { name: langName })}
        </Button>
        {latest?.decision === "approved" && (
          <Button
            size="sm"
            variant="outline"
            disabled={name.trim().length < 2}
            onClick={() => void sign("withdrawn")}
          >
            {t("translations.signWithdraw")}
          </Button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm text-muted-foreground">{msg}</p>}
      {signoffs.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {signoffs.map((s) => (
            <li key={s.signedAt}>
              {new Date(s.signedAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} ·{" "}
              {t(`translations.decision.${s.decision}`)} · {s.reviewerName} · {s.approvedCount}/
              {s.totalCount}
              {s.note && ` · ${s.note}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
