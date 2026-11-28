import { Link } from "@tanstack/react-router";
import { Heart, Star, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { TeamLogo } from "@/components/team-logo";
import { useUserContext } from "@/components/user-context";
import type { UpcomingFixture } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import { competitionMeta } from "@/lib/match/competition-meta";
import { rankForMember } from "@/lib/preferences";

const NUDGE_ID = "discover-favourites-nudge";

/**
 * Members with favourites see their teams' and leagues' next matches first. Members without any get a one-line
 * nudge to pick them (dismissible). Guests see nothing here.
 */
export function ForYou({ fixtures }: { fixtures: UpcomingFixture[] }) {
  const { t } = useTranslation("predictions");
  const ctx = useUserContext();
  if (!ctx.ready || !ctx.isSignedIn) return null;

  if (!ctx.hasFavourites || !ctx.favourites) {
    if (ctx.isDismissed(NUDGE_ID)) return null;
    return (
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-background text-primary">
          <Heart className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{t("discover.forYou.nudgeTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("discover.forYou.nudgeBody")}</p>
        </div>
        <Link
          to="/account"
          hash="favourites"
          className="shrink-0 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          {t("discover.forYou.nudgeCta")}
        </Link>
        <button
          type="button"
          onClick={() => ctx.dismiss(NUDGE_ID)}
          aria-label={t("discover.forYou.dismiss")}
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-background"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const mine = rankForMember(fixtures, ctx.favourites, (n) => competitionMeta(n).key)
    .filter((r) => r.reason)
    .slice(0, 4);
  if (mine.length === 0) return null;

  return (
    <section aria-labelledby="for-you-title" className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 id="for-you-title" className="flex items-center gap-2 text-lg sm:text-xl">
          <Star className="size-4 fill-primary text-primary" aria-hidden />
          {t("discover.forYou.title")}
        </h2>
        <Link
          to="/account"
          hash="favourites"
          className="text-xs font-semibold text-primary hover:underline"
        >
          {t("discover.forYou.edit")}
        </Link>
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
        {mine.map(({ fixture: f }) => (
          <li key={f.id} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <Link
              to="/match/$fixtureId"
              params={{ fixtureId: f.id }}
              className="group block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {f.competition} · {formatDate(f.kickoff_at)}, {formatTime(f.kickoff_at)}
              </p>
              <div className="mt-3 space-y-2">
                {[f.home, f.away].map((team) => (
                  <p key={team} className="flex items-center gap-2 text-sm font-semibold">
                    <TeamLogo team={team} sport={f.sport} size="sm" />
                    <span className="truncate">{team}</span>
                  </p>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-primary group-hover:underline">
                {t("discover.forYou.open")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
