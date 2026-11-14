import { useTranslation } from "react-i18next";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PartnerLogo } from "@/components/partner-logo";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import { platforms } from "@/lib/mock-data";

export const Route = createFileRoute("/bookmakers")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pages");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/bookmakers" }],
      meta: [
        { title: t("bookmakers.meta.title") },
        { name: "description", content: t("bookmakers.meta.description") },
      ],
    };
  },
  component: BookmakersPage,
});

function BookmakersPage() {
  const { t } = useTranslation("pages");
  const uploaded = new Map(
    useBrandLogos("bookmakers")
      .filter((l) => l.active && l.imageUrl)
      .map((l) => [l.name.toLowerCase(), l.imageUrl as string]),
  );
  return (
    <AppShell>
      <PageHeading art="shield" title={t("bookmakers.title")} subtitle={t("bookmakers.subtitle")} />
      <section className="card-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">{t("bookmakers.independent.title")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("bookmakers.independent.body")}
            </p>
          </div>
        </div>
      </section>
      <section className="mt-6" aria-labelledby="bookmaker-directory-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="bookmaker-directory-title" className="text-lg font-bold">
            {t("bookmakers.directory")}
          </h2>
          <span className="text-xs text-muted-foreground">{t("bookmakers.brandOnly")}</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platforms.map((platform) => (
            <li
              key={platform.name}
              className="card-surface group flex min-h-20 items-center gap-4 p-4"
            >
              <PartnerLogo
                src={uploaded.get(platform.name.toLowerCase()) ?? platform.logo}
                alt={platform.name}
                loading="lazy"
                className="max-w-20"
              />
              <span className="flex-1 text-sm font-semibold">{platform.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {t("bookmakers.tag")}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">{t("bookmakers.fine")}</p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/predictions">{t("bookmakers.cta")}</Link>
      </Button>
    </AppShell>
  );
}
