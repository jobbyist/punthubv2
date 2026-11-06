import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { formatDate } from "@/lib/format";
import { fetchPublished } from "@/lib/newsroom";

/** Homepage section: the three most recent published Newsroom articles. Renders nothing until there is one. */
export function LatestFromPuntr() {
  const { t } = useTranslation("newsroom");
  const { data } = useAsync(() => fetchPublished({ limit: 3 }).catch(() => []), []);
  if (!data || data.length === 0) return null;
  return (
    <section className="card-surface mt-8 p-6 sm:p-8" aria-labelledby="latest-from-puntr">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("home.eyebrow")}
      </p>
      <h2 id="latest-from-puntr" className="mt-2 text-2xl">
        {t("home.title")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{t("home.lead")}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {data.map((a) => (
          <article key={a.id} className="flex flex-col rounded-xl border border-border p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {t(`cat.${a.category}`)}
            </p>
            <h3 className="mt-2 text-base font-bold leading-snug">{a.title}</h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{a.excerpt}</p>
            <p className="mt-3 text-xs text-muted-foreground tnum">{formatDate(a.published_at)}</p>
            <Link
              to="/newsroom/$slug"
              params={{ slug: a.slug }}
              className="mt-2 text-sm font-semibold text-primary hover:underline"
            >
              {t("readMore")}
            </Link>
          </article>
        ))}
      </div>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/newsroom">{t("home.cta")}</Link>
      </Button>
    </section>
  );
}
