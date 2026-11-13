import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { useAsync } from "@/hooks/use-async";
import { analytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchArticle, fetchArticleSources, fetchPublished, shareImage } from "@/lib/newsroom";

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
    const image = shareImage(loaderData);
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: /\bPuntr\b/.test(title) ? title : `${title} | Puntr` },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
        { property: "og:site_name", content: "Puntr" },
        { property: "og:locale", content: "en_ZA" },
        { property: "article:published_time", content: loaderData.published_at },
        {
          property: "article:modified_time",
          content: loaderData.updated_at ?? loaderData.published_at,
        },
        { property: "article:author", content: loaderData.author_name },
        { property: "article:section", content: loaderData.category },
        { name: "author", content: loaderData.author_name },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Newsroom",
                item: "https://puntr.co.za/newsroom",
              },
              { "@type": "ListItem", position: 3, name: loaderData.title, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: loaderData.title,
            description,
            datePublished: loaderData.published_at,
            dateModified: loaderData.updated_at ?? loaderData.published_at,
            inLanguage: "en-ZA",
            articleSection: loaderData.category,
            author: { "@type": "Person", name: loaderData.author_name },
            publisher: {
              "@type": "Organization",
              name: "Puntr",
              url: "https://puntr.co.za/",
              logo: { "@type": "ImageObject", url: "https://puntr.co.za/puntrlogo.png" },
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            image,
            ...(loaderData.tags?.length ? { keywords: loaderData.tags.join(", ") } : {}),
            isAccessibleForFree: true,
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
  const { data: sources } = useAsync(
    () => (a.origin === "ai" ? fetchArticleSources(a.slug) : Promise.resolve([])),
    [a.slug, a.origin],
  );
  const url = `https://puntr.co.za/newsroom/${a.slug}`;

  useEffect(() => {
    analytics.newsroomArticleViewed(a.slug);
  }, [a.slug]);

  const blocks = parseBody(a.body);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const enc = encodeURIComponent;

  return (
    <AppShell>
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
          <img
            src={a.cover_image_url}
            alt={a.title}
            width={1200}
            height={630}
            className="mt-6 h-auto w-full border border-border"
          />
        )}
        <p className="mt-6 text-lg font-medium">{a.excerpt}</p>
        <div className="mt-6 space-y-4 leading-relaxed">
          {blocks.map((b, i) =>
            b.type === "h2" ? (
              <h2 key={i} className="pt-4 text-2xl">
                {b.text}
              </h2>
            ) : b.type === "ul" ? (
              <ul key={i} className="list-disc space-y-1.5 pl-6">
                {b.items.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{b.text}</p>
            ),
          )}
        </div>

        {a.origin === "ai" && (
          <aside
            className="mt-10 border-t border-border pt-6 text-sm"
            aria-labelledby="sources-title"
          >
            <p className="font-semibold">{t("ai.label")}</p>
            {(sources ?? []).length > 0 && (
              <>
                <h2 id="sources-title" className="mt-3 text-base">
                  {t("ai.sources")}
                </h2>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {(sources ?? []).map((s) => (
                    <li key={s.ordinal}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-primary hover:underline"
                      >
                        {s.title}
                      </a>{" "}
                      <span className="text-muted-foreground">({s.domain})</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t("ai.note")}</p>
          </aside>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-sm">
          <span className="font-semibold">{t("share")}</span>
          {canNativeShare && (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                analytics.newsroomArticleShared(a.slug, "native");
                void navigator
                  .share({ title: a.title, text: a.excerpt, url })
                  .catch(() => undefined);
              }}
            >
              {t("shareNative")}
            </button>
          )}
          {[
            ["whatsapp", t("shareWhatsapp"), `https://wa.me/?text=${enc(`${a.title} ${url}`)}`],
            ["x", t("shareX"), `https://x.com/intent/tweet?text=${enc(a.title)}&url=${enc(url)}`],
            [
              "facebook",
              t("shareFacebook"),
              `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
            ],
            [
              "linkedin",
              t("shareLinkedin"),
              `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
            ],
            [
              "email",
              t("shareEmail"),
              `mailto:?subject=${enc(a.title)}&body=${enc(`${a.excerpt}\n\n${url}`)}`,
            ],
          ].map(([channel, label, href]) => (
            <a
              key={channel}
              className="text-primary hover:underline"
              href={href}
              target={channel === "email" ? undefined : "_blank"}
              rel="noreferrer noopener"
              onClick={() => analytics.newsroomArticleShared(a.slug, channel as string)}
            >
              {label}
            </a>
          ))}
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
    </AppShell>
  );
}

type Block =
  { type: "h2"; text: string } | { type: "p"; text: string } | { type: "ul"; items: string[] };

/**
 * Body is plain text, never HTML. Blank lines separate blocks; a block starting "## " is a heading and a block
 * whose lines all start "- " is a bullet list.
 */
function parseBody(body: string): Block[] {
  return body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .map((b): Block => {
      if (b.startsWith("## ")) return { type: "h2", text: b.slice(3).trim() };
      const lines = b.split("\n");
      if (lines.every((l) => l.startsWith("- "))) {
        return { type: "ul", items: lines.map((l) => l.slice(2).trim()) };
      }
      return { type: "p", text: lines.join(" ") };
    });
}
