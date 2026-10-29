import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Em } from "@/components/em";
import { RgNotice } from "@/components/rg-notice";
import { headT } from "@/lib/i18n/head";

export const Route = createFileRoute("/how-it-works")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "howitworks");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/how-it-works" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
    };
  },
  component: HowItWorks,
});

const STEPS = ["s1", "s2", "s3", "s4"] as const;
const MARKETS = ["m1", "m2", "m3", "m4", "m5"] as const;
const RULES = ["r1", "r2", "r3", "r4", "r5", "r6"] as const;

function HowItWorks() {
  const navigate = useNavigate();
  const { t } = useTranslation("howitworks");
  const { t: tc } = useTranslation("common");

  return (
    <AppShell>
      <h1 className="text-[clamp(2rem,4vw,2.4rem)]">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{tc("brand.tagline")}</p>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        <Trans t={t} i18nKey="intro" components={{ 1: <Em /> }} />
      </p>

      <ol className="relative mt-8 space-y-4 border-l border-border pl-6 sm:pl-8">
        {STEPS.map((k, i) => (
          <motion.li
            key={k}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <span className="absolute -left-[34px] grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground tnum sm:-left-[42px]">
              {i + 1}
            </span>
            <div className="card-surface p-5">
              <h2 className="text-xl">{t(`steps.${k}.title`)}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                <Trans t={t} i18nKey={`steps.${k}.body`} components={{ 1: <Em /> }} />
              </p>
              <ul className="mt-3 space-y-1.5">
                {(["b1", "b2"] as const).map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" /> {t(`steps.${k}.${b}`)}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </ol>

      <section
        id="grading"
        className="card-surface mt-8 scroll-mt-24 p-6"
        aria-labelledby="grading-title"
      >
        <h2 id="grading-title" className="text-2xl">
          {t("grading.title")}
        </h2>

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("grading.markets")}
        </h3>
        <ul className="mt-2 divide-y divide-border border border-border">
          {MARKETS.map((m) => (
            <li key={m} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="font-medium">{t(`grading.market.${m}.name`)}</span>
              <span className="text-muted-foreground">{t(`grading.market.${m}.scope`)}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("grading.rules")}
        </h3>
        <ul className="mt-2 space-y-2">
          {RULES.map((r) => (
            <li key={r} className="flex items-start gap-2 text-sm leading-relaxed">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t(`grading.rule.${r}`)}
            </li>
          ))}
        </ul>
      </section>

      <section className="card-surface mt-6 flex flex-wrap items-center gap-4 bg-primary-soft/50 p-5">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg">{t("cta.title")}</h3>
          <RgNotice variant="compact" className="mt-1" />
        </div>
        <Button onClick={() => navigate({ to: "/join" })}>{tc("cta.getStarted")}</Button>
      </section>
    </AppShell>
  );
}
