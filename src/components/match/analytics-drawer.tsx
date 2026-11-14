import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CrowdSplit } from "@/components/crowd-split";
import { IntelPanel } from "@/components/intel/intel-panel";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FormGuide } from "@/components/match/form-guide";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDate, formatTime } from "@/lib/format";
import { headToHead, perMatch, type FinishedRow, type TeamForm } from "@/lib/match/form";
import { fetchPicksForFixture, type PickRow } from "@/lib/pick-data";

export interface DrawerFixture {
  id: string;
  sport: string;
  competition: string;
  home: string;
  away: string;
  kickoff_at: string;
  status: string;
}

/**
 * Instant preview of a match's intelligence in a sheet (bottom on phones, right on larger screens), so members
 * scan many matches without leaving the list. Only Puntr's own recorded data: form, goals per game, head to head
 * and the community split. Model outputs stay labelled "at launch" until the model is live.
 */
export function AnalyticsDrawer({
  fixture,
  open,
  onOpenChange,
  forms,
  rows,
}: {
  fixture: DrawerFixture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forms: Record<string, TeamForm>;
  rows: FinishedRow[];
}) {
  const { t } = useTranslation("matchcard");
  const mobile = useIsMobile();
  const [picks, setPicks] = useState<PickRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    setPicks(null);
    setFailed(false);
    fetchPicksForFixture(fixture.id)
      .then((p) => live && setPicks(p))
      .catch((e: unknown) => {
        console.error("drawer picks failed", e);
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [open, fixture.id]);

  const home = forms[fixture.home];
  const away = forms[fixture.away];
  const h2h = headToHead(rows, fixture.home, fixture.away);
  const goalRows = [
    { team: fixture.home, form: home },
    { team: fixture.away, form: away },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className={
          mobile
            ? "max-h-[88dvh] overflow-y-auto rounded-t-2xl p-0"
            : "w-full overflow-y-auto p-0 sm:max-w-md"
        }
      >
        <SheetHeader className="border-b border-border p-5 text-left">
          <div className="flex items-center justify-between gap-2 pr-8">
            <CompetitionBadge name={fixture.competition} />
            <KickoffPill kickoff={fixture.kickoff_at} status={fixture.status} />
          </div>
          <SheetTitle className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-sm">
            <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <TeamLogo team={fixture.home} sport={fixture.sport} size="lg" />
              <span className="line-clamp-2">{fixture.home}</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {t("vs")}
            </span>
            <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
              <TeamLogo team={fixture.away} sport={fixture.sport} size="lg" />
              <span className="line-clamp-2">{fixture.away}</span>
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            {t("drawer.description", { home: fixture.home, away: fixture.away })}
          </SheetDescription>
          <p className="mt-2 text-center text-xs text-muted-foreground tnum">
            {t("drawer.kickoff")}: {formatDate(fixture.kickoff_at)} ·{" "}
            {formatTime(fixture.kickoff_at)}
          </p>
        </SheetHeader>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("drawer.formTitle")}
            </h3>
            <ul className="space-y-2">
              {goalRows.map(({ team, form }) => (
                <li key={team} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">{team}</span>
                  <FormGuide team={team} entries={form?.entries} align="end" size="md" />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("drawer.goalsTitle")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {goalRows.map(({ team, form }) => {
                const gf = form ? perMatch(form.scored, form.played) : null;
                const ga = form ? perMatch(form.conceded, form.played) : null;
                return (
                  <div key={team} className="rounded-lg border border-border p-3">
                    <p className="truncate text-xs font-semibold">{team}</p>
                    <dl className="mt-2 grid grid-cols-2 gap-1 text-center">
                      <div>
                        <dt className="text-[10px] text-muted-foreground">{t("drawer.scored")}</dt>
                        <dd className="font-display text-lg font-extrabold tnum">{gf ?? "–"}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">
                          {t("drawer.conceded")}
                        </dt>
                        <dd className="font-display text-lg font-extrabold tnum">{ga ?? "–"}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
            {(!home || home.played < 3 || !away || away.played < 3) && (
              <p className="mt-2 text-[11px] text-muted-foreground">{t("drawer.notEnough")}</p>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("drawer.h2hTitle")}
            </h3>
            {h2h.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("drawer.h2hNone")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                {h2h.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="text-[11px] text-muted-foreground tnum">
                      {formatDate(r.kickoff_at)}
                    </span>
                    <span className="min-w-0 truncate text-right">
                      {r.home}{" "}
                      <b className="tnum">
                        {r.home_score}–{r.away_score}
                      </b>{" "}
                      {r.away}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("drawer.crowdTitle")}
            </h3>
            {failed ? (
              <p className="text-sm text-muted-foreground">{t("drawer.error")}</p>
            ) : picks === null ? (
              <div
                className="h-16 animate-pulse rounded-lg bg-muted"
                aria-label={t("drawer.loading")}
              />
            ) : picks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("drawer.crowdNone")}</p>
            ) : (
              <CrowdSplit picks={picks} teams={{ home: fixture.home, away: fixture.away }} />
            )}
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("drawer.modelTitle")}
            </h3>
            <IntelPanel compact />
          </section>

          <p className="text-[11px] leading-snug text-muted-foreground">{t("drawer.source")}</p>

          <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-border bg-background p-4">
            <Button asChild className="flex-1">
              <Link to="/match/$fixtureId" params={{ fixtureId: fixture.id }}>
                {fixture.status === "scheduled" ? t("drawer.makePick") : t("drawer.openRoom")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
