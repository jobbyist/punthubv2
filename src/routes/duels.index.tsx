import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChallengeDialog } from "@/components/duels/challenge-dialog";
import { DuelBoard } from "@/components/duels/duel-board";
import { DuelCard } from "@/components/duels/duel-card";
import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { FilterChips } from "@/components/match/filter-chips";
import { useSession } from "@/components/session";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { headT } from "@/lib/i18n/head";
import { fetchDuels, type DuelScope, type DuelSummary } from "@/lib/duels-data";

export const Route = createFileRoute("/duels/")({
  loader: async () => {
    try {
      return { fixtures: await fetchUpcomingFixtures({ days: 14, limit: 200 }) };
    } catch (error) {
      console.error("duels fixtures failed", error);
      return { fixtures: [] as UpcomingFixture[] };
    }
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "duels");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/duels" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: DuelsHub,
});

function DuelsHub() {
  const { t } = useTranslation("duels");
  const { user } = useSession();
  const { fixtures } = Route.useLoaderData();
  const [scope, setScope] = useState<DuelScope>("open");
  const [duels, setDuels] = useState<DuelSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setDuels(null);
    setFailed(false);
    fetchDuels(scope)
      .then((d) => live && setDuels(d))
      .catch((e: unknown) => {
        console.error("duels feed failed", e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [scope, user?.id]);

  const scopes: DuelScope[] = user
    ? ["open", "live", "settled", "mine"]
    : ["open", "live", "settled"];
  const open = fixtures.filter(
    (f) => Date.parse(f.kickoff_at) > Date.now() + 5 * 60_000 && f.status === "scheduled",
  );

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card-surface p-5 sm:p-6" aria-labelledby="how-title">
          <h2 id="how-title" className="text-lg">
            {t("how.title")}
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["s1", "s2", "s3", "s4"] as const).map((k, i) => (
              <li key={k} className="flex gap-3 text-sm text-muted-foreground">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span>{t(`how.${k}`)}</span>
              </li>
            ))}
          </ol>
          {open.length > 0 && (
            <div className="mt-5">
              <ChallengeDialog fixtures={open} />
            </div>
          )}
        </section>
        <DuelBoard />
      </div>

      <FilterChips
        id="duel-scope"
        className="mb-5"
        chips={scopes.map((s) => ({ key: s, label: t(`tabs.${s}`) }))}
        active={scope}
        onSelect={(k) => setScope(k as DuelScope)}
        label={t("tabs.label")}
      />

      {failed ? (
        <EmptyState art="podium" title={t("errors.generic")} body="" />
      ) : duels === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : duels.length === 0 ? (
        <EmptyState art="podium" title={t(`empty.${scope}`)} body="" />
      ) : (
        <MotionConfig reducedMotion="user">
          <LayoutGroup id="duels-grid">
            <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence initial={false} mode="popLayout">
                {duels.map((d) => (
                  <motion.li
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <DuelCard duel={d} />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </LayoutGroup>
        </MotionConfig>
      )}
    </AppShell>
  );
}
