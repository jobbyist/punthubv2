/**
 * Results page, season board: verified final scores grouped by matchday date, a team search, competition chips and
 * an outcome split (home / draw / away, goals per game) computed in code from the results on screen.
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CountUp } from "@/components/motion/count-up";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FilterChips } from "@/components/match/filter-chips";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { formatDate, pct } from "@/lib/format";
import { outcomeSplit } from "@/lib/results-stats";
import {
  fetchSeasonResultCompetitions,
  fetchSeasonResults,
  type SeasonResult,
} from "@/lib/records";

const PAGE = 40;

function Split({ rows }: { rows: SeasonResult[] }) {
  const { t } = useTranslation("results");
  const reduce = useReducedMotion();
  const s = outcomeSplit(rows);
  if (!s) return null;
  const parts = [
    { key: "home", value: s.home, cls: "bg-primary" },
    { key: "draw", value: s.draw, cls: "bg-muted-foreground/40" },
    { key: "away", value: s.away, cls: "bg-foreground" },
  ] as const;
  return (
    <div className="card-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t("board.split.title")}
        </p>
        <p className="text-xs text-muted-foreground">{t("board.split.basis", { count: s.n })}</p>
      </div>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
        {parts.map((p, i) => (
          <motion.span
            key={p.key}
            className={p.cls}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${p.value * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.12, ease: "easeOut" }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        {parts.map((p) => (
          <div key={p.key}>
            <dt className="text-[11px] text-muted-foreground">{t(`board.split.${p.key}`)}</dt>
            <dd className="font-display text-lg font-extrabold tnum">{pct(p.value, 0)}</dd>
          </div>
        ))}
        <div>
          <dt className="text-[11px] text-muted-foreground">{t("board.split.gpg")}</dt>
          <dd className="font-display text-lg font-extrabold tnum">{s.gpg.toFixed(2)}</dd>
        </div>
      </dl>
    </div>
  );
}

function ScoreRow({ r }: { r: SeasonResult }) {
  const { t } = useTranslation("results");
  const homeWin = r.homeScore > r.awayScore;
  const awayWin = r.awayScore > r.homeScore;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-3 sm:px-4">
      <span
        className={`min-w-0 truncate text-right text-sm ${homeWin ? "font-bold" : "text-muted-foreground"}`}
      >
        {r.home}
      </span>
      <span className="flex items-center gap-1 font-display text-base font-extrabold tnum">
        <span
          className={`grid h-8 w-8 place-items-center rounded-md ${homeWin ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {r.homeScore}
        </span>
        <span
          className={`grid h-8 w-8 place-items-center rounded-md ${awayWin ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          {r.awayScore}
        </span>
      </span>
      <span
        className={`min-w-0 truncate text-sm ${awayWin ? "font-bold" : "text-muted-foreground"}`}
      >
        {r.away}
      </span>
      <span className="col-span-3 -mt-1 flex min-w-0 items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className="truncate" title={r.sources.join(", ")}>
          {t("board.verified", { count: r.sources.length, sources: r.sources.join(", ") })}
        </span>
      </span>
    </div>
  );
}

export function SeasonBoard() {
  const { t } = useTranslation("results");
  const [competition, setCompetition] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [draft, setDraft] = useState("");
  const [team, setTeam] = useState("");
  const { data: comps } = useAsync(() => fetchSeasonResultCompetitions(), []);
  const { data, failed, loading } = useAsync(
    () => fetchSeasonResults(competition, limit, team || null),
    [competition, limit, team],
  );
  const total = (comps ?? []).reduce((n, c) => n + c.count, 0);
  const rows = useMemo(() => data ?? [], [data]);
  const days = useMemo(() => {
    const out: { date: string; items: SeasonResult[] }[] = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.date === r.matchDate) last.items.push(r);
      else out.push({ date: r.matchDate, items: [r] });
    }
    return out;
  }, [rows]);

  return (
    <section className="mt-12" aria-labelledby="season-results-title">
      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div>
          <h2 id="season-results-title" className="text-2xl">
            {t("season.title")}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("season.description")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card-surface p-3 text-center">
            <CountUp to={total} className="font-display text-2xl font-extrabold tnum" />
            <p className="text-[11px] text-muted-foreground">{t("board.stats.results")}</p>
          </div>
          <div className="card-surface p-3 text-center">
            <CountUp
              to={(comps ?? []).length}
              className="font-display text-2xl font-extrabold tnum"
            />
            <p className="text-[11px] text-muted-foreground">{t("board.stats.competitions")}</p>
          </div>
        </div>
      </div>

      <div className="card-surface mb-5 space-y-3 p-4">
        <form
          role="search"
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            setTeam(draft.trim());
            setLimit(PAGE);
          }}
        >
          <label htmlFor="season-team" className="sr-only">
            {t("board.search.label")}
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id="season-team"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (draft.trim() !== team) {
                setTeam(draft.trim());
                setLimit(PAGE);
              }
            }}
            placeholder={t("board.search.placeholder")}
            className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setTeam("");
                setLimit(PAGE);
              }}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label={t("board.search.clear")}
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </form>
        {(comps ?? []).length > 0 && (
          <FilterChips
            id="season-results"
            label={t("season.title")}
            active={competition ?? "all"}
            onSelect={(v) => {
              setCompetition(v === "all" ? null : v);
              setLimit(PAGE);
            }}
            chips={[
              { key: "all", label: t("season.all"), count: total },
              ...(comps ?? []).map((c) => ({
                key: c.competition,
                label: c.competition,
                count: c.count,
              })),
            ]}
          />
        )}
      </div>

      {failed && <p className="text-sm text-destructive">{t("season.error")}</p>}
      {loading && rows.length === 0 && (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="puntr-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      )}
      {!loading && !failed && rows.length === 0 && (
        <p className="card-surface p-5 text-sm text-muted-foreground">
          {team ? t("board.search.none", { team }) : t("season.empty")}
        </p>
      )}

      {rows.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-5">
            <AnimatePresence initial={false}>
              {days.map((d) => (
                <motion.section
                  key={d.date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-surface overflow-hidden"
                  aria-label={formatDate(d.date)}
                >
                  <header className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {formatDate(d.date)}
                    </span>
                    <span className="text-[11px] text-muted-foreground tnum">
                      {t("season.count", { count: d.items.length })}
                    </span>
                  </header>
                  {groupByCompetition(d.items).map(([comp, items]) => (
                    <div key={comp} className="border-b border-border last:border-0">
                      <div className="px-4 pt-3">
                        <CompetitionBadge name={comp} />
                      </div>
                      <ul className="divide-y divide-border">
                        {items.map((r) => (
                          <li key={r.id}>
                            <ScoreRow r={r} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </motion.section>
              ))}
            </AnimatePresence>
            {rows.length >= limit && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setLimit((n) => n + PAGE)}>
                  {t("season.more")}
                </Button>
              </div>
            )}
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Split rows={rows} />
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
              {t("board.note")}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}

function groupByCompetition(items: SeasonResult[]): [string, SeasonResult[]][] {
  const m = new Map<string, SeasonResult[]>();
  for (const r of items) m.set(r.competition, [...(m.get(r.competition) ?? []), r]);
  return [...m.entries()];
}
