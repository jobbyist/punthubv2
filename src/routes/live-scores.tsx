import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, CalendarClock } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/live-scores")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pages");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/live-scores" }],
      meta: [
        { title: t("liveScores.meta.title") },
        { name: "description", content: t("liveScores.meta.description") },
      ],
    };
  },
  component: LiveScoresPage,
});

function LiveScoresPage() {
  const { t } = useTranslation("pages");
  return (
    <AppShell>
      <PageHeading art="radar" title={t("liveScores.title")} subtitle={t("liveScores.subtitle")} />
      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-5 sm:p-6">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
            <Activity className="size-4" /> {t("liveScores.eyebrow")}
          </span>
          <h2 className="mt-3 text-xl font-bold">{t("liveScores.heading")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("liveScores.body")}
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <div className="border border-border p-4">
            <CalendarClock className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("liveScores.fixtures.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("liveScores.fixtures.body")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/results">{t("liveScores.fixtures.cta")}</Link>
            </Button>
          </div>
          <div className="border border-border p-4">
            <Activity className="size-5 text-primary" />
            <h3 className="mt-3 font-semibold">{t("liveScores.data.title")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("liveScores.data.body")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/feedback">{t("liveScores.data.cta")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
