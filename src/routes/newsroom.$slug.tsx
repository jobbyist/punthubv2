import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAsync } from "@/hooks/use-async";
import { analytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchArticle, fetchPublished } from "@/lib/newsroom";

export const Route = createFileRoute("/newsroom/$slug")({
  loader: async ({ params }) => {
    const article = await fetchArticle(params.slug).catch(() => null);
    if (!article) throw notFound();
    return article;
  },
  head: ({ match, loaderData }) => {
    const t = headT(match.context.locale, "newsroom");
    if (!loaderData) return { meta: [{ title: t("meta.title") }] };
    const url = `https://puntr.co.za/newsroom/${loaderData.slug}`;
    const title = loaderData.seo_title || loaderData.title;
    const description = loaderData.seo_description || loaderData.excerpt;
    const image = loaderData.og_image_url || loaderData.cover_image_url || undefined;
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: `${title} | Puntr` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { property: "article:published_time", content: loaderData.published_at },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: loaderData.title,
            description,
            datePublished: loaderData.published_at,
            author: { "@type": "Organization", name: loaderData.author_name },
            publisher: { "@type": "Organization", name: "Puntr", url: "https://puntr.co.za/" },
            mainEntityOfPage: url,
            ...(image ? { image } : {}),
          }),
        },
      ],
    };
  },
  notFoundComponent: NotFound,
  component: Article,
});

function NotFound() {
  const { t } = useTranslation("newsroom");
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 text-center">
      <p className="text-muted-foreground">{t("notFound")}</p>
      <Link to="/newsroom" className="mt-4 inline-block font-semibold text-primary hover:underline">
        {t("back")}
      </Link>
    </div>
  );
}

function Article() {
  const { t } = useTranslation("newsroom");
  const a = Route.useLoaderData();
  const { data: others } = useAsync(
    () => fetchPublished({ category: a.category, limit: 4 }).catch(() => []),
    [a.category],
  );
  const related = (others ?? []).filter((o) => o.slug !== a.slug).slice(0, 3);
  const url = `https://puntr.co.za/newsroom/${a.slug}`;

  useEffect(() => {
    analytics.newsroomArticleViewed(a.slug);
  }, [a.slug]);

  // Body is plain text: blank lines separate paragraphs. It is never rendered as HTML.
  const paragraphs = a.body.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  return (
    <article className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 sm:py-14">
      <Link to="/newsroom" className="text-sm font-semibold text-primary hover:underline">
        {t("back")}
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-primary">
        {t(`cat.${a.category}`)}
      </p>
      <h1 className="mt-3 text-[clamp(2rem,5vw,3rem)] leading-[1.1]">{a.title}</h1>
      <p className="mt-4 text-sm text-muted-foreground tnum">
        {formatDate(a.published_at)} · {t("by", { author: a.author_name })}
      </p>
      {a.cover_image_url && (
        <img src={a.cover_image_url} alt="" className="mt-6 w-full border border-border" />
      )}
      <p className="mt-6 text-lg font-medium">{a.excerpt}</p>
      <div className="mt-6 space-y-4 leading-relaxed">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-sm">
        <span className="font-semibold">{t("share")}</span>
        <a
          className="text-primary hover:underline"
          href={`https://wa.me/?text=${encodeURIComponent(`${a.title} ${url}`)}`}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => analytics.newsroomArticleShared(a.slug, "whatsapp")}
        >
          {t("shareWhatsapp")}
        </a>
        <a
          className="text-primary hover:underline"
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(a.title)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer noopener"
          onClick={() => analytics.newsroomArticleShared(a.slug, "x")}
        >
          {t("shareX")}
        </a>
        <button
          type="button"
          className="text-primary hover:underline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success(t("copied"));
              analytics.newsroomArticleShared(a.slug, "copy");
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          {t("copyLink")}
        </button>
      </div>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl">{t("related")}</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to="/newsroom/$slug"
                  params={{ slug: r.slug }}
                  className="font-semibold hover:underline"
                >
                  {r.title}
                </Link>
                <span className="ml-2 text-xs text-muted-foreground tnum">
                  {formatDate(r.published_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
