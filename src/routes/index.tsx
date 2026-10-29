import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Clock, Lock, Play, ShieldCheck, X as CloseIcon } from "lucide-react";

import { PlatformRail } from "@/components/affiliate";
import { Em } from "@/components/em";
import { MatchPreview } from "@/components/match-preview";
import { Button } from "@/components/ui/button";
import { RgNotice } from "@/components/rg-notice";
import { topTipsters } from "@/lib/mock-data";
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

const STEP_KEYS = ["s1", "s2", "s3", "s4"] as const;

function Landing() {
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { next } = Route.useLoaderData();
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            <Trans t={t} i18nKey="hero.body" components={{ 1: <Em /> }} />
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-12 px-6 text-[15px]"
              onClick={() => navigate({ to: "/join" })}
            >
              {tc("cta.getStarted")}
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
              <li key={f.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="w-44 shrink-0 text-xs text-muted-foreground tnum">
                  {formatDate(f.kickoff_at)} · {formatTime(f.kickoff_at)}
                </span>
                <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-sm font-semibold">
                  <TeamLogo team={f.home} size="sm" /> {f.home}
                  <span className="text-xs font-normal text-muted-foreground">{tc("vs")}</span>
                  <TeamLogo team={f.away} size="sm" /> {f.away}
                </span>
                <span className="text-xs text-muted-foreground">{f.competition}</span>
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
          <p className="mt-5 text-xs text-muted-foreground">{t("platforms.fine")}</p>
          <RgNotice variant="compact" className="mt-1" />
        </motion.section>
      )}

      {/* How it works */}
      <motion.section {...fade} className="card-surface mt-8 p-6 sm:p-8">
        <h2 className="text-center text-2xl">{t("steps.title")}</h2>
        <div className="mt-7 grid gap-4 md:grid-cols-4">
          {STEP_KEYS.map((k, i) => (
            <div key={k} className="flex gap-3 rounded-xl border border-border p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary tnum">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{t(`steps.${k}.title`)}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  <Trans t={t} i18nKey={`steps.${k}.body`} components={{ 1: <Em /> }} />
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Leaderboard + why join */}
      <motion.section {...fade} className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg">{t("board.title")}</h3>
            <span className="bg-muted px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {tc("badge.example")}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {t("board.sample")}
          </p>
          <ul className="mt-4 space-y-2.5">
            {topTipsters.slice(0, 3).map((tp) => (
              <li key={tp.name} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center bg-muted text-[11px] font-bold tnum">
                  {tp.rank}
                </span>
                <span className="size-7 rounded-full bg-muted" />
                <span className="flex-1 truncate text-sm font-medium">{tp.name}</span>
                <span className="text-xs font-semibold text-primary tnum">
                  {t("board.points", { value: tp.points.toLocaleString() })}
                </span>
              </li>
            ))}
          </ul>
          <Button variant="outline" className="mt-4 w-full" asChild>
            <Link to="/leaderboards">{t("board.view")}</Link>
          </Button>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-lg">{t("join.title")}</h3>
          <ul className="mt-4 space-y-3.5">
            {(["f1", "f2", "f3", "f4", "f5", "f6"] as const).map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm">
                <span className="grid size-7 shrink-0 place-items-center bg-primary-soft text-primary">
                  ✓
                </span>
                <Trans t={t} i18nKey={`join.${f}`} components={{ 1: <Em /> }} />
              </li>
            ))}
          </ul>
          <Button className="mt-6 w-full" onClick={() => navigate({ to: "/join" })}>
            {tc("cta.createAccount")}
          </Button>
          <RgNotice variant="compact" className="mt-4" />
        </div>
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
            <div
              className="relative overflow-hidden rounded-xl bg-black shadow-2xl"
              style={{ paddingBottom: "56.25%" }}
            >
              <iframe
                src="https://www.youtube.com/embed/pBCncBbeWkc?rel=0"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  border: 0,
                }}
                allowFullScreen
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin"
                title={t("video.iframeTitle")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
