import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { headT } from "@/lib/i18n/head";
import { money } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "pricing");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/pricing" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: Pricing,
});

const FOUNDING = ["f1", "f2", "f3"] as const;

const PACKS = [
  ["starter", 25, 25],
  ["matchday", 60, 65],
  ["season", 120, 140],
] as const;

const USES = [
  ["preview", 5],
  ["slip", 3],
  ["stats", 2],
] as const;

const FAQS = ["1", "2", "3", "4"] as const;

function Pricing() {
  const { t } = useTranslation("pricing");
  return (
    <AppShell>
      <PageHeading title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-surface flex flex-col p-6" aria-labelledby="founding-title">
          <span className="w-fit bg-primary-soft px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("founding.badge")}
          </span>
          <h2 id="founding-title" className="mt-3 text-2xl">
            {t("founding.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("founding.spots")}</p>
          <ul className="mt-5 space-y-3">
            {FOUNDING.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t(`founding.${f}`)}
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full sm:w-auto" asChild>
            <a href="/join">{t("founding.cta")}</a>
          </Button>
        </section>

        <section className="card-surface flex flex-col p-6" aria-labelledby="credits-title">
          <span className="w-fit bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("credits.badge")}
          </span>
          <h2 id="credits-title" className="mt-3 text-2xl">
            {t("credits.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("credits.note")}</p>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("credits.packs")}
          </p>
          <ul className="mt-2 divide-y divide-border border border-border">
            {PACKS.map(([name, price, cr]) => (
              <li key={name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="font-medium">{t(`credits.pack.${name}`)}</span>
                <span className="tnum">
                  {money(price)} = {t("credits.pack.credits", { count: cr })}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("credits.uses")}
          </p>
          <ul className="mt-2 divide-y divide-border border border-border">
            {USES.map(([name, cost]) => (
              <li key={name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{t(`credits.use.${name}`)}</span>
                <span className="tnum">{t("credits.use.cost", { count: cost })}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-sm font-semibold">{t("credits.alwaysFree")}</p>
        </section>
      </div>

      <p className="mt-6 border border-border bg-primary-soft/50 p-4 text-sm font-semibold">
        {t("never")}
      </p>

      <section className="mt-10" aria-labelledby="pricing-faq">
        <h2 id="pricing-faq" className="text-xl">
          {t("faq.title")}
        </h2>
        <dl className="mt-4 divide-y divide-border border border-border">
          {FAQS.map((n) => (
            <div key={n} className="p-4">
              <dt className="text-sm font-semibold">{t(`faq.q${n}`)}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t(`faq.a${n}`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </AppShell>
  );
}
