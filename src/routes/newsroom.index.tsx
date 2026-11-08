import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/app-shell";
import { analytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import {
  fetchPublished,
  isCategory,
  NEWSROOM_CATEGORIES,
  type NewsroomCategory,
} from "@/lib/newsroom";

export const Route = createFileRoute("/newsroom/")({
  validateSearch: (search: Record<string, unknown>): { category?: NewsroomCategory } =>
    isCategory(search["category"]) ? { category: search["category"] } : {},
  loader: async () => ({ articles: await fetchPublished({}).catch(() => null) }),
  head: ({ match, loaderData }) => {
    const t = headT(match.context.locale, "newsroom");
    const articles = loaderData?.articles ?? [];
    return {
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("meta.ogTitle"),
            url: "https://puntr.co.za/newsroom",
            description: t("meta.description"),
            publisher: { "@type": "Organization", name: "Puntr", url: "https://puntr.co.za/" },
            hasPart: articles.map((a) => ({
              "@type": "NewsArticle",
              headline: a.title,
              url: `https://puntr.co.za/newsroom/${a.slug}`,
              datePublished: a.published_at,
              author: { "@type": "Person", name: a.author_name },
            })),
          }),
        },
      ],
      links: [{ rel: "canonical", href: "https://puntr.co.za/newsroom" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://puntr.co.za/newsroom" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: Newsroom,
});

function Newsroom() {
  const { t } = useTranslation("newsroom");
  const { category } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { articles } = Route.useLoaderData();
  const failed = articles === null;
  const data = category
    ? (articles ?? []).filter((a) => a.category === category)
    : (articles ?? []);

  useEffect(() => {
    analytics.newsroomViewed();
  }, []);

  const [featured, ...rest] = data;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-[clamp(2.2rem,6vw,3.6rem)] leading-[1.05]">{t("title")}</h1>
        <p className="mt-4 max-w-[640px] text-muted-foreground">{t("lead")}</p>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={t("eyebrow")}>
          {[undefined, ...NEWSROOM_CATEGORIES].map((c) => {
            const active = c === category;
            return (
              <button
                key={c ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  if (c) analytics.newsroomCategorySelected(c);
                  void navigate({ search: c ? { category: c } : {} });
                }}
                className={`border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c ? t(`cat.${c}`) : t("all")}
              </button>
            );
          })}
        </div>

        {(failed || data.length === 0) && (
          <p className="mt-10 text-muted-foreground">
            {failed ? t("error") : category ? t("emptyCat") : t("empty")}
          </p>
        )}

        {featured && (
          <article className="mt-10 border border-border p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {t("featured")} · {t(`cat.${featured.category}`)}
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl">
              <Link
                to="/newsroom/$slug"
                params={{ slug: featured.slug }}
                className="hover:underline"
              >
                {featured.title}
              </Link>
            </h2>
            <p className="mt-3 max-w-[680px] text-muted-foreground">{featured.excerpt}</p>
            <p className="mt-4 text-xs text-muted-foreground tnum">
              {formatDate(featured.published_at)} · {t("by", { author: featured.author_name })}
            </p>
            <Link
              to="/newsroom/$slug"
              params={{ slug: featured.slug }}
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {t("readMore")}
            </Link>
          </article>
        )}

        {rest.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {rest.map((a) => (
              <article key={a.id} className="flex flex-col border border-border p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  {t(`cat.${a.category}`)}
                </p>
                <h3 className="mt-2 text-lg leading-snug">
                  <Link to="/newsroom/$slug" params={{ slug: a.slug }} className="hover:underline">
                    {a.title}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
                <p className="mt-3 text-xs text-muted-foreground tnum">
                  {formatDate(a.published_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
