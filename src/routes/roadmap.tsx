import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CircleDot, Clock, Languages, Gift, Smartphone, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { buildRoadmap, countLive, type RoadmapItem, type RoadmapStage } from "@/lib/roadmap";
import { getRoadmapStatus } from "@/lib/roadmap.functions";

export const Route = createFileRoute("/roadmap")({
  loader: () => getRoadmapStatus(),
  head: ({ match }) => {
    const t = headT(match.context.locale, "roadmap");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/roadmap" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: Roadmap,
});

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "9 Nov" from YYYY-MM-DD, with the year when it differs from the launch year. */
function shortDate(iso: string, launchYear: string): string {
  const [y, m, d] = iso.split("-");
  const base = `${Number(d)} ${SHORT_MONTHS[Number(m) - 1]}`;
  return y === launchYear ? base : `${base} ${y}`;
}

/** "4 to 10 Jan 2027": the year once, on the last day. */
function dateRange(from: string, to: string, launchYear: string) {
  return { from: shortDate(from, to.slice(0, 4)), to: shortDate(to, launchYear) };
}

const STAGE_STYLE: Record<RoadmapStage, string> = {
  live: "bg-primary text-primary-foreground",
  launching: "bg-primary-soft text-primary",
  inProgress: "bg-primary-soft text-primary",
  next: "bg-ink text-ink-foreground",
  planned: "bg-muted text-muted-foreground",
};

function StageIcon({ stage }: { stage: RoadmapStage }) {
  if (stage === "live") return <Check className="size-4" aria-hidden />;
  if (stage === "planned") return <Clock className="size-4" aria-hidden />;
  return <CircleDot className="size-4" aria-hidden />;
}

function SportRow({ item, launch, last }: { item: RoadmapItem; launch: string; last: boolean }) {
  const { t } = useTranslation("roadmap");
  const year = launch.slice(0, 4);
  const [w0, w1] = item.weeks;
  const weekLabel =
    w0 === 1
      ? t("week.launch")
      : w0 === w1
        ? t("week.single", { week: w0 })
        : t("week.range", { from: w0, to: w1 });
  const live = item.stage === "live";
  return (
    <li className="relative grid grid-cols-[28px_1fr] gap-4 sm:grid-cols-[136px_28px_1fr]">
      <div className="hidden pt-1 text-right sm:block">
        <p className="font-display text-sm font-extrabold">{weekLabel}</p>
        <p className="text-xs text-muted-foreground tnum">
          {t("dates", dateRange(item.from, item.to, year))}
        </p>
      </div>
      <div className="relative flex justify-center">
        <span
          className={`relative z-10 mt-1 grid size-7 place-items-center ${
            live
              ? "bg-primary text-primary-foreground"
              : "border-2 border-border bg-background text-muted-foreground"
          }`}
        >
          <StageIcon stage={item.stage} />
        </span>
        {!last && <span className="absolute bottom-[-24px] top-8 w-0.5 bg-border" aria-hidden />}
      </div>
      <div className={`card-surface mb-6 p-4 sm:p-5 ${live ? "border-primary/40" : ""}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg">{t(`sport.${item.sport}.name`)}</h3>
          <span
            className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STAGE_STYLE[item.stage]}`}
          >
            {item.stage === "launching"
              ? t("stage.launching", { date: shortDate(item.from, year) })
              : t(`stage.${item.stage}`)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground sm:hidden tnum">
          {weekLabel} · {t("dates", dateRange(item.from, item.to, year))}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t(`sport.${item.sport}.body`)}</p>
      </div>
    </li>
  );
}

const ALSO = [
  ["languages", Languages],
  ["rewards", Gift],
  ["pro", Sparkles],
  ["apps", Smartphone],
] as const;

function Roadmap() {
  const { t } = useTranslation("roadmap");
  const status = Route.useLoaderData();
  const items = buildRoadmap(status);
  const live = countLive(items);
  const onTheWay = items.length - live;

  return (
    <div className="mx-auto max-w-[920px] px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-2 text-3xl sm:text-[40px] sm:leading-[1.1]">{t("title")}</h1>
      <p className="mt-4 max-w-[680px] text-muted-foreground">
        {t("intro", { launch: formatDate(`${status.launch}T12:00:00+02:00`) })}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="font-semibold text-primary tnum">
          {t("summary.live", { count: live })}
        </span>
        <span className="font-semibold tnum">{t("summary.planned", { count: onTheWay })}</span>
        <span className="text-xs text-muted-foreground">
          {t("summary.checked", { time: formatDateTime(status.checkedAt) })}
        </span>
      </div>

      <section className="mt-10" aria-labelledby="roadmap-sports">
        <h2 id="roadmap-sports" className="sr-only">
          {t("sportsTitle")}
        </h2>
        <ol>
          {items.map((item, i) => (
            <SportRow
              key={item.sport}
              item={item}
              launch={status.launch}
              last={i === items.length - 1}
            />
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">{t("note")}</p>
      </section>

      <section className="mt-12" aria-labelledby="roadmap-also">
        <h2 id="roadmap-also" className="text-2xl">
          {t("alsoTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("alsoIntro")}</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {ALSO.map(([key, Icon]) => (
            <div key={key} className="card-surface flex gap-3 p-4">
              <span className="grid size-9 shrink-0 place-items-center bg-primary-soft text-primary">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <div>
                <h3 className="text-base">{t(`also.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`also.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 flex flex-col items-start justify-between gap-4 bg-ink p-6 text-ink-foreground sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl text-ink-foreground">{t("suggest.title")}</h2>
          <p className="mt-1 text-sm opacity-80">{t("suggest.body")}</p>
        </div>
        <Button asChild>
          <Link to="/support">{t("suggest.cta")}</Link>
        </Button>
      </section>
    </div>
  );
}
