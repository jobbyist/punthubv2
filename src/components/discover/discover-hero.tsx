import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, History, Radio, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSession } from "@/components/session";
import { useUserContext } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import type { UpcomingFixture } from "@/lib/fixtures";
import { saDayKey } from "@/lib/format";
import { partOfDay } from "@/lib/user-context";

/**
 * Top of Discover (the PWA start page). Greets the person, says in one line what Puntr is, and offers the
 * single most useful next step for them (see nextBestAction), plus a live snapshot of what's on.
 */
export function DiscoverHero({ fixtures, now }: { fixtures: UpcomingFixture[]; now: Date | null }) {
  const { t } = useTranslation("predictions");
  const { profile } = useSession();
  const ctx = useUserContext();
  const todayKey = now ? saDayKey(now) : null;
  const today = todayKey ? fixtures.filter((f) => saDayKey(f.kickoff_at) === todayKey).length : 0;
  const live = fixtures.filter((f) => f.status === "live").length;
  const leagues = new Set(fixtures.map((f) => f.competition)).size;

  // Neutral copy until context is known, so server HTML and first paint match.
  const segment = ctx.ready ? ctx.segment : "guest-first";
  const greeting =
    ctx.ready && now
      ? profile
        ? t(`discover.hero.greeting.${partOfDay(now)}`, {
            name: profile.display_name || profile.username,
          })
        : t(`discover.hero.greeting.${partOfDay(now)}Guest`)
      : t("discover.hero.eyebrow");
  const next = ctx.next;

  const stats = [
    { key: "today", icon: CalendarDays, value: today, to: "/fixtures" as const },
    { key: "live", icon: Radio, value: live, to: "/live-scores" as const },
    { key: "leagues", icon: Trophy, value: leagues, to: "/tables" as const },
  ];

  return (
    <section
      aria-labelledby="discover-title"
      className="relative isolate mb-6 overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-7"
    >
      <div
        className="dot-grid absolute inset-0 -z-10 opacity-60"
        style={{
          maskImage: "linear-gradient(110deg, transparent 30%, black 90%)",
          WebkitMaskImage: "linear-gradient(110deg, transparent 30%, black 90%)",
        }}
        aria-hidden="true"
      />
      <motion.div
        aria-hidden
        className="absolute -right-16 -top-16 -z-10 size-56 rounded-full bg-primary/10 blur-3xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{greeting}</p>
      <h1 id="discover-title" className="mt-2 max-w-2xl text-[28px] leading-tight sm:text-[36px]">
        {t(`discover.hero.title.${segment}`)}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {t(`discover.hero.body.${segment}`)}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild size="lg" className="puntr-sheen h-12 px-5">
          <Link
            to={next.to as never}
            params={next.params as never}
            search={next.search as never}
            {...(next.hash ? { hash: next.hash } : {})}
            onClick={() =>
              trackEvent("discover_primary_cta_clicked", { action: next.key, segment })
            }
          >
            {t(`discover.hero.cta.${next.key}`)}
            <ArrowRight className="ml-1 size-4" aria-hidden />
          </Link>
        </Button>
        {ctx.ready && ctx.local.lastMatchId && next.key !== "continueMatch" ? (
          <Button asChild size="lg" variant="outline" className="h-12 px-5">
            <Link to="/match/$fixtureId" params={{ fixtureId: ctx.local.lastMatchId }}>
              <History className="mr-1 size-4" aria-hidden />
              {t("discover.hero.resume")}
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" variant="outline" className="h-12 px-5">
            <Link to="/fixtures">{t("discover.hero.browse")}</Link>
          </Button>
        )}
      </div>

      {fixtures.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
          {stats.map(({ key, icon: Icon, value, to }, i) => (
            <motion.li
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 320, damping: 26 }}
            >
              <Link
                to={to}
                className="group flex h-full flex-col rounded-xl border border-border bg-background/70 p-3 backdrop-blur transition-colors hover:border-primary/50"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon
                    className={`size-3.5 ${key === "live" && value > 0 ? "text-primary motion-safe:animate-pulse" : ""}`}
                    aria-hidden
                  />
                  {t(`discover.hero.stats.${key}`)}
                </span>
                <span className="mt-1 font-display text-2xl font-extrabold tnum group-hover:text-primary">
                  {value}
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
