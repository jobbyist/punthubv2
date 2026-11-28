import { LatestFromPuntr } from "@/components/latest-from-puntr";
import { TheGoodSportPromo } from "@/components/podcast/the-good-sport";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { AffiliateBanner, PlatformRail } from "@/components/affiliate";
import { BadgeMarquee } from "@/components/motion/badge-marquee";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { FoundingCounter } from "@/components/founding-counter";
import { MatchPreview } from "@/components/match-preview";
import { MatchdayWidget } from "@/components/favourites/matchday-widget";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
import { useSession } from "@/components/session";
import { useUserContext } from "@/components/user-context";
import type { NextAction } from "@/lib/user-context";
import { BookmakerIndependenceNotice } from "@/components/bookmaker-independence-notice";
import { ExplainerVideo } from "@/components/explainer-video";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";
import { SHOW_BOOKMAKER_WALL } from "@/lib/flags";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { headT } from "@/lib/i18n/head";
import { fetchUpcomingFixtures } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import { FixtureCard, KickoffMeta } from "@/components/fixture-card";
import { trackEvent } from "@/lib/analytics";

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
        { name: "track360-verify", content: "54fdec1c340705c8771b2ca846c4cf13" },
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
  const { loading: sessionLoading, isSignedIn } = useSession();
  const [headlineVariant, setHeadlineVariant] = useState<"A" | "B">("A");
  const headlineAssigned = useRef(false);
  const ctx = useUserContext();
  useEffect(() => {
    if (sessionLoading || headlineAssigned.current) return;
    headlineAssigned.current = true;
    const variant = Math.random() < 0.5 ? "A" : "B";
    setHeadlineVariant(variant);
    trackEvent("home_hero_headline_viewed", {
      variant,
      authenticated: isSignedIn,
    });
  }, [sessionLoading, isSignedIn]);
  // The hero's primary button follows the shared context: guests join (or sign in if they have an account on
  // this device); members get their next best step (first pick, favourites, last match, leaderboard).
  // Until the context is ready the button is neutral, so it never swaps label after first paint.
  const primary: Omit<NextAction, "key"> & { key: NextAction["key"] | "discover" } = !ctx.ready
    ? isSignedIn
      ? { key: "discover", to: "/discover" }
      : { key: "join", to: "/join" }
    : !isSignedIn
      ? ctx.hasAccount
        ? { key: "signIn", to: "/join", search: { mode: "signin" } }
        : { key: "join", to: "/join" }
      : ctx.next;
  const member = isSignedIn && ctx.ready;
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
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-5 text-[clamp(2.6rem,7vw,4.2rem)] leading-[1.02]">
            {headlineVariant === "A" ? (
              <>
                {t("hero.headlineA1")}
                <br />
                <span className="text-primary">{t("hero.headlineA2")}</span>
              </>
            ) : (
              <>
                {t("hero.title1")}
                <br />
                <span className="text-primary">{t("hero.title2")}</span>
              </>
            )}
          </h1>
          {member ? (
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              {t(`hero.member.${ctx.segment === "member-active" ? "active" : "onboarding"}`)}
            </p>
          ) : (
            <>
              <p className="mt-4 text-base font-semibold sm:text-lg">{t("hero.free")}</p>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                {t("hero.lede")}
              </p>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-muted-foreground/80 sm:text-[13px]">
                {t("hero.notBookie")}
              </p>
            </>
          )}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="puntr-sheen h-12 px-6 text-[15px]">
              <Link
                to={primary.to as never}
                params={primary.params as never}
                search={primary.search as never}
                {...(primary.hash ? { hash: primary.hash } : {})}
                onClick={() =>
                  trackEvent("home_hero_primary_cta_clicked", {
                    authenticated: isSignedIn,
                    destination: primary.key,
                  })
                }
              >
                {t(`hero.cta.${primary.key}`)}
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-[15px]"
              onClick={() => {
                if (isSignedIn) {
                  trackEvent("home_hero_secondary_cta_clicked", {
                    authenticated: true,
                    destination: "discover",
                  });
                  navigate({ to: "/discover" });
                } else {
                  trackEvent("home_hero_video_clicked", { authenticated: false });
                  setIsVideoModalOpen(true);
                }
              }}
            >
              {isSignedIn ? (
                t("hero.secondary.discover")
              ) : (
                <>
                  <Play className="mr-2 size-4" /> {t("hero.watch")}
                </>
              )}
            </Button>
          </div>
          {!isSignedIn && <FoundingCounter className="mt-4" />}
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

      {!isSignedIn && (
        <motion.section
          {...fade}
          className="card-surface relative isolate mt-4 overflow-hidden p-6 sm:mt-6 sm:p-8"
          aria-labelledby="home-steps-title"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {t("join.eyebrow")}
          </p>
          <h2 id="home-steps-title" className="mt-2 text-2xl sm:text-3xl">
            {t("join.title")}
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            <li className="rounded-xl border border-border p-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {t("join.stepLabel", { n: 1 })}
              </span>
              <h3 className="mt-2 text-base font-bold">{t("join.steps.one.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("join.steps.one.body")}
              </p>
            </li>
            <li className="rounded-xl border border-border p-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {t("join.stepLabel", { n: 2 })}
              </span>
              <h3 className="mt-2 text-base font-bold">{t("join.steps.two.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("join.steps.two.body")}
              </p>
            </li>
            <li className="rounded-xl border border-border p-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {t("join.stepLabel", { n: 3 })}
              </span>
              <h3 className="mt-2 text-base font-bold">{t("join.steps.three.title")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("join.steps.three.body")}
              </p>
            </li>
          </ol>
          <Button
            size="lg"
            className="puntr-sheen mt-6 h-12 px-6"
            onClick={() => {
              trackEvent("home_how_it_works_clicked", {
                authenticated: false,
                destination: "how-it-works",
              });
              navigate({ to: "/how-it-works" });
            }}
          >
            {t("join.guideCta")}
          </Button>
          <RgNotice variant="compact" className="mt-4" />
        </motion.section>
      )}

      <div className="pt-8 sm:pt-10">
        <HomePreview />
      </div>
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

      <div className="mt-12">
        <BadgeMarquee label={t("marquee")} />
      </div>
      {/* Guests only: members already know why a locked record matters. */}
      {!isSignedIn && (
        <>
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
        </>
      )}

      <TheGoodSportPromo />

      {/* Newsroom, then the bookmaker logo wall below it (owner, 27 Nov 2026). */}
      <LatestFromPuntr />
      <div className="section-y">
        <AffiliateBanner label="homepage" />
      </div>

      {/* Platforms */}
      {SHOW_BOOKMAKER_WALL && !isSignedIn && (
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
