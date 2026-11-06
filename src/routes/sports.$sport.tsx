import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/app-shell";
import { LiveBadge } from "@/components/live-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { buildRoadmap, SPORT_ROADMAP, type RoadmapSport } from "@/lib/roadmap";
import { getRoadmapStatus } from "@/lib/roadmap.functions";

const SPORTS = SPORT_ROADMAP.map((s) => s.sport);
const isSport = (v: string): v is RoadmapSport => (SPORTS as readonly string[]).includes(v);

export const Route = createFileRoute("/sports/$sport")({
  loader: async ({ params }) => {
    if (!isSport(params.sport)) throw notFound();
    return { status: await getRoadmapStatus(), sport: params.sport };
  },
  head: ({ match, params }) => {
    if (!isSport(params.sport)) return {};
    const t = headT(match.context.locale, "sports");
    const url = `https://puntr.co.za/sports/${params.sport}`;
    const title = t(`items.${params.sport}.metaTitle`);
    const description = t(`items.${params.sport}.metaDescription`);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                name: title,
                description,
                url,
                inLanguage: "en-ZA",
                about: { "@type": "Thing", name: t(`items.${params.sport}.name`) },
                isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: t("breadcrumb"),
                    item: "https://puntr.co.za/roadmap",
                  },
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: t(`items.${params.sport}.name`),
                    item: url,
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: SportPage,
});

function SportPage() {
  const { t } = useTranslation("sports");
  const { status, sport } = Route.useLoaderData();
  const items = buildRoadmap(status);
  const item = items.find((i) => i.sport === sport);
  const k = (key: string) => `items.${sport}.${key}`;
  const name = t(k("name"));
  const live = item?.stage === "live";
  const weeks =
    item && item.weeks[0] !== item.weeks[1]
      ? `${item.weeks[0]} to ${item.weeks[1]}`
      : String(item?.weeks[0] ?? 1);
  const list = (key: string) => t(k(key), { returnObjects: true }) as unknown as string[];

  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Puntr
        </Link>{" "}
        /{" "}
        <Link to="/roadmap" className="hover:underline">
          {t("breadcrumb")}
        </Link>{" "}
        / <span aria-current="page">{name}</span>
      </nav>

      <header className="border-b border-border pb-6">
        <h1 className="text-3xl sm:text-4xl">{name}</h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-primary">
          {live ? (
            <>
              <LiveBadge /> {t("status.live")}
            </>
          ) : item?.stage === "launching" ? (
            t("status.launching", { date: formatDate(`${status.launch}T12:00:00+02:00`) })
          ) : item ? (
            t("status.window", {
              from: formatDate(`${item.from}T12:00:00+02:00`),
              to: formatDate(`${item.to}T12:00:00+02:00`),
            })
          ) : null}
        </p>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t(k("intro"))}</p>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <article className="space-y-8">
          <section>
            <h2 className="text-xl">{t("sections.sa")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(k("sa"))}</p>
          </section>
          <section>
            <h2 className="text-xl">{t("sections.engine")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(k("engine"))}</p>
          </section>
          <section>
            <h2 className="text-xl">{t("sections.when")}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {live || sport === "soccer"
                ? t("whenBodyLive", { name })
                : t("whenBody", {
                    name,
                    weeks,
                    launch: formatDate(`${status.launch}T12:00:00+02:00`),
                  })}
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            {sport === "soccer" ? (
              <Button asChild>
                <Link to="/predictions">{t("cta.predictions")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/join">{t("cta.join")}</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/roadmap">{t("cta.roadmap")}</Link>
            </Button>
          </div>
        </article>

        <aside className="space-y-6">
          <section className="card-surface p-5">
            <h2 className="text-base">{t("sections.competitions")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {list("competitions").map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="card-surface p-5">
            <h2 className="text-base">{t("sections.markets")}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {list("markets").map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section className="card-surface p-5">
            <h2 className="text-base">{t("others")}</h2>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm">
              {SPORTS.filter((s) => s !== sport).map((s) => (
                <li key={s}>
                  <Link
                    to="/sports/$sport"
                    params={{ sport: s }}
                    className="text-primary hover:underline"
                  >
                    {t(`items.${s}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">{t("disclaimer")}</p>
    </AppShell>
  );
}
