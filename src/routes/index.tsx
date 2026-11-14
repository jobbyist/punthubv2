import { LatestFromPuntr } from "@/components/latest-from-puntr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { PlatformRail } from "@/components/affiliate";
import { Em } from "@/components/em";
import { BadgeMarquee } from "@/components/motion/badge-marquee";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { FoundingCounter } from "@/components/founding-counter";
import { MatchPreview } from "@/components/match-preview";
import { MatchdayWidget } from "@/components/favourites/matchday-widget";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
import { useSession } from "@/components/session";
import { BookmakerIndependenceNotice } from "@/components/bookmaker-independence-notice";
import { ExplainerVideo } from "@/components/explainer-video";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";
import { SHOW_BOOKMAKER_WALL } from "@/lib/flags";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { headT } from "@/lib/i18n/head";
import { fetchUpcomingFixtures } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import { FixtureCard, KickoffMeta } from "@/components/fixture-card";
import { PageArt } from "@/components/motion/page-art";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return { next: await fetchUpcomingFixtures({ limit: 3 }) };
    } catch (error) {
      console.error("home fixtures failed", error);
      return { next: [] };
    }
  },
  head: ({ match }) => {
    const t = headT(match.context.locale, "home");
    return {
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.ogDescription") },
        { property: "og:url", content: "https://puntr.co.za/" },
        { property: "og:locale", content: "en_ZA" },
      ],
      links: [{ rel: "canonical", href: "https://puntr.co.za/" }],
    };
  },
  component: Landing,
});

const fade = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.5 },
};

