import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CrowdSplit } from "@/components/crowd-split";
import { AppShell } from "@/components/layout/app-shell";
import { PickCard } from "@/components/pick-card";
import { PickForm } from "@/components/pick-form";
import { TeamLogo } from "@/components/team-logo";
import { useNow } from "@/hooks/use-now";
import { formatDate, formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchFixture, fetchPicksForFixture, type PickRow } from "@/lib/pick-data";
import { countdownTo, formatSpan } from "@/lib/picks";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/match/$fixtureId")({
  loader: async ({ params }) => {
    if (!UUID.test(params.fixtureId)) throw notFound();
    const fixture = await fetchFixture(params.fixtureId);
    if (!fixture) throw notFound();
    return { fixture };
  },
  head: ({ match, loaderData, params }) => {
    const t = headT(match.context.locale, "match");
    const f = loaderData?.fixture;
    if (!f) return { meta: [{ title: t("meta.notFound") }] };
    const vars = { home: f.home, away: f.away, competition: f.competition };
    return {
      links: [{ rel: "canonical", href: `https://puntr.co.za/match/${params.fixtureId}` }],
      meta: [
        { title: t("meta.title", vars) },
        { name: "description", content: t("meta.description", vars) },
        { property: "og:title", content: t("meta.title", vars) },
        { property: "og:description", content: t("meta.description", vars) },
      ],
    };
  },
  notFoundComponent: MatchNotFound,
  component: Match,
});

function MatchNotFound() {
  const { t } = useTranslation("match");
  return (
    <AppShell>
      <h1 className="text-2xl">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("notFound.body")}</p>
      <Link to="/predictions" className="mt-4 inline-block text-sm text-primary underline">
        {t("notFound.cta")}
      </Link>
    </AppShell>
  );
}

function Match() {
  const { t } = useTranslation("match");
  const { t: tc } = useTranslation("common");
  const { fixture } = Route.useLoaderData();
  const now = useNow();

  const [picks, setPicks] = useState<PickRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setPicks(await fetchPicksForFixture(fixture.id));
      setFailed(false);
    } catch (error) {
      console.error("picks load failed", error);
      setFailed(true);
    }
  }, [fixture.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const teams = { home: fixture.home, away: fixture.away };
  const countdown = now ? countdownTo(fixture.kickoff_at, now) : null;
  const statusLabel =
    fixture.status === "live"
      ? t("header.live")
      : fixture.status === "finished"
        ? t("header.finished")
        : fixture.status === "postponed" ||
            fixture.status === "abandoned" ||
            fixture.status === "cancelled"
          ? t(`header.${fixture.status}`)
          : null;

  return (
    <AppShell>
      <Link to="/predictions" className="text-sm text-muted-foreground hover:text-foreground">
        ← {t("back")}
      </Link>

      <header className="card-surface mt-3 p-5">
        <p className="text-xs text-muted-foreground">
          {fixture.competition} · {tc(`sport.${fixture.sport}`)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TeamLogo team={fixture.home} size="lg" />
            <h1 className="break-words text-lg leading-tight sm:text-2xl">{fixture.home}</h1>
          </div>
          <span className="text-xs font-semibold uppercase text-muted-foreground">{tc("vs")}</span>
          <div className="flex min-w-0 items-center justify-end gap-3">
            <h1 className="break-words text-right text-lg leading-tight sm:text-2xl">
              {fixture.away}
            </h1>
            <TeamLogo team={fixture.away} size="lg" />
          </div>
        </div>
        {fixture.status === "finished" &&
          fixture.home_score !== null &&
          fixture.away_score !== null && (
            <p className="mt-3 text-center font-display text-2xl font-extrabold tnum">
              {fixture.home_score} – {fixture.away_score}
            </p>
          )}
        <p className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="tnum">
            {t("header.kickoff")}: {formatDate(fixture.kickoff_at)} ·{" "}
            {formatTime(fixture.kickoff_at)}
          </span>
          {statusLabel ? (
            <span className="bg-muted px-2 py-1 text-xs font-semibold">{statusLabel}</span>
          ) : (
            countdown?.state === "open" && (
              <span className="font-semibold text-primary tnum">
                {t("countdown.locksIn", { span: formatSpan(countdown) })}
              </span>
            )
          )}
        </p>
      </header>

      <div className="mt-6 space-y-6">
        <PickForm fixture={fixture} onPosted={() => void load()} />

        {picks && <CrowdSplit picks={picks} teams={teams} />}

        <section aria-labelledby="picks-title">
          <h2 id="picks-title" className="mb-3 text-lg">
            {t("picks.title")}
          </h2>
          {failed && <p className="text-sm text-destructive">{t("picks.loadError")}</p>}
          {picks && picks.length === 0 && (
            <p className="card-surface p-5 text-sm text-muted-foreground">{t("picks.empty")}</p>
          )}
          <div className="space-y-4">
            {[...(picks ?? [])].reverse().map((p) => (
              <PickCard key={p.id} pick={p} teams={teams} kickoff={fixture.kickoff_at} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
