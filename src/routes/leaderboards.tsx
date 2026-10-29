import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { useSession } from "@/components/session";
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

const HOW = ["s1", "s2", "s3", "s4"] as const;

function rankClass(rank: number | null) {
  return rank === 1
    ? "bg-[oklch(0.85_0.16_90)] text-ink"
    : rank === 3
      ? "bg-[oklch(0.85_0.08_50)] text-ink"
      : "bg-muted";
}

function Leaderboards() {
  const { t } = useTranslation("leaderboards");
  const { profile } = useSession();
  const [which, setWhich] = useState<"this" | "last">("this");
  const weekStart = which === "this" ? currentWeekStart() : previousWeekStart(currentWeekStart());
  const range = weekRange(weekStart);
  const { data, failed, loading } = useAsync(() => fetchWeeklyBoard(weekStart), [weekStart]);

  const ranked = (data ?? []).filter((r) => r.eligible);
  const unranked = (data ?? []).filter((r) => !r.eligible);
  const mine: BoardRow | undefined = (data ?? []).find((r) => r.user_id === profile?.id);

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
      <PageHeading title={t("title")} subtitle={t("subtitle")} />
      {!PRIZES_ENABLED && (
        <p className="-mt-3 mb-5 text-sm font-semibold text-primary">{t("pride")}</p>
      )}

      <div className="mb-2 flex flex-wrap gap-2">
        {(["this", "last"] as const).map((w) => (
          <button
            key={w}
            onClick={() => setWhich(w)}
            aria-pressed={which === w}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              which === w ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {t(`week.${w}`)}
          </button>
        ))}
      </div>
      <p className="mb-6 text-xs text-muted-foreground tnum">{t("week.range", range)}</p>

      {profile ? (
        <div className="card-surface mb-6 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
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

      <section className="card-surface overflow-hidden">
        {failed && <p className="p-5 text-sm text-destructive">{t("error")}</p>}
        {!failed && !loading && (data ?? []).length === 0 && (
          <p className="p-5 text-sm text-muted-foreground">{t("empty")}</p>
        )}
        {ranked.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t("table.rank")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.tipster")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.units")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.roi")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.settled")}</th>
                  <th className="px-4 py-3 font-medium">{t("table.wins")}</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <motion.tr
                    key={r.user_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-border last:border-0 hover:bg-muted/50 ${
                      r.user_id === profile?.id ? "bg-primary-soft/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`grid size-7 place-items-center rounded-full text-xs font-bold tnum ${rankClass(r.rank)}`}
                      >
                        {r.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/u/$username"
                        params={{ username: r.username }}
                        className="font-semibold hover:underline"
                      >
                        {r.username}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary tnum">
                      {formatUnits(r.units)}
                    </td>
                    <td className="px-4 py-3 tnum">{pct(r.roi, 1)}</td>
                    <td className="px-4 py-3 tnum">{r.picks_settled}</td>
                    <td className="px-4 py-3 tnum">{r.wins}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {unranked.length > 0 && (
          <div className="border-t border-border">
            <h2 className="px-4 pt-4 text-sm font-semibold">{t("unrankedTitle")}</h2>
            <p className="px-4 pb-2 text-xs text-muted-foreground">
              {t("unrankedNote", { count: 10 })}
            </p>
            <ul className="divide-y divide-border">
              {unranked.map((r) => (
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
                  <span className="tnum text-muted-foreground">{formatUnits(r.units)}</span>
                  <span className="tnum text-muted-foreground">{r.picks_settled}</span>
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

      <section className="card-surface mt-6 p-6 text-center">
        <h2 className="text-2xl">{t("how.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("how.subtitle")}</p>
        <div className="mt-7 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((k) => (
            <div key={k}>
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                <Trophy className="size-5" />
              </span>
              <p className="mt-3 font-semibold">{t(`how.${k}.title`)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {t(`how.${k}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
