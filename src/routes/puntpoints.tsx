import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gift, Star } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/puntpoints")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pages");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/puntpoints" }],
      meta: [
        { title: t("puntpoints.meta.title") },
        { name: "description", content: t("puntpoints.meta.description") },
      ],
    };
  },
  component: PuntPointsPage,
});

function PuntPointsPage() {
  const { t } = useTranslation("pages");
  return (
    <AppShell>
      <PageHeading art="coins" title={t("puntpoints.title")} subtitle={t("puntpoints.subtitle")} />
      <section className="card-surface p-5 sm:p-7">
        <div className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <Star className="size-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">{t("puntpoints.heading")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("puntpoints.body")}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(["earn", "explore", "transparent"] as const)
            .map((k) => [t(`puntpoints.cards.${k}.title`), t(`puntpoints.cards.${k}.body`)])
            .map(([title, body]) => (
              <div key={title} className="border border-border p-4">
                <Gift className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t("puntpoints.fine")}</p>
        <Button asChild className="mt-5">
          <Link to="/rewards">
            {t("puntpoints.cta")} <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}
