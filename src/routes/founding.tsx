import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { AnnualPassClaim } from "@/components/annual-pass-claim";
import { FoundingCounter } from "@/components/founding-counter";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";
import { CONSENT_CHANGED_EVENT, hasConsent } from "@/lib/consent";
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
        { property: "og:url", content: "https://puntr.co.za/founding" },
        { property: "og:image", content: "https://puntr.co.za/og/founding.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "675" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: t("meta.ogTitle") },
        { name: "twitter:description", content: t("meta.description") },
        { name: "twitter:image", content: "https://puntr.co.za/og/founding.png" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: (["1", "2", "3", "4"] as const).map((n) => ({
              "@type": "Question",
              name: t(`faq.q${n}`),
              acceptedAnswer: {
                "@type": "Answer",
                text: t(`faq.a${n}`, { launch: "1 December 2026" }),
              },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
              {
                "@type": "ListItem",
                position: 2,
                name: t("meta.ogTitle"),
                item: "https://puntr.co.za/founding",
              },
            ],
          }),
        },
      ],
    };
  },
  component: Founding,
});

/** Counts one landing view per page load, including when the visitor accepts Analytics after arriving. */
function useLandingView(page: string) {
  const sent = useRef(false);
  useEffect(() => {
    const send = () => {
      if (sent.current || !hasConsent("analytics")) return;
      sent.current = true;
      analytics.landingViewed(page);
    };
    send();
    window.addEventListener(CONSENT_CHANGED_EVENT, send);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, send);
  }, [page]);
}

/**
 * The sample pick a guest made on the home Marquee Matchup card, from router history state. Read only after mount:
 * the server never sees history state, so rendering it on the first pass would break hydration.
 */
function useMarqueePick() {
  const state = useRouterState({ select: (s) => s.location.state.marqueePick });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !state || typeof state.matchup !== "string") return null;
  return state;
}

function Founding() {
  const { t } = useTranslation("founding");
  const launch = formatDate(`${DEFAULT_LAUNCH_DATE}T12:00:00+02:00`);
  useLandingView("founding");
  const pick = useMarqueePick();

  return (
    <div className="relative isolate mx-auto w-full max-w-[920px] px-4 py-7 sm:px-6 sm:py-14">
      <HeroBackdrop variant="grid" />
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
        {t("eyebrow")}
      </p>
      {pick ? (
        <p className="mt-3 inline-flex max-w-[640px] items-start gap-2 border border-primary/30 bg-primary-soft px-3 py-2 text-sm font-medium">
          <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {pick.team
            ? t("marqueePick", { team: pick.team, matchup: pick.matchup, launch })
            : t("marqueePickDraw", { matchup: pick.matchup, launch })}
        </p>
      ) : null}
      <h1 className="mt-3 text-[clamp(2.4rem,7vw,4rem)] leading-[1.02]">
        {t("title1")}
        <br />
        <span className="text-primary">{t("title2")}</span>
      </h1>
      <p className="mt-5 text-lg font-semibold sm:text-xl">{t("lead")}</p>
      <p className="mt-3 max-w-[640px] text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t("body", { launch })}
      </p>

      <p className="mt-3 max-w-[640px] border-l-2 border-primary pl-3 text-sm text-muted-foreground">
        {t("pass.teaser")}
      </p>
      <FoundingCounter className="mt-6" />
      <p className="mt-3 max-w-xl text-xs font-semibold text-primary">
        Only the first 100 members receive a permanent numbered Founding badge. Once all places are
        claimed, the allocation closes.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button asChild size="lg" className="h-12 w-full px-6 text-[15px] sm:w-auto">
          <Link to="/join" onClick={() => analytics.foundingCtaClicked("hero")}>
            {t("cta")}
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-12 w-full px-6 text-[15px] sm:w-auto"
        >
          <Link to="/how-it-works">{t("how")}</Link>
        </Button>
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
        {(["t1", "t2", "t3"] as const).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <Check className="size-4 text-primary" aria-hidden />
            {t(`trust.${k}`)}
          </li>
        ))}
      </ul>

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

      <section className="puntr-reveal mt-12" aria-labelledby="founding-perks">
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

      <section className="puntr-reveal mt-12" aria-labelledby="founding-steps">
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

      <section className="puntr-reveal mt-12 border border-primary/30 p-6" aria-labelledby="founding-giveaway">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {t("giveaway.eyebrow")}
        </p>
        <h2 id="founding-giveaway" className="mt-2 text-2xl">
          {t("giveaway.title")}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("giveaway.body")}
        </p>
        <ul className="mt-4 grid gap-2 text-sm">
          {(["eligibility", "closing"] as const).map((key) => (
            <li key={key} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{t(`giveaway.${key}`)}</span>
            </li>
          ))}
        </ul>
        <Button asChild size="lg" variant="outline" className="mt-5 h-11 px-5">
          <Link to="/pricing">{t("giveaway.cta")}</Link>
        </Button>
      </section>

      <section className="puntr-reveal mt-12" aria-labelledby="founding-faq">
        <h2 id="founding-faq" className="text-xl">
          {t("faq.title")}
        </h2>
        <dl className="mt-4 divide-y divide-border border-y border-border">
          {(["1", "2", "3", "4"] as const).map((n) => (
            <div key={n} className="py-4">
              <dt className="font-semibold">{t(`faq.q${n}`)}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{t(`faq.a${n}`, { launch })}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="puntr-reveal mt-12 bg-primary-soft p-6">
        <h2 className="text-xl">{t("last.title")}</h2>
        <p className="mt-2 text-muted-foreground">{t("last.body")}</p>
        <Button asChild size="lg" className="mt-5 h-12 px-6 text-[15px]">
          <Link to="/join" onClick={() => analytics.foundingCtaClicked("final")}>
            {t("cta")}
          </Link>
        </Button>
        <FoundingCounter className="mt-4 block w-fit" />
      </section>

      <p className="mt-8 text-xs text-muted-foreground">{t("fine")}</p>
    </div>
  );
}
