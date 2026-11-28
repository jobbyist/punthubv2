import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useAsync } from "@/hooks/use-async";
import { pct, points } from "@/lib/format";
import { fetchTopTipsters, offeredPlans } from "@/lib/tipster-support";

/** Tipsters open to supporters, most-backed first. Supporting happens on each tipster's record page. */
export function TipsterDiscover() {
  const { t } = useTranslation("tipster");
  const { data, loading, failed } = useAsync(() => fetchTopTipsters(24), []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }
  if (failed) return <EmptyState art="podium" title={t("errors.generic")} body="" />;
  if (data === null) return <EmptyState art="podium" title={t("notLive")} body="" />;
  if (!data || data.length === 0) {
    return <EmptyState art="podium" title={t("discover.empty")} body="" />;
  }

  return (
    <section aria-labelledby="discover-title">
      <h2 id="discover-title" className="mb-4 text-lg">
        {t("discover.title")}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((tip) => {
          const cheapest = offeredPlans(tip)
            .map((p) => p.price)
            .sort((a, b) => a - b)[0];
          return (
            <li key={tip.username} className="card-surface flex flex-col p-5">
              <div className="flex items-center gap-3">
                <UserAvatar
                  username={tip.username}
                  url={tip.avatar_url}
                  alt=""
                  className="size-11 text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">@{tip.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("card.supporters", { count: tip.supporters })}
                  </p>
                </div>
              </div>
              {tip.pitch && <p className="mt-3 text-sm text-muted-foreground">{tip.pitch}</p>}
              <p className="mt-3 text-xs text-muted-foreground">
                {tip.win_rate !== null && t("discover.winRate", { rate: pct(tip.win_rate, 0) })}
                {tip.win_rate !== null && " · "}
                {t("discover.settled", { count: tip.settled })}
              </p>
              {tip.form_last_10 && (
                <p className="mt-1 font-mono text-xs tracking-widest">{tip.form_last_10}</p>
              )}
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {cheapest !== undefined && (
                  <span className="text-sm font-semibold tnum">
                    {t("discover.from", { points: points(cheapest) })}
                  </span>
                )}
                <Button asChild size="sm" variant="outline">
                  <Link to="/u/$username" params={{ username: tip.username }}>
                    {t("discover.view")}
                  </Link>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
