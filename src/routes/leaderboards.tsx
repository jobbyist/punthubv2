import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardCheck, Flame, PencilLine, Target, TrendingUp, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";
import { IllustrativeLeaderboard } from "@/components/illustrative-panels";
import { Podium, RankRow } from "@/components/leader-board";
import { LaunchGate } from "@/components/launch-gate";
import { DuelBoard } from "@/components/duels/duel-board";
import { PointsBoard } from "@/components/points-board";
import { useSession } from "@/components/session";
import { Blurred, FoundingGateCard, useGated } from "@/components/intel/guest-gate";
import { FilterChips } from "@/components/match/filter-chips";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { PRIZES_ENABLED } from "@/lib/flags";
import { formatUnits, pct } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { currentWeekStart } from "@/lib/pick-data";
import {
  fetchWeeklyBoard,
  picksNeeded,
  previousWeekStart,
  weekRange,
  type BoardRow,
} from "@/lib/records";

export const Route = createFileRoute("/leaderboards")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "leaderboards");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/leaderboards" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Leaderboards,
});

const HOW = [
  ["s1", PencilLine],
  ["s2", ClipboardCheck],
  ["s3", TrendingUp],
  ["s4", Trophy],
] as const;

function Leaderboards() {
  const { t } = useTranslation("leaderboards");
  const { profile } = useSession();
  const [which, setWhich] = useState<"this" | "last">("this");
  const weekStart = which === "this" ? currentWeekStart() : previousWeekStart(currentWeekStart());
  const range = weekRange(weekStart);
  const { data, failed, loading } = useAsync(() => fetchWeeklyBoard(weekStart), [weekStart]);

  const ranked = (data ?? []).filter((r) => r.eligible);
  const unranked = (data ?? []).filter((r) => !r.eligible);
  const gated = useGated();
  const mine: BoardRow | undefined = (data ?? []).find((r) => r.user_id === profile?.id);
  const topUnits = Math.max(0, ...ranked.map((r) => Number(r.units)));

  const stats = [
    {
      icon: Trophy,
      label: t("you.rank"),
      value: mine?.rank ? `#${mine.rank}` : "-",
      sub: mine ? (mine.rank ? "" : t("you.unranked")) : "",
    },
    { icon: Zap, label: t("you.units"), value: mine ? formatUnits(mine.units) : "-", sub: "" },
    { icon: Target, label: t("you.roi"), value: mine ? pct(mine.roi, 1) : "-", sub: "" },
    {
      icon: Flame,
      label: t("you.settled"),
      value: mine ? String(mine.picks_settled) : "-",
      sub: mine && !mine.eligible ? t("you.needs", { count: picksNeeded(mine.picks_settled) }) : "",
    },
  ];

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />
      <IllustrativeLeaderboard />
      {!PRIZES_ENABLED && <p className="mt-3 text-sm font-semibold text-primary">{t("pride")}</p>}

      <div className="my-10">
        <LaunchGate feature={t("points.title")}>
          <PointsBoard />
        </LaunchGate>
      </div>

      <DuelBoard className="mb-10" />

      <h2 className="mb-4 text-xl">{t("weekly.title")}</h2>
      <FilterChips
        id="weekly-board"
        className="mb-2"
        chips={(["this", "last"] as const).map((w) => ({ key: w, label: t(`week.${w}`) }))}
        active={which}
        onSelect={(k) => setWhich(k === "last" ? "last" : "this")}
        label={t("weekly.title")}
      />
      <p className="mb-6 text-xs text-muted-foreground tnum">{t("week.range", range)}</p>

      {profile ? (
        <div className="card-surface mb-6 grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-extrabold tnum">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
                {sub && <p className="text-[11px] text-primary">{sub}</p>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-surface mb-6 flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm">{t("you.signIn")}</p>
          <Button asChild size="sm">
            <Link to="/join">{t("you.signInCta")}</Link>
          </Button>
        </div>
      )}

      <section className="card-surface relative overflow-hidden">
        {gated(ranked.length + unranked.length - 1) && <FoundingGateCard top="9rem" />}
        {failed && <p className="p-5 text-sm text-destructive">{t("error")}</p>}
        {loading && (
          <div className="space-y-3 p-5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="puntr-shimmer h-12 rounded-lg" />
            ))}
          </div>
        )}
        {!loading && !failed && (data ?? []).length === 0 && (
          <EmptyState
            art="podium"
            className="rounded-none border-0 shadow-none"
            title={t("emptyTitle")}
            body={t("empty")}
          />
        )}
        {ranked.length >= 3 && !gated(2) && (
          <Podium
            unit={t("table.units").toLowerCase()}
            entries={ranked.slice(0, 3).map((r) => ({
              name: r.username,
              value: formatUnits(r.units),
              sub: pct(r.roi, 1),
            }))}
          />
        )}
        {ranked.length > 0 && (
          <ol className="divide-y divide-border border-t border-border">
            {ranked.map((r, i) => (
              <RankRow
                key={r.user_id}
                rank={r.rank}
                index={i}
                name={r.username}
                highlight={r.user_id === profile?.id}
                nameSlot={
                  <Link
                    to="/u/$username"
                    params={{ username: r.username }}
                    className="hover:underline"
                  >
                    {r.username}
                  </Link>
                }
                primary={<Blurred gated={gated(i)}>{formatUnits(r.units)}</Blurred>}
                {...(gated(i) || topUnits <= 0 ? {} : { share: Math.max(0, r.units) / topUnits })}
                stats={[
                  {
                    label: t("table.roi"),
                    value: <Blurred gated={gated(i)}>{pct(r.roi, 1)}</Blurred>,
                  },
                  {
                    label: t("table.settled"),
                    value: <Blurred gated={gated(i)}>{r.picks_settled}</Blurred>,
                  },
                  { label: t("table.wins"), value: <Blurred gated={gated(i)}>{r.wins}</Blurred> },
                ]}
              />
            ))}
          </ol>
        )}

        {unranked.length > 0 && (
          <div className="border-t border-border">
            <h2 className="px-4 pt-4 text-sm font-semibold">{t("unrankedTitle")}</h2>
            <p className="px-4 pb-2 text-xs text-muted-foreground">
              {t("unrankedNote", { count: 10 })}
            </p>
            <ul className="divide-y divide-border">
              {unranked.map((r, j) => (
                <li
                  key={r.user_id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                >
                  <Link
                    to="/u/$username"
                    params={{ username: r.username }}
                    className="font-medium hover:underline"
                  >
                    {r.username}
                  </Link>
                  <Blurred gated={gated(ranked.length + j)}>
                    <span className="tnum text-muted-foreground">{formatUnits(r.units)}</span>{" "}
                    <span className="tnum text-muted-foreground">{r.picks_settled}</span>
                  </Blurred>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {t("table.needs", { count: picksNeeded(r.picks_settled) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          {t("rules")}
        </p>
      </section>

      <section className="card-surface mt-10 p-5 sm:p-6" aria-labelledby="tipster-support-title">
        <h2 id="tipster-support-title" className="text-lg">
          {t("tipSupport.title")}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {t("tipSupport.body")}
        </p>
      </section>

      <section className="card-surface mt-10 p-6 text-center sm:p-8">
        <h2 className="text-2xl">{t("how.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("how.subtitle")}</p>
        <div className="relative mt-8">
          <span
            className="puntr-grow-x absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-primary/30 lg:block"
            aria-hidden="true"
          />
          <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW.map(([k, Icon], i) => (
              <li key={k} className="puntr-rise relative" style={{ ["--i" as string]: i }}>
                <span className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary ring-4 ring-card">
                  <Icon className="size-5" />
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-bold text-ink-foreground">
                    {i + 1}
                  </span>
                </span>
                <p className="mt-3 font-semibold">{t(`how.${k}.title`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t(`how.${k}.body`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </AppShell>
  );
}
