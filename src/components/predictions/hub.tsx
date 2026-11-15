/**
 * Predictions hub sections: a tile row into Fixtures, Results, Tables, Duels and Leaderboards, plus compact
 * previews of each. Every preview reads public data and links to its full page.
 */
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  CalendarDays,
  ListOrdered,
  Medal,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { CompetitionBadge } from "@/components/match/competition-badge";
import { useAsync } from "@/hooks/use-async";
import { fetchDuels } from "@/lib/duels-data";
import { formatShortDay, formatUnits } from "@/lib/format";
import { fetchLatestResults, fetchTableKeys } from "@/lib/hub-data";
import { fetchThisWeeksLeaders } from "@/lib/records";
import { competitions } from "@/lib/sports/competitions";
import { fetchStandings } from "@/lib/standings-data";

type HubLink = "/fixtures" | "/results" | "/tables" | "/duels" | "/leaderboards";

const TILES: { key: string; to: HubLink; icon: LucideIcon }[] = [
  { key: "fixtures", to: "/fixtures", icon: CalendarDays },
  { key: "results", to: "/results", icon: Trophy },
  { key: "tables", to: "/tables", icon: ListOrdered },
  { key: "duels", to: "/duels", icon: Swords },
  { key: "leaderboards", to: "/leaderboards", icon: Medal },
];

export function HubNav({ fixtureCount }: { fixtureCount: number }) {
  const { t } = useTranslation("predictions");
  return (
    <nav aria-label={t("hub.navLabel")} className="mb-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TILES.map(({ key, to, icon: Icon }, i) => (
          <motion.li
            key={key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: "spring", stiffness: 320, damping: 28 }}
            className={key === "leaderboards" ? "col-span-2 sm:col-span-1" : ""}
          >
            <Link
              to={to}
              className="group relative flex h-full flex-col justify-between gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-primary transition-transform duration-300 group-hover:scale-x-100"
              />
              <span className="flex items-center justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary transition-transform group-hover:-rotate-6">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <ArrowRight
                  className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  aria-hidden
                />
              </span>
              <span>
                <span className="block font-display text-sm font-bold">
                  {t(`hub.tiles.${key}.title`)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {key === "fixtures"
                    ? t("hub.tiles.fixtures.count", { count: fixtureCount })
                    : t(`hub.tiles.${key}.body`)}
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </nav>
  );
}

