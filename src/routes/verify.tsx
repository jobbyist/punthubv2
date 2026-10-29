import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAsync } from "@/hooks/use-async";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { isPickId, verifyPick, type VerifyResult } from "@/lib/verify";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" && search["id"] ? { id: search["id"].slice(0, 64) } : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "verify");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/verify" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: Verify,
});

const PICK_COLUMNS =
  "id, seq, prev_hash, hash, user_id, fixture_id, market, selection, line, odds, created_at";

type Outcome =
  | { state: "idle" }
  | { state: "working" }
  | { state: "invalid" | "notFound" | "error" }
  | {
      state: "done";
      result: VerifyResult;
      stored: string;
      isFirst: boolean;
      pick: { id: string; market: string; selection: string; created_at: string };
    };

function Verify() {
  const { t } = useTranslation("verify");
  const { id: initial } = Route.useSearch();
  const [value, setValue] = useState(initial ?? "");
  const [outcome, setOutcome] = useState<Outcome>({ state: "idle" });

  const run = async (raw: string) => {
    const id = raw.trim();
    if (!isPickId(id)) return setOutcome({ state: "invalid" });
    setOutcome({ state: "working" });
    try {
      const { data: row, error } = await supabase
        .from("predictions")
        .select(PICK_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!row) return setOutcome({ state: "notFound" });
      const { data: prev } = await supabase
        .from("predictions")
        .select("hash")
        .lt("seq", row.seq)
        .order("seq", { ascending: false })
        .limit(1)
        .maybeSingle();
      const isFirst = !prev;
      const result = await verifyPick(row, prev?.hash ?? null, isFirst);
      setOutcome({
        state: "done",
        result,
        stored: row.hash,
        isFirst,
        pick: {
          id: row.id,
          market: row.market,
          selection: row.selection,
          created_at: row.created_at,
        },
      });
    } catch (e) {
      console.error("verify failed", e);
      setOutcome({ state: "error" });
    }
  };

  // A link from a pick (/verify?id=...) checks it straight away.
  useEffect(() => {
    if (initial) void run(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(value);
  };

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <section className="card-surface p-5" aria-labelledby="check-title">
        <h2 id="check-title" className="text-lg">
          {t("check.title")}
        </h2>
        <form onSubmit={submit} className="mt-3 space-y-2">
          <Label htmlFor="v-id">{t("check.label")}</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="v-id"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("check.placeholder")}
              className="font-mono text-xs"
              autoComplete="off"
              spellCheck={false}
            />
            <Button type="submit" disabled={outcome.state === "working"}>
              {outcome.state === "working" ? t("check.working") : t("check.button")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("check.hint")}</p>
        </form>

        {(outcome.state === "invalid" ||
          outcome.state === "notFound" ||
          outcome.state === "error") && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {t(`check.${outcome.state}`)}
          </p>
        )}

        {outcome.state === "done" && (
          <div className="mt-4 space-y-3" aria-live="polite">
            <div
              className={`border p-4 ${
                outcome.result.hashMatches
                  ? "border-primary bg-primary-soft/50"
                  : "border-destructive bg-destructive/10"
              }`}
            >
              <p className="font-semibold">
                {outcome.result.hashMatches ? "✓ " : "✕ "}
                {t(outcome.result.hashMatches ? "result.matchTitle" : "result.noMatchTitle")}
              </p>
              <p className="mt-1 text-sm">
                {t(outcome.result.hashMatches ? "result.matchBody" : "result.noMatchBody")}
              </p>
            </div>
            <p className="text-sm">
              {outcome.isFirst
                ? t("result.first")
                : outcome.result.linksToPrevious === null
                  ? t("result.linksUnknown")
                  : outcome.result.linksToPrevious
                    ? t("result.links")
                    : t("result.linksNo")}
            </p>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">{t("result.stored")}</dt>
                <dd className="break-all font-mono">{outcome.stored}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("result.recomputed")}</dt>
                <dd className="break-all font-mono">{outcome.result.recomputed ?? "-"}</dd>
              </div>
            </dl>
          </div>
        )}
      </section>

      <section className="card-surface mt-6 p-5" aria-labelledby="how-title">
        <h2 id="how-title" className="text-lg">
          {t("how.title")}
        </h2>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{t("how.p1")}</p>
          <p>{t("how.p2")}</p>
          <p>{t("how.p3")}</p>
        </div>
      </section>

      <ChainHeads />
    </AppShell>
  );
}

function ChainHeads() {
  const { t } = useTranslation("verify");
  const { data, failed } = useAsync(async () => {
    const { data: rows, error } = await supabase
      .from("chain_heads")
      .select("day, pick_count, hash")
      .order("day", { ascending: false })
      .limit(30);
    if (error) throw error;
    return rows ?? [];
  }, []);
  const today = new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 10);

  return (
    <section className="card-surface mt-6 overflow-hidden" aria-labelledby="heads-title">
      <div className="p-5 pb-3">
        <h2 id="heads-title" className="text-lg">
          {t("heads.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("heads.body")}</p>
      </div>
      {failed && <p className="px-5 pb-5 text-sm text-destructive">{t("heads.error")}</p>}
      {data && data.length === 0 && (
        <p className="px-5 pb-5 text-sm text-muted-foreground">{t("heads.empty")}</p>
      )}
      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">{t("heads.day")}</th>
                <th className="px-3 py-2.5 font-medium">{t("heads.picks")}</th>
                <th className="px-5 py-2.5 font-medium">{t("heads.hash")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.day} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 tnum">
                    {formatDate(`${r.day}T12:00:00+02:00`)}
                    {r.day === today && (
                      <span className="ml-2 bg-primary-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                        {t("heads.today")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 tnum">{r.pick_count}</td>
                  <td className="break-all px-5 py-3 font-mono text-xs" title={r.hash}>
                    {r.hash}
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
