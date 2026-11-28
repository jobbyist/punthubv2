import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { FilterChips } from "@/components/match/filter-chips";
import { RgNotice } from "@/components/rg-notice";
import { useSession } from "@/components/session";
import { TipsterDiscover } from "@/components/tipster-support/discover";
import { TipsterHub } from "@/components/tipster-support/hub";
import { TipsterHowItWorks } from "@/components/tipster-support/how-it-works";
import { SupportingPanel } from "@/components/tipster-support/supporting";
import { Button } from "@/components/ui/button";
import { useAsync } from "@/hooks/use-async";
import { headT } from "@/lib/i18n/head";
import { fetchMyTipsterSupport } from "@/lib/tipster-support";

const TABS = ["supporting", "tipster", "discover", "how"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/tipster-support")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    typeof s["tab"] === "string" && (TABS as readonly string[]).includes(s["tab"])
      ? { tab: s["tab"] as Tab }
      : {},
  head: ({ match }) => {
    const t = headT(match.context.locale, "tipster");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/tipster-support" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: TipsterSupportPage,
});

function TipsterSupportPage() {
  const { t } = useTranslation("tipster");
  const { user } = useSession();
  const navigate = useNavigate({ from: "/tipster-support" });
  const { tab: requested } = Route.useSearch();
  const tab: Tab = requested ?? (user ? "supporting" : "how");
  const [version, setVersion] = useState(0);
  const { data, loading, failed } = useAsync(
    () => (user ? fetchMyTipsterSupport() : Promise.resolve(null)),
    [user?.id, version],
  );
  const reload = () => setVersion((v) => v + 1);
  const notLive = !!user && !loading && !failed && data === null;

  return (
    <AppShell>
      <PageHeading art="podium" title={t("title")} subtitle={t("subtitle")} />

      <FilterChips
        id="tipster-tabs"
        className="mb-6"
        chips={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`) }))}
        active={tab}
        onSelect={(k) => void navigate({ search: { tab: k as Tab }, replace: true })}
        label={t("tabs.label")}
      />

      {notLive && tab !== "how" ? (
        <EmptyState art="podium" title={t("notLive")} body="" />
      ) : tab === "how" ? (
        <TipsterHowItWorks limits={data?.limits} />
      ) : tab === "discover" ? (
        <TipsterDiscover />
      ) : !user ? (
        <div className="card-surface p-6">
          <p className="text-sm text-muted-foreground">{t("signIn")}</p>
          <Button asChild className="mt-4">
            <Link to="/join">{t("card.button")}</Link>
          </Button>
        </div>
      ) : failed ? (
        <EmptyState art="podium" title={t("errors.generic")} body="" />
      ) : !data ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : tab === "tipster" ? (
        <TipsterHub data={data} onChange={reload} />
      ) : (
        <SupportingPanel data={data} onChange={reload} />
      )}

      <RgNotice variant="compact" className="mt-10" />
    </AppShell>
  );
}
