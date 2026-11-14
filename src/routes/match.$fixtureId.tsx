import { EmptyState } from "@/components/empty-state";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

import { CrowdSplit } from "@/components/crowd-split";
import { AppShell } from "@/components/layout/app-shell";
import { PickCard } from "@/components/pick-card";
import { PickForm } from "@/components/pick-form";
import { AnalyticsDrawer } from "@/components/match/analytics-drawer";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FormGuide } from "@/components/match/form-guide";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { useInsight } from "@/components/match/live-match-card";
import { TeamLogo } from "@/components/team-logo";
import { useNow } from "@/hooks/use-now";
import { useTeamForms } from "@/hooks/use-team-forms";
import { rememberRef } from "@/lib/ref-store";
import { formatDate, formatTime } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import { fetchFixture, fetchPicksForFixture, type PickRow } from "@/lib/pick-data";
import { countdownTo, formatSpan } from "@/lib/picks";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/match/$fixtureId")({
  validateSearch: (search: Record<string, unknown>): { ref?: string } =>
    typeof search["ref"] === "string" && search["ref"] ? { ref: search["ref"].slice(0, 32) } : {},
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
  const { t: tm } = useTranslation("matchcard");
  const { fixture } = Route.useLoaderData();
  const [drawer, setDrawer] = useState(false);
  const { forms, rows } = useTeamForms([fixture.home, fixture.away]);
  const insight = useInsight(fixture.home, fixture.away, forms);
  const now = useNow();
  const { ref } = Route.useSearch();
  // A shared pick link carries the sharer's invite code, kept until the visitor joins.
  useEffect(() => rememberRef(ref), [ref]);

  const [picks, setPicks] = useState<PickRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      setPicks(await fetchPicksForFixture(fixture.id));
    } catch (error) {
      console.error("picks load failed", error);
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

      <header className="card-surface relative isolate mt-4 overflow-hidden p-5 sm:p-7">
        <div
          className="dot-grid absolute inset-0 -z-10 opacity-50"
          style={{
            maskImage: "radial-gradient(ellipse at top, black 10%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at top, black 10%, transparent 70%)",
          }}
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            <CompetitionBadge name={fixture.competition} />
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              {tc(`sport.${fixture.sport}`)}
            </span>
          </span>
          <KickoffPill kickoff={fixture.kickoff_at} status={fixture.status} />
        </div>
        {/* One heading for the page; the two team names are parts of it. */}
        <h1 className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 text-base leading-tight sm:text-2xl">
          <span className="puntr-rise flex min-w-0 flex-col items-center gap-2 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-gradient-to-b from-muted to-transparent ring-1 ring-border sm:size-20">
              <TeamLogo
                team={fixture.home}
                sport={fixture.sport}
                size="lg"
                className="size-11 sm:size-14"
              />
            </span>
            <span className="break-words">{fixture.home}</span>
            <FormGuide team={fixture.home} entries={forms[fixture.home]?.entries} size="md" />
          </span>
          <span className="text-center">
            {fixture.status === "finished" &&
            fixture.home_score !== null &&
            fixture.away_score !== null ? (
              <span className="puntr-pop block font-display text-3xl font-extrabold tnum sm:text-4xl">
                {fixture.home_score} – {fixture.away_score}
              </span>
            ) : (
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {tc("vs")}
              </span>
            )}
          </span>
          <span
            className="puntr-rise flex min-w-0 flex-col items-center gap-2 text-center"
            style={{ ["--i" as string]: 1 }}
          >
            <span className="grid size-16 place-items-center rounded-full bg-gradient-to-b from-muted to-transparent ring-1 ring-border sm:size-20">
              <TeamLogo
                team={fixture.away}
                sport={fixture.sport}
                size="lg"
                className="size-11 sm:size-14"
              />
            </span>
            <span className="break-words">{fixture.away}</span>
            <FormGuide team={fixture.away} entries={forms[fixture.away]?.entries} size="md" />
          </span>
        </h1>
        {insight && (
          <p className="mx-auto mt-5 max-w-xl rounded-lg bg-muted/60 px-3 py-2 text-center text-xs text-muted-foreground">
            {insight}
          </p>
        )}
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
          >
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            {tm("actions.analytics")}
          </button>
        </div>
        <p className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
          <span className="tnum">
            {t("header.kickoff")}: {formatDate(fixture.kickoff_at)} ·{" "}
            {formatTime(fixture.kickoff_at)}
          </span>
          {statusLabel ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
              {statusLabel}
            </span>
          ) : (
            countdown?.state === "open" && (
              <span className="font-semibold text-primary tnum">
                {t("countdown.locksIn", { span: formatSpan(countdown) })}
              </span>
            )
          )}
        </p>
      </header>
      <AnalyticsDrawer
        fixture={fixture}
        open={drawer}
        onOpenChange={setDrawer}
        forms={forms}
        rows={rows}
      />

      <div className="mt-8 space-y-8">
        <PickForm fixture={fixture} onPosted={() => void load()} />

        {picks && <CrowdSplit picks={picks} teams={teams} />}

        <section aria-labelledby="picks-title">
          <h2 id="picks-title" className="mb-3 text-lg">
            {t("picks.title")}
          </h2>

          {picks && picks.length === 0 && (
            <EmptyState art="pitch" title={t("picks.title")} body={t("picks.empty")} />
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
