import { Link } from "@tanstack/react-router";
import { ArrowRight, Heart, Settings2, Star, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { ChallengeDialog } from "@/components/duels/challenge-dialog";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import { fetchDuels, type DuelSummary } from "@/lib/duels-data";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { competitionMeta } from "@/lib/match/competition-meta";
import { fetchFavourites, hasFavourites, rankForMember, type Favourites } from "@/lib/preferences";
import { competitions } from "@/lib/sports/competitions";

/**
 * Signed-in home: replaces the illustrative preview with the member's next fixtures (favourite teams first, then
 * favourite competitions), their active duels and direct CTAs to the full intelligence and a duel.
 */
export function MatchdayWidget({ userId }: { userId: string }) {
  const { t } = useTranslation("favourites");
  const { t: td } = useTranslation("duels");
  const [fav, setFav] = useState<Favourites | null>(null);
  const [fixtures, setFixtures] = useState<UpcomingFixture[] | null>(null);
  const [duels, setDuels] = useState<DuelSummary[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchFavourites(userId).catch(() => null),
      fetchUpcomingFixtures({ days: 7, limit: 200 }).catch(() => [] as UpcomingFixture[]),
      fetchDuels("mine", undefined, 10).catch(() => [] as DuelSummary[]),
    ])
      .then(([f, fx, d]) => {
        if (!live) return;
        setFav(f);
        setFixtures(fx);
        setDuels(d.filter((x) => x.status === "pending" || x.status === "active"));
      })
      .catch((e: unknown) => {
        console.error("matchday load failed", e);
        if (live) setFixtures([]);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  if (fixtures === null)
    return <div className="h-80 animate-pulse rounded-xl bg-muted" aria-hidden />;

  const personal = hasFavourites(fav);
  const ranked = rankForMember(
    fixtures,
    fav ?? { sports: [], competitions: [], teams: [] },
    (n) => competitionMeta(n).key,
  );
  const shown = (personal ? ranked.filter((r) => r.reason) : ranked).slice(0, 5);
  const favComp =
    fav?.competitions.length === 1
      ? competitions.find((c) => c.key === fav.competitions[0])?.name
      : undefined;
  const open = fixtures.filter(
    (f) => f.status === "scheduled" && Date.parse(f.kickoff_at) > Date.now() + 5 * 60_000,
  );

  return (
    <section
      aria-labelledby="matchday-title"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="card-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="matchday-title" className="flex items-center gap-2 text-xl sm:text-2xl">
              <Star className="size-5 fill-primary text-primary" aria-hidden="true" />
              {personal ? t("matchday.title") : t("matchday.titleNone")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {personal ? t("matchday.body") : t("matchday.bodyNone")}
            </p>
          </div>
          <Link
            to="/account"
            hash="favourites"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"
          >
            {personal ? (
              <Settings2 className="size-4" aria-hidden="true" />
            ) : (
              <Heart className="size-4" aria-hidden="true" />
            )}
            {personal ? t("matchday.edit") : t("matchday.pick")}
          </Link>
        </div>

        {shown.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            {t("matchday.empty")}
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {shown.map(({ fixture: f, reason }) => (
              <li key={f.id}>
                <Link
                  to="/match/$fixtureId"
                  params={{ fixtureId: f.id }}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md py-3 hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <CompetitionBadge name={f.competition} showName={false} />
                      {reason && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          {t(`matchday.${reason}`)}
                        </span>
                      )}
                    </span>
                    <span className="mt-1.5 flex min-w-0 items-center gap-2 text-sm font-semibold">
                      <TeamLogo team={f.home} sport={f.sport} size="sm" className="size-6" />
                      <span className="min-w-0 truncate">{f.home}</span>
                      <span className="text-xs text-muted-foreground">{td("vs")}</span>
                      <span className="min-w-0 truncate">{f.away}</span>
                      <TeamLogo team={f.away} sport={f.sport} size="sm" className="size-6" />
                    </span>
                  </span>
                  <KickoffPill kickoff={f.kickoff_at} status={f.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/fixtures" search={favComp ? { comp: favComp } : {}}>
              {t("matchday.intel")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          {open.length > 0 && (
            <ChallengeDialog
              fixtures={(shown.length ? shown.map((s) => s.fixture) : open)
                .filter((f) => open.some((o) => o.id === f.id))
                .slice(0, 20)}
            />
          )}
        </div>
      </div>

      <aside className="card-surface p-5" aria-labelledby="my-duels-title">
        <h2 id="my-duels-title" className="flex items-center gap-2 text-base">
          <Swords className="size-4 text-primary" aria-hidden="true" />
          {t("matchday.duels")}
        </h2>
        {duels.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("matchday.duelsNone")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {duels.slice(0, 4).map((d) => (
              <li key={d.id}>
                <Link
                  to="/duels/$duelId"
                  params={{ duelId: d.id }}
                  className="block rounded-lg border border-border p-3 text-sm hover:border-primary"
                >
                  <span className="block truncate font-semibold">
                    @{d.challenger} {td("vs")} {d.opponent ? `@${d.opponent}` : td("open")}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {d.fixture.home} {td("vs")} {d.fixture.away} · {td(`status.${d.status}`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/duels"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          {t("matchday.seeDuels")}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </aside>
    </section>
  );
}
