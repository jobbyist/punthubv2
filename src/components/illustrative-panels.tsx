import { Clock3, Newspaper, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { TeamLogo } from "@/components/team-logo";

const SAMPLE_FIXTURES = [
  { home: "Orlando Pirates", away: "Kaizer Chiefs", sport: "soccer", competition: "Betway Premiership", time: "19:30 SAST" },
  { home: "Arsenal", away: "Liverpool", sport: "soccer", competition: "Premier League", time: "18:30 SAST" },
  { home: "Real Madrid", away: "Bayern Munich", sport: "soccer", competition: "UEFA Champions League", time: "03:00 SAST" },
  { home: "South Africa", away: "New Zealand", sport: "rugby", competition: "International Rugby", time: "17:00 SAST" },
  { home: "Golden State Warriors", away: "Boston Celtics", sport: "basketball", competition: "NBA", time: "02:30 SAST" },
  { home: "South Africa", away: "India", sport: "cricket", competition: "International Cricket", time: "10:00 SAST" },
] as const;

const SAMPLE_LEADERS = [
  { name: "CapeTownCall", units: "34.2", roi: "+22.4%", picks: "18" },
  { name: "SowetoScout", units: "29.8", roi: "+18.7%", picks: "16" },
  { name: "DurbanData", units: "26.4", roi: "+16.1%", picks: "15" },
  { name: "MzansiMind", units: "23.1", roi: "+13.8%", picks: "14" },
  { name: "JoziTactician", units: "20.6", roi: "+11.2%", picks: "12" },
];

const SAMPLE_TREND = [
  { round: "R1", accuracy: 44 },
  { round: "R2", accuracy: 51 },
  { round: "R3", accuracy: 48 },
  { round: "R4", accuracy: 57 },
  { round: "R5", accuracy: 61 },
  { round: "R6", accuracy: 58 },
];

const SAMPLE_STORIES = [
  { source: "SuperSport", title: "Example: team news and selection update" },
  { source: "BBC Sport", title: "Example: competition form and fixture context" },
  { source: "ESPN", title: "Example: analysis and wider sports headlines" },
];

/** Static design-preview content only. Never treat these fixtures, people, metrics or stories as live data. */
export function IllustrativeFixtures() {
  const { t } = useTranslation("common");

  return (
    <section className="mb-8" aria-labelledby="illustrative-fixtures-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {t("illustrative.badge")}
          </p>
          <h2 id="illustrative-fixtures-title" className="mt-1 text-xl">
            {t("illustrative.fixtures.title")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("illustrative.fixtures.body")}
          </p>
        </div>
        <span className="border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          {t("illustrative.badge")}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SAMPLE_FIXTURES.map((fixture, index) => (
          <article className="card-surface min-w-0 p-4" key={fixture.competition + fixture.home}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                {t("sport." + fixture.sport)}
              </span>
              <span className="truncate text-[10px] text-muted-foreground">
                {fixture.competition}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                <TeamLogo team={fixture.home} size="lg" />
                <span className="line-clamp-2 text-xs font-semibold">{fixture.home}</span>
              </div>
              <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                {t("vs")}
              </span>
              <div className="flex min-w-0 flex-col items-center gap-2 text-center">
                <TeamLogo team={fixture.away} size="lg" />
                <span className="line-clamp-2 text-xs font-semibold">{fixture.away}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
              <span className="text-muted-foreground">{t("illustrative.fixtures.kickoff")}</span>
              <span className="font-semibold tabular-nums">{fixture.time}</span>
            </div>
            <span className="sr-only">{t("illustrative.badge")} {index + 1}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

/** A separate sample board; the live weekly leaderboard continues to use Supabase data. */
export function IllustrativeLeaderboard() {
  const { t } = useTranslation("common");

  return (
    <section className="card-surface mb-6 overflow-hidden" aria-labelledby="illustrative-board-title">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
            {t("illustrative.badge")}
          </p>
          <h2 id="illustrative-board-title" className="mt-1 text-lg">
            {t("illustrative.leaderboard.title")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("illustrative.leaderboard.body")}
          </p>
        </div>
        <span className="border border-primary/30 bg-primary-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
          {t("illustrative.badge")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
              <th className="px-4 py-3 font-medium">{t("illustrative.leaderboard.rank")}</th>
              <th className="px-4 py-3 font-medium">{t("illustrative.leaderboard.member")}</th>
              <th className="px-4 py-3 font-medium">{t("illustrative.leaderboard.units")}</th>
              <th className="px-4 py-3 font-medium">{t("illustrative.leaderboard.roi")}</th>
              <th className="px-4 py-3 font-medium">{t("illustrative.leaderboard.picks")}</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_LEADERS.map((member, index) => (
              <tr key={member.name} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <span className="grid size-7 place-items-center rounded-full bg-muted text-xs font-bold tabular-nums">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{member.name}</td>
                <td className="px-4 py-3 font-semibold text-primary tabular-nums">{member.units}</td>
                <td className="px-4 py-3 tabular-nums">{member.roi}</td>
                <td className="px-4 py-3 tabular-nums">{member.picks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Static charts and source cards for product preview; no real match stats or external news are queried. */
export function IllustrativeInsights() {
  const { t } = useTranslation("common");

  return (
    <section className="mb-8 space-y-5" aria-labelledby="illustrative-insights-title">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
          {t("illustrative.badge")}
        </p>
        <h2 id="illustrative-insights-title" className="mt-1 text-xl">
          {t("illustrative.insights.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("illustrative.insights.body")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("illustrative.insights.matches"), value: "24", icon: TrendingUp },
          { label: t("illustrative.insights.competitions"), value: "5", icon: Newspaper },
          { label: t("illustrative.insights.form"), value: "61%", icon: Clock3 },
        ].map(({ label, value, icon: Icon }) => (
          <div className="card-surface flex items-center gap-3 p-4" key={label}>
            <span className="grid size-10 shrink-0 place-items-center bg-primary-soft text-primary">
              <Icon className="size-5" />
            </span>
            <div>
              <p className="font-display text-2xl font-extrabold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card-surface min-w-0 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base">{t("illustrative.insights.chartTitle")}</h3>
            <span className="bg-primary-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
              {t("illustrative.badge")}
            </span>
          </div>
          <div className="mt-4 h-[230px] w-full" role="img" aria-label={t("illustrative.insights.chartNote")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAMPLE_TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="round" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value: number) => String(value) + "%"}
                />
                <Tooltip
                  formatter={(value) => [String(value) + "%", t("illustrative.insights.accuracy")]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="accuracy" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("illustrative.insights.chartNote")}</p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4 text-primary" />
            <h3 className="text-base">{t("illustrative.insights.newsTitle")}</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {t("illustrative.insights.newsBody")}
          </p>
          <ul className="mt-4 divide-y divide-border">
            {SAMPLE_STORIES.map((story) => (
              <li key={story.source} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{story.source}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide text-primary">
                    {t("illustrative.insights.sourcePreview")}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium">{t("illustrative.insights.stories." + story.source.toLowerCase().replace(" ", ""))}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-start gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <Clock3 className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>{t("illustrative.insights.refresh")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
