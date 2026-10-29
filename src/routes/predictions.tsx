import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { SlidersHorizontal, Star, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AffiliateBanner } from "@/components/affiliate";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { GateValue, Locked } from "@/components/locked";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { featuredPredictions, popularPredictions } from "@/lib/mock-data";
import { headT } from "@/lib/i18n/head";
import { odds, pct } from "@/lib/format";

export const Route = createFileRoute("/predictions")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "predictions");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/predictions" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("title"),
            description: t("meta.description"),
            url: "https://puntr.co.za/predictions",
            isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
          }),
        },
      ],
    };
  },
  component: Predictions,
});

const FILTERS = ["all", "top", "today", "tomorrow", "week"] as const;

function Predictions() {
  const { isSignedIn } = useSession();
  const { t } = useTranslation("predictions");
  const { t: tc } = useTranslation("common");

  const cards = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {featuredPredictions.map((p, i) => (
        <motion.article
          key={p.home}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          whileHover={{ y: -3 }}
          className="card-surface p-4"
        >
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {p.league} • {p.kickoff}
            </span>
            <Star className="size-4 fill-primary text-primary" />
          </div>
          <div className="mt-4 flex items-center justify-around gap-2 text-center">
            <div className="min-w-0">
              <span className="mx-auto block size-10 rounded-full bg-ink" />
              <p className="mt-2 truncate text-sm font-semibold">{p.home}</p>
            </div>
            <span className="text-xs text-muted-foreground">{tc("vs")}</span>
            <div className="min-w-0">
              <span className="mx-auto block size-10 rounded-full bg-[oklch(0.8_0.16_85)]" />
              <p className="mt-2 truncate text-sm font-semibold">{p.away}</p>
            </div>
          </div>
          <div className="mt-4 border-t border-border pt-3">
            <p className="text-[11px] text-muted-foreground">{t("card.topPick")}</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{p.pick}</p>
              <GateValue className="text-sm font-bold text-primary tnum">{odds(p.odds)}</GateValue>
            </div>
            <p className="text-xs text-muted-foreground">{p.market}</p>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("card.confidence")}</span>
              <GateValue className="font-semibold tnum">{pct(p.confidence / 100)}</GateValue>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${p.confidence}%` }}
                transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            <span className="size-7 rounded-full bg-muted" />
            <span className="flex-1 truncate text-sm">{p.tipster}</span>
            <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
              {p.badge}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground tnum">
            {t("card.mostBacked")} · {t("card.backedCount", { count: p.backed })}
          </p>
          <Button variant="outline" className="mt-3 w-full">
            {t("card.view")}
          </Button>
        </motion.article>
      ))}
    </div>
  );

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              i === 0 ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {t(`filter.${f}`)}
          </button>
        ))}
        <span className="flex-1" />
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <SlidersHorizontal className="size-4" /> {t("filter.filters")}
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
          <TrendingUp className="size-4" /> {t("filter.trending")}
        </button>
      </div>

      <section className="card-surface mb-6 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg">{t("featured.title")}</h2>
          <span className="rounded-md bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
            {t("featured.curated")}
          </span>
          <span className="flex-1" />
          <button className="text-xs font-medium text-primary">{tc("action.viewAll")}</button>
        </div>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("featured.sample")}</p>
        {isSignedIn ? cards : <Locked intensity="md">{cards}</Locked>}
      </section>

      <AffiliateBanner />

      <section className="card-surface mt-6 overflow-hidden">
        <div className="flex items-center justify-between p-5 pb-3">
          <div>
            <h2 className="text-lg">{t("popular.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("popular.body")}</p>
          </div>
          <button className="text-xs font-medium text-primary">{tc("action.viewAll")}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-medium">{t("popular.match")}</th>
                <th className="px-3 py-2.5 font-medium">{t("popular.market")}</th>
                <th className="px-3 py-2.5 font-medium">{t("popular.tip")}</th>
                <th className="px-3 py-2.5 font-medium">{t("popular.odds")}</th>
                <th className="px-3 py-2.5 font-medium">{t("popular.conf")}</th>
                <th className="px-5 py-2.5 font-medium">{t("popular.backedBy")}</th>
              </tr>
            </thead>
            <tbody>
              {popularPredictions.map((r) => (
                <tr
                  key={r.match}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-5 py-3">
                    <p className="text-[11px] text-muted-foreground">{r.league}</p>
                    <p className="font-medium">{r.match}</p>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{r.market}</td>
                  <td className="px-3 py-3">{r.tip}</td>
                  <td className="px-3 py-3">
                    <GateValue className="rounded-md bg-primary-soft px-2 py-1 text-xs font-semibold text-primary tnum">
                      {odds(r.odds)}
                    </GateValue>
                  </td>
                  <td className="px-3 py-3">
                    <GateValue className="font-semibold text-primary tnum">
                      {pct(r.conf / 100)}
                    </GateValue>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground tnum">{r.backed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
