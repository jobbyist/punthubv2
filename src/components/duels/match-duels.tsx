import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchDuels, type DuelSummary } from "@/lib/duels-data";

import { ChallengeDialog, type ChallengeFixture } from "./challenge-dialog";
import { DuelCard } from "./duel-card";

/** Duels on one match (open, live and settled) with a challenge button while the match is still open. */
export function MatchDuels({ fixture, open }: { fixture: ChallengeFixture; open: boolean }) {
  const { t } = useTranslation("duels");
  const [duels, setDuels] = useState<DuelSummary[] | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all((["open", "live", "settled"] as const).map((s) => fetchDuels(s, fixture.id, 12)))
      .then((lists) => live && setDuels(lists.flat()))
      .catch((e: unknown) => {
        console.error("match duels failed", e);
        if (live) setDuels([]);
      });
    return () => {
      live = false;
    };
  }, [fixture.id]);

  return (
    <section aria-labelledby="match-duels-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="match-duels-title" className="text-lg">
          {t("match.title")}
        </h2>
        {open && <ChallengeDialog fixtures={[fixture]} />}
      </div>
      {duels === null ? (
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : duels.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("match.none")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {duels.map((d) => (
            <li key={d.id}>
              <DuelCard duel={d} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