function SectionHead({ title, to, cta }: { title: string; to: HubLink; cta: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-lg sm:text-xl">{title}</h2>
      <Link
        to={to}
        className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
      >
        {cta}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function LatestResults() {
  const { t } = useTranslation("predictions");
  const { data, failed, loading } = useAsync(() => fetchLatestResults(6), []);
  return (
    <section aria-labelledby="hub-results" className="card-surface p-4 sm:p-5">
      <span id="hub-results" className="sr-only">
        {t("hub.results.title")}
      </span>
      <SectionHead title={t("hub.results.title")} to="/results" cta={t("hub.results.cta")} />
      {loading ? (
        <Skeleton rows={4} />
      ) : failed || !data?.length ? (
        <p className="text-sm text-muted-foreground">{t("hub.results.empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {data.map((r) => {
            const homeWin = r.home_score > r.away_score;
            const awayWin = r.away_score > r.home_score;
            return (
              <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <CompetitionBadge name={r.competition} showName={false} />
                <span
                  className={`min-w-0 flex-1 truncate text-right ${homeWin ? "font-bold" : ""}`}
                >
                  {r.home}
                </span>
                <span className="rounded-md bg-foreground px-2 py-0.5 font-display text-xs font-bold tabular-nums text-background">
                  {r.home_score}–{r.away_score}
                </span>
                <span className={`min-w-0 flex-1 truncate ${awayWin ? "font-bold" : ""}`}>
                  {r.away}
                </span>
                <span className="hidden w-16 shrink-0 text-right text-xs text-muted-foreground sm:block">
                  {formatShortDay(r.kickoff_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function TableSnapshot() {
  const { t } = useTranslation("predictions");
  const keys = useAsync(() => fetchTableKeys(), []);
  const preferred = ["psl", "epl", "laliga", "seriea", "bundesliga", "ucl"];
  const rank = (k: string) => (preferred.includes(k) ? preferred.indexOf(k) : 99);
  const available = [...(keys.data ?? [])].sort((a, b) => rank(a) - rank(b));
  const [chosen, setChosen] = useState<string | null>(null);
  const key = chosen ?? available[0] ?? null;
  const table = useAsync(() => (key ? fetchStandings(key) : Promise.resolve([])), [key]);
  const name = (k: string) => competitions.find((c) => c.key === k)?.name ?? k;

  return (
    <section className="card-surface p-4 sm:p-5">
      <SectionHead title={t("hub.tables.title")} to="/tables" cta={t("hub.tables.cta")} />
      {available.length > 1 && (
        <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
          {available.slice(0, 6).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === key}
              onClick={() => setChosen(k)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                k === key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted"
              }`}
            >
              {name(k)}
            </button>
          ))}
        </div>
      )}
      {keys.loading || table.loading ? (
        <Skeleton rows={5} />
      ) : !key || !table.data?.length ? (
        <p className="text-sm text-muted-foreground">{t("hub.tables.empty")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="w-8 pb-2 font-semibold">#</th>
              <th className="pb-2 font-semibold">{t("hub.tables.team")}</th>
              <th className="w-10 pb-2 text-right font-semibold">{t("hub.tables.played")}</th>
              <th className="w-12 pb-2 text-right font-semibold">{t("hub.tables.points")}</th>
            </tr>
          </thead>
          <tbody>
            {table.data.slice(0, 5).map((row) => (
              <tr key={row.team} className="border-t border-border">
                <td className="py-2 font-display font-bold tabular-nums">{row.position}</td>
                <td className="truncate py-2">{row.team}</td>
                <td className="py-2 text-right tabular-nums text-muted-foreground">{row.played}</td>
                <td className="py-2 text-right font-bold tabular-nums">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function DuelsTeaser() {
  const { t } = useTranslation("predictions");
  const { data, loading } = useAsync(() => fetchDuels("open", undefined, 3), []);
  return (
    <section className="card-surface relative overflow-hidden p-4 sm:p-5">
      <Swords
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-4 size-28 rotate-12 text-primary/[0.07]"
      />
      <SectionHead title={t("hub.duels.title")} to="/duels" cta={t("hub.duels.cta")} />
      <p className="mb-3 text-sm text-muted-foreground">{t("hub.duels.body")}</p>
      {loading ? (
        <Skeleton rows={2} />
      ) : data?.length ? (
        <ul className="space-y-2">
          {data.map((d) => (
            <li key={d.id}>
              <Link
                to="/duels/$duelId"
                params={{ duelId: d.id }}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span className="min-w-0 truncate">
                  {d.fixture.home} v {d.fixture.away}
                </span>
                <span className="shrink-0 text-xs font-semibold text-primary">@{d.challenger}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">{t("hub.duels.empty")}</p>
      )}
    </section>
  );
}

export function LeadersTeaser() {
  const { t } = useTranslation("predictions");
  const { data, loading } = useAsync(() => fetchThisWeeksLeaders(5), []);
  return (
    <section className="card-surface p-4 sm:p-5">
      <SectionHead title={t("hub.leaders.title")} to="/leaderboards" cta={t("hub.leaders.cta")} />
      {loading ? (
        <Skeleton rows={4} />
      ) : data?.length ? (
        <ol className="space-y-1.5">
          {data.map((r, i) => (
            <li key={r.user_id} className="flex items-center gap-3 text-sm">
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {i + 1}
              </span>
              <Link
                to="/u/$username"
                params={{ username: r.username }}
                className="min-w-0 flex-1 truncate font-semibold hover:underline"
              >
                {r.username}
              </Link>
              <span className="text-xs tabular-nums text-muted-foreground">
                {t("hub.leaders.units", { units: formatUnits(r.units) })}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{t("hub.leaders.empty")}</p>
      )}
    </section>
  );
}
