import { LatestFromPuntr } from "@/components/latest-from-puntr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { PlatformRail } from "@/components/affiliate";
import { Em } from "@/components/em";
import { FoundingCounter } from "@/components/founding-counter";
import { MatchPreview } from "@/components/match-preview";
import { IllustrativeFixtures } from "@/components/illustrative-panels";
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
import { TeamLogo } from "@/components/team-logo";

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
      <section className="grid gap-10 py-10 grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="min-w-0"
        >
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
              className="h-12 px-6 text-[15px]"
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
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12 }}
        >
          <MatchPreview />
        </motion.div>
      </section>

      <IllustrativeFixtures />

      {/* Five-second proof: compare unverified claims with Puntr’s locked record. */}
      <motion.section
        {...fade}
        className="card-surface mt-8 p-5 sm:p-7"
        aria-labelledby="proof-demo-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Predict smarter. Prove it.
            </p>
            <h2 id="proof-demo-title" className="mt-2 text-2xl">
              The difference is the record.
            </h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              See what changes when every pick has a verifiable outcome.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose a tipster record">
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
              Traditional tipster
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
              Puntr verified
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border p-5" aria-live="polite">
          <p className="text-sm font-bold">
            {showVerified ? "Puntr Verified Tipster" : "Traditional social tipster"}
          </p>
          {showVerified ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              <li className="text-sm">
                <strong className="block">Locked at kick-off</strong>
                <span className="text-xs text-muted-foreground">
                  Timestamped; cannot be edited or deleted.
                </span>
              </li>
              <li className="text-sm">
                <strong className="block">Auto-graded</strong>
                <span className="text-xs text-muted-foreground">
                  Settled outcomes update the public record.
                </span>
              </li>
              <li className="text-sm">
                <strong className="block">Public performance</strong>
                <span className="text-xs text-muted-foreground">
                  ROI and unit history stay visible.
                </span>
              </li>
            </ul>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              <li className="text-sm">
                <strong className="block">Editable picks</strong>
                <span className="text-xs text-muted-foreground">
                  Claims can be changed after the match.
                </span>
              </li>
              <li className="text-sm">
                <strong className="block">Deleted losses</strong>
                <span className="text-xs text-muted-foreground">
                  Poor calls can disappear from the feed.
                </span>
              </li>
              <li className="text-sm">
                <strong className="block">Unverified ROI</strong>
                <span className="text-xs text-muted-foreground">
                  No complete, checkable track record.
                </span>
              </li>
            </ul>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Puntr records are database-backed and publicly auditable. Blockchain verification is not
          claimed.
        </p>
      </motion.section>

      {/* Why a locked record matters */}
      <motion.section {...fade} className="grid gap-4 md:grid-cols-3">
        {(["stamped", "noEdits", "public"] as const).map((k) => (
          <div key={k} className="card-surface flex gap-3 p-5">
            <span className="grid size-7 shrink-0 place-items-center bg-primary-soft text-xs font-bold text-primary">
              ✓
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
        <motion.section {...fade} className="card-surface mb-8 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">{t("next.title")}</h2>
            <Link to="/predictions" className="text-xs font-medium text-primary">
              {t("next.all")}
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {next.map((f) => (
              <li key={f.id}>
                <Link
                  to="/match/$fixtureId"
                  params={{ fixtureId: f.id }}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-muted/40"
                >
                  <span className="w-44 shrink-0 text-xs text-muted-foreground tnum">
                    {formatDate(f.kickoff_at)} · {formatTime(f.kickoff_at)}
                  </span>
                  <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-sm font-semibold">
                    <TeamLogo team={f.home} size="sm" /> {f.home}
                    <span className="text-xs font-normal text-muted-foreground">{tc("vs")}</span>
                    <TeamLogo team={f.away} size="sm" /> {f.away}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.competition}</span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Platforms */}
      {SHOW_BOOKMAKER_WALL && (
        <motion.section {...fade} className="py-14 text-center">
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
      <motion.section {...fade} className="card-surface mt-8 p-5 sm:p-6">
        <h3 className="text-lg">{t("join.title")}</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {(["f1", "f2", "f3", "f4", "f5", "f6", "f7"] as const).map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center bg-primary-soft text-primary">
                ✓
              </span>
              <Trans t={t} i18nKey={`join.${f}`} components={{ 1: <Em /> }} />
            </li>
          ))}
        </ul>
        <Button className="mt-6" onClick={() => navigate({ to: "/join" })}>
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
              <ExplainerVideo autoPlay />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