function Landing() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { next } = Route.useLoaderData();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [showVerified, setShowVerified] = useState(true);

  const handleCloseVideoModal = () => {
    setIsVideoModalOpen(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
      {/* Hero */}
      <section className="relative isolate grid gap-10 py-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16">
        <HeroBackdrop />
        <div className="puntr-rise min-w-0">
          <span className="inline-block max-w-full rounded-md bg-primary-soft px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.2rem)] leading-[1.02]">
            {t("hero.title1")}
            <br />
            <span className="text-primary">{t("hero.title2")}</span>
          </h1>
          <p className="mt-4 text-base font-semibold sm:text-lg">{t("hero.tagline")}</p>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            <Trans t={t} i18nKey="hero.body" components={{ 1: <Em /> }} />
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="puntr-sheen h-12 px-6 text-[15px]"
              onClick={() => navigate({ to: "/join" })}
            >
              {tc("cta.becomeFounding")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-[15px]"
              onClick={() => setIsVideoModalOpen(true)}
            >
              <Play className="mr-2 size-4" /> {t("hero.watch")}
            </Button>
          </div>
          <FoundingCounter className="mt-4" />
          <ul className="mt-9 grid gap-5 sm:grid-cols-3">
            {(
              [
                [Lock, "locked"],
                [ShieldCheck, "graded"],
                [Clock, "kept"],
              ] as const
            ).map(([I, k]) => {
              return (
                <li key={k} className="flex items-center gap-3">
                  <span className="puntr-pop grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                    <I className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{t(`pillars.${k}.title`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t(`pillars.${k}.sub`)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="puntr-rise" style={{ ["--i" as string]: 2 }}>
          <MatchPreview />
        </div>
      </section>

      <div className="section-y pt-4 sm:pt-6 lg:pt-8">
        <HomePreview />
      </div>
      <BadgeMarquee label={t("marquee")} />

      {/* Five-second proof: compare unverified claims with Puntr’s locked record. */}
      <motion.section
        {...fade}
        className="card-surface mt-4 p-5 sm:p-8"
        aria-labelledby="proof-demo-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              {t("proof.eyebrow")}
            </p>
            <h2 id="proof-demo-title" className="mt-2 text-2xl">
              {t("proof.title")}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("proof.body")}</p>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("proof.choose")}>
            <button
              type="button"
              aria-pressed={!showVerified}
              onClick={() => setShowVerified(false)}
              className={
                "min-h-10 rounded-lg border px-3 text-xs font-semibold " +
                (!showVerified
                  ? "border-foreground bg-muted"
                  : "border-border text-muted-foreground")
              }
            >
              {t("proof.traditional")}
            </button>
            <button
              type="button"
              aria-pressed={showVerified}
              onClick={() => setShowVerified(true)}
              className={
                "min-h-10 rounded-lg border px-3 text-xs font-semibold " +
                (showVerified
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground")
              }
            >
              {t("proof.verified")}
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border p-5" aria-live="polite">
          <p className="text-sm font-bold">
            {showVerified ? t("proof.verifiedTitle") : t("proof.traditionalTitle")}
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {(showVerified
              ? (["v.locked", "v.graded", "v.public"] as const)
              : (["t.editable", "t.deleted", "t.roi"] as const)
            ).map((k) => (
              <li key={k} className="text-sm">
                <strong className="block">{t(`proof.${k}.title`)}</strong>
                <span className="text-xs text-muted-foreground">{t(`proof.${k}.body`)}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("proof.fine")}</p>
      </motion.section>

      {/* Why a locked record matters */}
      <motion.section {...fade} className="mt-6 grid gap-4 md:grid-cols-3">
        {(["stamped", "noEdits", "public"] as const).map((k) => (
          <div key={k} className="card-surface card-interactive flex gap-3 p-5">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{t(`why.${k}.title`)}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t(`why.${k}.body`)}
              </span>
            </span>
          </div>
        ))}
      </motion.section>

      {/* Next fixtures: real data from the daily sync. Hidden when there are none. */}
      {next.length > 0 && (
        <motion.section {...fade} className="mt-12 sm:mt-16">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl">{t("next.title")}</h2>
            <Link to="/predictions" className="text-xs font-medium text-primary">
              {t("next.all")}
            </Link>
          </div>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {next.map((f) => (
              <li key={f.id}>
                <Link
                  to="/match/$fixtureId"
                  params={{ fixtureId: f.id }}
                  className="block h-full rounded-2xl focus-visible:outline-offset-4"
                >
                  <FixtureCard
                    className="h-full"
                    home={f.home}
                    away={f.away}
                    sport={f.sport}
                    sportLabel={tc(`sport.${f.sport}`)}
                    competition={f.competition}
                    time={formatTime(f.kickoff_at)}
                    vsLabel={tc("vs")}
                    footer={<KickoffMeta label={formatDate(f.kickoff_at)} />}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Platforms */}
      {SHOW_BOOKMAKER_WALL && (
        <motion.section {...fade} className="section-y text-center">
          <h2 className="text-3xl">{t("platforms.title")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {t("platforms.body")}
          </p>
          <div className="mt-8">
            <PlatformRail />
          </div>
          <div className="mx-auto mt-5 max-w-3xl text-left">
            <BookmakerIndependenceNotice compact />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("platforms.fine")}</p>
          <RgNotice variant="compact" className="mt-1" />
        </motion.section>
      )}

      <LatestFromPuntr />

      {/* Join CTA */}
      <motion.section
        {...fade}
        className="card-surface relative isolate mb-4 mt-12 overflow-hidden p-6 sm:mt-16 sm:p-10"
      >
        <PageArt
          kind="podium"
          className="absolute bottom-6 right-6 -z-10 hidden h-40 w-64 opacity-80 lg:block"
        />
        <h2 className="text-2xl sm:text-3xl">{t("join.title")}</h2>
        <ul className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
          {(["f1", "f2", "f3", "f4", "f5", "f6", "f7"] as const).map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Check className="size-4" aria-hidden="true" />
              </span>
              <Trans t={t} i18nKey={`join.${f}`} components={{ 1: <Em /> }} />
            </li>
          ))}
        </ul>
        <Button
          size="lg"
          className="puntr-sheen mt-7 h-12 px-6"
          onClick={() => navigate({ to: "/join" })}
        >
          {tc("cta.createAccount")}
        </Button>
        <RgNotice variant="compact" className="mt-4" />
      </motion.section>

      {isVideoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={handleCloseVideoModal}
        >
          <div className="relative w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleCloseVideoModal}
              className="absolute -top-10 right-0 text-white transition-colors hover:text-primary"
              aria-label={t("video.close")}
            >
              <CloseIcon className="size-8" />
            </button>
            <div className="relative overflow-hidden rounded-xl bg-black shadow-2xl">
              <ExplainerVideo autoPlay ns="home" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Guests get the illustrative preview (zero-risk look at fixtures, results and the leaderboard). Signed-in members
 * get their own Matchday card instead: they no longer need an introduction to what a fixture looks like.
 */
function HomePreview() {
  // Server HTML and first paint show the guest preview (crawlable); members switch once the session loads.
  const { user } = useSession();
  return user ? <MatchdayWidget userId={user.id} /> : <IllustrativeFixtures />;
}
