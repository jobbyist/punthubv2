import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Phone, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/exclusions")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "exclusions");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/exclusions" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
      ],
    };
  },
  component: ExclusionsPage,
});

function ExclusionsPage() {
  const { t } = useTranslation("exclusions");
  return (
    <AppShell>
      <PageHeading art="shield" title={t("title")} subtitle={t("subtitle")} />
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary-soft via-background to-background p-6 sm:p-8">
        <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="size-4" aria-hidden />
          {t("eyebrow")}
        </div>
        <h2 className="relative mt-4 font-display text-3xl font-extrabold sm:text-4xl">{t("status")}</h2>
        <p className="relative mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{t("statusBody")}</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t("supportTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("supportBody")}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="tel:0800006008" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
              <Phone className="size-4" aria-hidden /> {t("call")}
            </a>
            <a href="https://wa.me/27766750710" target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold hover:bg-muted">
              {t("whatsapp")} <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>

        <section className="card-surface p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t("notAnApplicationTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("notAnApplicationBody")}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <a href="https://www.ngb.org.za/stakeholder-information/national-responsible-gambling-programme/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {t("ngb")} <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
            <a href="https://www.ggb.org.za/self-exclusion/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              {t("ggb")} <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-muted/30 p-5">
        <h2 className="text-base font-bold">{t("privacyTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("privacyBody")}</p>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{t("disclaimer")}</p>
      </section>
    </AppShell>
  );
}
