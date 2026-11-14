import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { FixtureCard } from "@/components/fixture-card";
import { AnalyticsDrawer, type DrawerFixture } from "@/components/match/analytics-drawer";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { perMatch, type FinishedRow, type TeamForm } from "@/lib/match/form";

/** The one-line read under the matchup, only from recorded results and only with enough of them. */
export function useInsight(
  home: string,
  away: string,
  forms: Record<string, TeamForm>,
): string | null {
  const { t } = useTranslation("matchcard");
  const h = forms[home];
  const a = forms[away];
  const hgf = h ? perMatch(h.scored, h.played) : null;
  const aga = a ? perMatch(a.conceded, a.played) : null;
  if (hgf && aga) return t("insight.pair", { home, away, hgf, aga });
  const hga = h ? perMatch(h.conceded, h.played) : null;
  if (hgf && hga) return t("insight.home", { team: home, gf: hgf, ga: hga });
  return null;
}

/**
 * A real fixture as a card: kick-off pill, crests with last-5 form, a recorded-data insight line and an action
 * footer that opens the analytics sheet in place (no route change). `locked` hides the actions (guest blur).
 */
export function LiveMatchCard({
  fixture,
  forms,
  rows,
  sportLabel,
  locked = false,
  children,
}: {
  fixture: DrawerFixture;
  forms: Record<string, TeamForm>;
  rows: FinishedRow[];
  sportLabel?: string;
  locked?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation("matchcard");
  const [open, setOpen] = useState(false);
  const insight = useInsight(fixture.home, fixture.away, forms);

  return (
    <>
      <FixtureCard
        home={fixture.home}
        away={fixture.away}
        sport={fixture.sport}
        {...(sportLabel ? { sportLabel } : {})}
        competition={fixture.competition}
        status={fixture.status === "live" ? "live" : "upcoming"}
        vsLabel={t("vs")}
        pill={<KickoffPill kickoff={fixture.kickoff_at} status={fixture.status} />}
        form={{
          home: forms[fixture.home]?.entries ?? null,
          away: forms[fixture.away]?.entries ?? null,
        }}
        insight={insight}
        footer={
          locked ? undefined : (
            <>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-haspopup="dialog"
              >
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                {t("actions.analytics")}
              </button>
              <Link
                to="/match/$fixtureId"
                params={{ fixtureId: fixture.id }}
                className="group inline-flex items-center gap-1 font-semibold text-primary"
              >
                {t("actions.matchRoom")}
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </>
          )
        }
      >
        {children}
      </FixtureCard>
      {!locked && (
        <AnalyticsDrawer
          fixture={fixture}
          open={open}
          onOpenChange={setOpen}
          forms={forms}
          rows={rows}
        />
      )}
    </>
  );
}
