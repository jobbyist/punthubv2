import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AnnualPassClaim } from "@/components/annual-pass-claim";
import { FoundingCounter } from "@/components/founding-counter";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { DEFAULT_LAUNCH_DATE } from "@/lib/launch";

export const Route = createFileRoute("/founding")({
  head: ({ match }) => {
    const t = headT(match.context.locale, "founding");
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/founding" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: Founding,
});

function Founding() {
  const { t } = useTranslation("founding");
  const launch = formatDate(`${DEFAULT_LAUNCH_DATE}T12:00:00+02:00`);

  return (
    <div className="mx-auto max-w-[920px] px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-[clamp(2.4rem,7vw,4rem)] leading-[1.02]">
        {t("title1")}
        <br />
        <span className="text-primary">{t("title2")}</span>
      </h1>
      <p className="mt-5 text-lg font-semibold">{t("lead")}</p>
      <p className="mt-3 max-w-[640px] text-muted-foreground">{t("body", { launch })}</p>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="h-12 px-6 text-[15px]">
          <Link to="/join">{t("cta")}</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-12 px-6 text-[15px]">
          <Link to="/how-it-works">{t("how")}</Link>
        </Button>
      </div>
      <FoundingCounter className="mt-4" />

      <dl className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="border border-border p-5">
          <dt className="text-sm text-muted-foreground">{t("dates.open")}</dt>
          <dd className="mt-1 text-2xl font-extrabold">{t("dates.openValue")}</dd>
        </div>
        <div className="border border-primary p-5">
          <dt className="text-sm text-muted-foreground">{t("dates.launch")}</dt>
          <dd className="mt-1 text-2xl font-extrabold text-primary">{launch}</dd>
        </div>
      </dl>

      <section className="mt-12" aria-labelledby="founding-perks">
        <h2 id="founding-perks" className="text-xl">
          {t("perks.title")}
        </h2>
        <ul className="mt-4 grid gap-3">
          {(["f1", "f2", "f3"] as const).map((k) => (
            <li key={k} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center bg-primary-soft text-primary">
                <Check className="size-4" aria-hidden />
              </span>
              <span>{t(`perks.${k}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="founding-steps">
        <h2 id="founding-steps" className="text-xl">
          {t("steps.title")}
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {(["s1", "s2", "s3"] as const).map((k, i) => (
            <li key={k} className="border border-border p-5">
              <span className="text-sm font-bold text-primary tnum">{i + 1}</span>
              <h3 className="mt-1 text-base">{t(`steps.${k}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <AnnualPassClaim />

      <section className="mt-12 bg-primary-soft p-6">
        <h2 className="text-xl">{t("last.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("last.body")}</p>
        <Button asChild size="lg" className="mt-5 h-12 px-6 text-[15px]">
          <Link to="/join">{t("cta")}</Link>
        </Button>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">{t("fine")}</p>
    </div>
  );
}
