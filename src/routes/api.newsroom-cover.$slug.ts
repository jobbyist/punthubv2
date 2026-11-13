import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

/**
 * Cover image for a published newsroom article, drawn from its title, category, standfirst and date.
 * Only published articles are served (the public client respects the newsroom's RLS).
 */
export const Route = createFileRoute("/api/newsroom-cover/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const slug = String(params.slug).replace(/\.svg$/, "");
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
          return new Response("not found", { status: 404 });
        const { fetchArticle } = await import("@/lib/newsroom");
        const article = await fetchArticle(slug).catch(() => null);
        if (!article) return new Response("not found", { status: 404 });
        const { coverSvg } = await import("@/lib/newsroom-cover");
        const { coverAssets } = await import("@/lib/newsroom-cover-assets.server");
        const svg = coverSvg(
          {
            title: article.title,
            category: article.category,
            excerpt: article.excerpt,
            date: article.published_at,
          },
          coverAssets(),
        );
        return new Response(svg, {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:",
          },
        });
      },
    },
  },
});
