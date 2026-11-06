import { Clock3, Newspaper, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SAMPLE_TREND = [
  { round: "R1", accuracy: 44 },
  { round: "R2", accuracy: 51 },
  { round: "R3", accuracy: 48 },
  { round: "R4", accuracy: 57 },
  { round: "R5", accuracy: 61 },
  { round: "R6", accuracy: 58 },
];

const SAMPLE_STORIES = [
  { source: "SuperSport", key: "supersport" },
  { source: "BBC Sport", key: "bbcsport" },
  { source: "ESPN", key: "espn" },
];

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
        <p className="mt-1 text-sm text-muted-foreground">{t("illustrative.insights.body")}</p>
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
          <div
            className="mt-4 h-[230px] w-full"
            role="img"
            aria-label={t("illustrative.insights.chartNote")}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SAMPLE_TREND} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
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
          <p className="mt-2 text-xs text-muted-foreground">
            {t("illustrative.insights.chartNote")}
          </p>
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
                <p className="mt-1 text-sm font-medium">
                  {t("illustrative.insights.stories." + story.key)}
                </p>
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
