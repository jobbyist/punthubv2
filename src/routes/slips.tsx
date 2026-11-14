import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { FilterChips } from "@/components/match/filter-chips";
import { useSession } from "@/components/session";
import { SlipCard } from "@/components/slips/slip-card";
import { SlipEditor } from "@/components/slips/slip-editor";
import { Button } from "@/components/ui/button";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { headT } from "@/lib/i18n/head";
import {
  deleteSlip,
  fetchSlips,
  publishSlip,
  setShowStake,
  slipErrorKey,
  type SlipView,
} from "@/lib/slips/slips-data";

type Tab = "community" | "mine" | "new";

export const Route = createFileRoute("/slips")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    s["tab"] === "mine" || s["tab"] === "new" || s["tab"] === "community" ? { tab: s["tab"] } : {},
  loader: async () => {
    try {
      return { fixtures: await fetchUpcomingFixtures({ days: 14, limit: 400 }) };
    } catch (error) {
      console.error("slips fixtures failed", error);
      return { fixtures: [] as UpcomingFixture[] };
    }
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "slips");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/slips" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: SlipsPage,
});

function SlipsPage() {
  const { t } = useTranslation("slips");
  const { user } = useSession();
  const { fixtures } = Route.useLoaderData();
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? (user ? "mine" : "community"));
  const [slips, setSlips] = useState<SlipView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const open = fixtures.filter(
    (f) => f.status === "scheduled" && Date.parse(f.kickoff_at) > Date.now() + 60_000,
  );

  const load = useCallback((scope: "community" | "mine") => {
    setSlips(null);
    setFailed(false);
    fetchSlips(scope)
      .then(setSlips)
      .catch((e: unknown) => {
        console.error("slips feed failed", e);
        setFailed(true);
      });
  }, []);

  useEffect(() => {
    if (tab !== "new" && (tab === "community" || user)) load(tab);
  }, [tab, user?.id, load]);

  async function act(id: string, fn: () => Promise<unknown>, okKey?: string) {
    setBusy(id);
    try {
      await fn();
      if (okKey) toast.success(t(okKey));
      if (tab !== "new") load(tab);
    } catch (e) {
      toast.error(t(`errors.${slipErrorKey(e)}`));
    } finally {
      setBusy(null);
    }
  }

  const tabs: Tab[] = user ? ["mine", "community", "new"] : ["community"];

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />
      <FilterChips
        id="slip-tabs"
        className="mb-5"
        chips={tabs.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
        active={tab}
        onSelect={(k) => setTab(k as Tab)}
        label={t("tabs.label")}
      />

      {!user && (
        <p className="mb-5 text-sm">
          <Button asChild variant="outline" size="sm">
            <Link to="/join">{t("signIn")}</Link>
          </Button>
        </p>
      )}

      {tab === "new" && user ? (
        <SlipEditor userId={user.id} fixtures={open} onDone={() => setTab("mine")} />
      ) : failed ? (
        <EmptyState art="podium" title={t("errors.generic")} body="" />
      ) : slips === null ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
      ) : slips.length === 0 ? (
        <EmptyState
          art="podium"
          title={t(`empty.${tab === "mine" ? "mine" : "community"}`)}
          body=""
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {slips.map((s) => (
            <SlipCard
              key={s.id}
              slip={s}
              busy={busy === s.id}
              onPublish={(id) =>
                void act(id, async () => {
                  const r = await publishSlip(id);
                  toast.success(t("done.published", { count: r.picks }));
                })
              }
              onDelete={(id) => void act(id, () => deleteSlip(id), "done.deleted")}
              onToggleStake={(id, show) => void act(id, () => setShowStake(id, show))}
            />
          ))}
        </div>
      )}
      {tab !== "new" && slips && slips.length > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">{t("card.picksNote")}</p>
      )}
    </AppShell>
  );
}
