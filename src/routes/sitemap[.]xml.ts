import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://puntr.co.za";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const today = new Date().toISOString().split("T")[0];

const entries: SitemapEntry[] = [
  // Core product pages – high priority for SA sports betting queries
  { path: "/", changefreq: "daily", priority: "1.0", lastmod: today },
  { path: "/predictions", changefreq: "hourly", priority: "0.95", lastmod: today },
  { path: "/results", changefreq: "hourly", priority: "0.9", lastmod: today },
  { path: "/leaderboards", changefreq: "daily", priority: "0.85", lastmod: today },
  { path: "/community", changefreq: "daily", priority: "0.85", lastmod: today },
  { path: "/insights", changefreq: "daily", priority: "0.85", lastmod: today },
  { path: "/pricing", changefreq: "weekly", priority: "0.8", lastmod: today },
  { path: "/how-it-works", changefreq: "monthly", priority: "0.75", lastmod: today },
  { path: "/support", changefreq: "monthly", priority: "0.7", lastmod: today },
  { path: "/about", changefreq: "monthly", priority: "0.6", lastmod: today },
  // Legal / trust pages (important for SA gambling compliance & YMYL)
  { path: "/privacy", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/terms", changefreq: "yearly", priority: "0.3", lastmod: today },
  { path: "/cookies", changefreq: "yearly", priority: "0.3", lastmod: today },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
