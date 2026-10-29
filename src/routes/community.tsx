import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Target } from "lucide-react";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { PickCard } from "@/components/pick-card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session";
import { headT } from "@/lib/i18n/head";
import { fetchFeed, type FeedPick, type FeedSort } from "@/lib/pick-data";

const PAGE = 20;

export const Route = createFileRoute("/community")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "community");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/community" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("ld.name"),
            description: t("ld.description"),
            url: "https://puntr.co.za/community",
            isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
          }),
        },
      ],
    };
  },
  component: Community,
});

const SORTS = ["new", "top", "mine"] as const;

function Feed({ sort }: { sort: FeedSort }) {
  const { t } = useTranslation("community");
  const { profile } = useSession();
  const [items, setItems] = useState<FeedPick[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (before?: string) => {
      setBusy(true);
      try {
        const page = await fetchFeed({ sort, userId: profile?.id, before, limit: PAGE });
        setItems((prev) => (before && prev ? [...prev, ...page] : page));
        setMore(page.length === PAGE);
        setFailed(false);
      } catch (error) {
        console.error("feed load failed", error);
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [sort, profile?.id],
  );

  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  if (failed) return <p className="card-surface p-5 text-sm text-destructive">{t("feed.error")}</p>;
  if (items === null) return <p className="text-sm text-muted-foreground">{t("feed.loading")}</p>;
  if (items.length === 0) {
    return (
      <p className="card-surface p-5 text-sm text-muted-foreground">{t(`feed.empty.${sort}`)}</p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 6) * 0.05 }}
        >
          <PickCard
            pick={p}
            fixture={p.fixture}
            teams={{ home: p.fixture?.home ?? "", away: p.fixture?.away ?? "" }}
            kickoff={p.fixture?.kickoff_at ?? p.created_at}
          />
        </motion.div>
      ))}
      {more && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void load(items[items.length - 1]?.created_at)}
        >
          {busy ? t("feed.loading") : t("feed.loadMore")}
        </Button>
      )}
    </div>
  );
}

function Community() {
  const { isSignedIn } = useSession();
  const { t } = useTranslation("community");
  const [sort, setSort] = useState<FeedSort>("new");

  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="card-surface mb-5 p-4">
        <div className="flex items-center gap-3">
          <span className="size-10 shrink-0 rounded-full bg-muted" />
          <Link
            to="/predictions"
            className="min-w-0 flex-1 truncate rounded-lg bg-muted px-4 py-2.5 text-left text-sm text-muted-foreground"
          >
            {t("composer.prompt")}
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/predictions"
            search={{ sport: "soccer" }}
            className="flex items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted"
          >
            <Target className="size-4 text-muted-foreground" /> {t("composer.soccer")}
          </Link>
          <Button asChild>
            <Link to="/predictions">{t("composer.post")}</Link>
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {SORTS.filter((s) => s !== "mine" || isSignedIn).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            aria-pressed={sort === s}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              sort === s ? "bg-ink text-ink-foreground" : "border border-border hover:bg-muted"
            }`}
          >
            {t(`tabs.${s}`)}
          </button>
        ))}
      </div>

      <Feed sort={sort} />
    </AppShell>
  );
}
