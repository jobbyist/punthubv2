import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { ArrowRight, LayoutGrid, List, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { EmptyState } from "@/components/empty-state";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { AnalyticsDrawer } from "@/components/match/analytics-drawer";
import { CompetitionBadge } from "@/components/match/competition-badge";
import { FilterChips, type FilterChip } from "@/components/match/filter-chips";
import { FormGuide } from "@/components/match/form-guide";
import { KickoffPill } from "@/components/match/kickoff-pill";
import { LiveMatchCard } from "@/components/match/live-match-card";
import { TeamLogo } from "@/components/team-logo";
import { Button } from "@/components/ui/button";
import { useTeamForms } from "@/hooks/use-team-forms";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatDate, formatShortDay, formatTime, saDayKey } from "@/lib/format";
import { headT } from "@/lib/i18n/head";
import type { FinishedRow, TeamForm } from "@/lib/match/form";
import {
  REGIONS,
  TRACKED_COMPETITIONS,
  competitionMeta,
  type CompetitionRegion,
} from "@/lib/match/competition-meta";
import { competitions } from "@/lib/sports/competitions";
import { cn } from "@/lib/utils";

type View = "cards" | "list";
type Group = "day" | "competition";
type Search = {
  q?: string;
  day?: string;
  region?: CompetitionRegion;
  comp?: string;
  view?: View;
  group?: Group;
};

export const Route = createFileRoute("/fixtures")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["q"] === "string" && s["q"].trim()) out.q = s["q"].slice(0, 60);
    if (typeof s["day"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s["day"])) out.day = s["day"];
    if (typeof s["region"] === "string" && (REGIONS as string[]).includes(s["region"]))
      out.region = s["region"] as CompetitionRegion;
    if (typeof s["comp"] === "string" && s["comp"]) out.comp = s["comp"].slice(0, 80);
    if (s["view"] === "list") out.view = "list";
    if (s["group"] === "competition") out.group = "competition";
    return out;
  },
  loader: async () => {
    try {
      return { fixtures: await fetchUpcomingFixtures({ days: 14, limit: 400 }), failed: false };
    } catch (error) {
      console.error("fixtures load failed", error);
      return { fixtures: [] as UpcomingFixture[], failed: true };
    }
  },
  head: ({ match, loaderData }) => {
    const t = headT(match.context.locale, "fixtures");
    const events = (loaderData?.fixtures ?? []).slice(0, 50).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SportsEvent",
        name: `${f.home} vs ${f.away}`,
        startDate: f.kickoff_at,
        sport: "Football",
        url: `https://puntr.co.za/match/${f.id}`,
        homeTeam: { "@type": "SportsTeam", name: f.home },
        awayTeam: { "@type": "SportsTeam", name: f.away },
        superEvent: { "@type": "SportsEvent", name: f.competition },
      },
    }));
    return {
      links: [{ rel: "canonical", href: "https://puntr.co.za/fixtures" }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.ogTitle") },
        { property: "og:description", content: t("meta.ogDescription") },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: t("title"),
            description: t("meta.description"),
            url: "https://puntr.co.za/fixtures",
            mainEntity: { "@type": "ItemList", itemListElement: events },
          }),
        },
      ],
    };
  },
  component: Fixtures,
});

const count = <T,>(items: T[], key: (x: T) => string) =>
  items.reduce((m, x) => m.set(key(x), (m.get(key(x)) ?? 0) + 1), new Map<string, number>());

function Fixtures() {
  const { t } = useTranslation("fixtures");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate({ from: "/fixtures" });
  const { fixtures, failed } = Route.useLoaderData();
  const search = Route.useSearch();
  const { q, day, region, comp } = search;
  const view: View = search.view ?? "cards";
  const group: Group = search.group ?? "day";
  const [draft, setDraft] = useState(q ?? "");

  const set = (patch: { [K in keyof Search]?: Search[K] | undefined }) =>
    void navigate({
      search: (prev) => {
        const next: Record<string, unknown> = { ...prev, ...patch };
        for (const k of Object.keys(next))
          if (next[k] === undefined || next[k] === "") delete next[k];
        return next as Search;
      },
      replace: true,
      resetScroll: false,
    });

  const needle = (q ?? "").trim().toLowerCase();
  const bySearch = fixtures.filter(
    (f) =>
      !needle ||
      f.home.toLowerCase().includes(needle) ||
      f.away.toLowerCase().includes(needle) ||
      f.competition.toLowerCase().includes(needle),
  );
  const byRegion = bySearch.filter(
    (f) => !region || competitionMeta(f.competition).region === region,
  );
  const byComp = byRegion.filter((f) => !comp || f.competition === comp);
  const shown = byComp.filter((f) => !day || saDayKey(f.kickoff_at) === day);

  // Each filter row counts what the other filters leave, so a chip never promises matches that are not there.
  const dayCounts = count(byComp, (f) => saDayKey(f.kickoff_at));
  const days = [...dayCounts.keys()].sort();
  const regionCounts = count(bySearch, (f) => competitionMeta(f.competition).region);
  const compCounts = count(byRegion, (f) => f.competition);
  const liveCount = fixtures.filter((f) => f.status === "live").length;
  const allComps = new Set(fixtures.map((f) => f.competition));

  const groups = useMemo(() => {
    const out = new Map<string, UpcomingFixture[]>();
    for (const f of shown) {
      const key = group === "day" ? saDayKey(f.kickoff_at) : f.competition;
      out.set(key, [...(out.get(key) ?? []), f]);
    }
    const entries = [...out.entries()];
    if (group === "competition") {
      const order = (name: string) => {
        const key = competitionMeta(name).key;
        const i = TRACKED_COMPETITIONS.indexOf(
          (key ?? "") as (typeof TRACKED_COMPETITIONS)[number],
        );
        return i === -1 ? 999 : i;
      };
      entries.sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]));
    }
    return entries;
  }, [shown, group]);

  const { forms, rows } = useTeamForms(shown.slice(0, 120).flatMap((f) => [f.home, f.away]));
  const filtered = Boolean(q || day || region || comp);

  const regionChips: FilterChip[] = [
    { key: "@all", label: t("regions.all"), count: bySearch.length },
    ...REGIONS.filter((r) => regionCounts.get(r)).map((r) => ({
      key: r,
      label: t(`regions.${r}`),
      count: regionCounts.get(r) ?? 0,
    })),
  ];
  const compChips: FilterChip[] = [
    { key: "@all", label: t("competitions.all"), count: byRegion.length },
    ...[...compCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, n]) => ({ key: name, label: name, count: n })),
  ];
  const dayChips: FilterChip[] = [
    { key: "@all", label: t("dates.all"), count: byComp.length },
    ...days.map((d) => ({
      key: d,
      label: formatShortDay(`${d}T12:00:00Z`),
      count: dayCounts.get(d) ?? 0,
    })),
  ];

  return (
    <AppShell>
      <PageHeading art="pitch" title={t("title")} subtitle={t("subtitle")} />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-ink px-3 py-1.5 font-semibold text-ink-foreground tnum">
          {t("stats.fixtures", { count: fixtures.length })}
        </span>
        <span className="rounded-full bg-muted px-3 py-1.5 font-semibold tnum">
          {t("stats.competitions", { count: allComps.size })}
        </span>
        <span className="rounded-full bg-muted px-3 py-1.5 font-semibold">{t("stats.window")}</span>
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-bold text-primary-foreground tnum">
            <span
              className="puntr-blink size-1.5 rounded-full bg-primary-foreground"
              aria-hidden="true"
            />
            {t("stats.live", { count: liveCount })}
          </span>
        )}
      </div>

      <div className="card-surface mb-8 space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form
            role="search"
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: draft.trim() || undefined });
            }}
          >
            <label htmlFor="fixture-search" className="sr-only">
              {t("search.label")}
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              id="fixture-search"
              type="search"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                set({ q: e.target.value.trim() || undefined });
              }}
              placeholder={t("search.placeholder")}
              className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            {draft && (
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  set({ q: undefined });
                }}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label={t("search.clear")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </form>
          <div className="flex gap-2">
            <Segmented
              label={t("group.label")}
              value={group}
              onChange={(v) => set({ group: v === "competition" ? "competition" : undefined })}
              options={[
                { key: "day", label: t("group.day") },
                { key: "competition", label: t("group.competition") },
              ]}
            />
            <Segmented
              label={t("view.label")}
              value={view}
              onChange={(v) => set({ view: v === "list" ? "list" : undefined })}
              options={[
                { key: "cards", label: t("view.cards"), icon: <LayoutGrid className="size-4" /> },
                { key: "list", label: t("view.list"), icon: <List className="size-4" /> },
              ]}
            />
          </div>
        </div>

        {dayChips.length > 2 && (
          <FilterChips
            id="fixtures-days"
            chips={dayChips}
            active={day ?? "@all"}
            onSelect={(k) => set({ day: k === "@all" ? undefined : k })}
            label={t("dates.label")}
          />
        )}
        {regionChips.length > 2 && (
          <FilterChips
            id="fixtures-regions"
            chips={regionChips}
            active={region ?? "@all"}
            onSelect={(k) =>
              set({ region: k === "@all" ? undefined : (k as CompetitionRegion), comp: undefined })
            }
            label={t("regions.label")}
          />
        )}
        {compChips.length > 2 && (
          <FilterChips
            id="fixtures-comps"
            chips={compChips}
            active={comp ?? "@all"}
            onSelect={(k) => set({ comp: k === "@all" ? undefined : k })}
            label={t("competitions.label")}
          />
        )}

        {filtered && (
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="tnum" aria-live="polite">
              {t("results.showing", { count: shown.length, total: fixtures.length })}
            </span>
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => {
                setDraft("");
                set({ q: undefined, day: undefined, region: undefined, comp: undefined });
              }}
            >
              {t("results.reset")}
            </button>
          </div>
        )}
      </div>

      {shown.length === 0 && (
        <EmptyState
          art="pitch"
          title={t("empty.title")}
          body={fixtures.length === 0 || failed ? t("empty.none") : t("empty.body")}
        />
      )}

      <MotionConfig reducedMotion="user">
        <LayoutGroup id="fixtures-grid">
          <div className="space-y-10">
            <AnimatePresence initial={false} mode="popLayout">
              {groups.map(([key, items]) => (
                <motion.section
                  key={`${group}-${key}`}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-label={group === "day" ? formatDate(items[0]!.kickoff_at) : key}
                >
                  <h2 className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group === "day" ? (
                      <>
                        <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
                        {formatDate(items[0]!.kickoff_at)}
                      </>
                    ) : (
                      <CompetitionBadge name={key} className="normal-case" />
                    )}
                    <span className="h-px flex-1 bg-border" aria-hidden="true" />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tnum">
                      {items.length}
                    </span>
                  </h2>
                  {view === "cards" ? (
                    <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                      <AnimatePresence initial={false} mode="popLayout">
                        {items.map((f) => (
                          <motion.li
                            key={f.id}
                            layout
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            className="min-w-0"
                          >
                            <LiveMatchCard
                              fixture={f}
                              forms={forms}
                              rows={rows}
                              sportLabel={tc(`sport.${f.sport}`)}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  ) : (
                    <ul className="card-surface divide-y divide-border">
                      <AnimatePresence initial={false} mode="popLayout">
                        {items.map((f) => (
                          <motion.li
                            key={f.id}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <ListRow
                              fixture={f}
                              forms={forms}
                              rows={rows}
                              showComp={group === "day"}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        </LayoutGroup>
      </MotionConfig>

      <section className="card-surface mt-12 p-5 sm:p-6" aria-labelledby="coverage-title">
        <h2 id="coverage-title" className="text-lg">
          {t("coverage.title")}
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{t("coverage.body")}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TRACKED_COMPETITIONS.map((key) => {
            const name = competitions.find((c) => c.key === key)?.name ?? key;
            const has = allComps.has(name);
            return (
              <li key={key}>
                <button
                  type="button"
                  disabled={!has}
                  onClick={() => set({ comp: name, region: undefined, day: undefined })}
                  title={has ? undefined : t("coverage.quiet")}
                  className={cn(
                    "rounded-full border border-border px-3 py-1.5 transition-colors",
                    has ? "hover:border-primary" : "cursor-default opacity-50",
                  )}
                >
                  <CompetitionBadge name={name} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-xl bg-ink p-6 text-ink-foreground sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg">{t("cta.title")}</h2>
          <p className="mt-1 max-w-xl text-sm opacity-80">{t("cta.body")}</p>
        </div>
        <Button asChild>
          <Link to="/predictions">
            {t("cta.button")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </AppShell>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (key: string) => void;
  options: { key: string; label: string; icon?: ReactNode }[];
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
            value === o.key
              ? "bg-ink text-ink-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.icon && <span aria-hidden="true">{o.icon}</span>}
          <span className={o.icon ? "hidden sm:inline" : undefined}>{o.label}</span>
          {o.icon && <span className="sr-only sm:hidden">{o.label}</span>}
        </button>
      ))}
    </div>
  );
}

function ListRow({
  fixture: f,
  forms,
  rows,
  showComp,
}: {
  fixture: UpcomingFixture;
  forms: Record<string, TeamForm>;
  rows: FinishedRow[];
  showComp: boolean;
}) {
  const { t } = useTranslation("fixtures");
  const { t: tm } = useTranslation("matchcard");
  const [open, setOpen] = useState(false);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4">
      <div className="w-14 text-center">
        <p className="font-display text-sm font-extrabold tnum">
          {f.status === "live" ? tm("live") : formatTime(f.kickoff_at).replace(" SAST", "")}
        </p>
        {showComp && (
          <CompetitionBadge name={f.competition} showName={false} className="mt-1 justify-center" />
        )}
      </div>
      <Link
        to="/match/$fixtureId"
        params={{ fixtureId: f.id }}
        className="min-w-0 space-y-1.5 rounded-md hover:bg-muted/40"
        aria-label={`${f.home} vs ${f.away}, ${t("list.open")}`}
      >
        {[f.home, f.away].map((team) => (
          <span key={team} className="flex min-w-0 items-center gap-2">
            <TeamLogo team={team} sport={f.sport} size="sm" className="size-6" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team}</span>
            <span className="hidden sm:block">
              <FormGuide team={team} entries={forms[team]?.entries} align="end" />
            </span>
          </span>
        ))}
      </Link>
      <div className="flex flex-col items-end gap-1.5">
        <KickoffPill kickoff={f.kickoff_at} status={f.status} className="hidden md:inline-flex" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold hover:border-primary hover:text-primary"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          {t("list.analytics")}
        </button>
      </div>
      <AnalyticsDrawer fixture={f} open={open} onOpenChange={setOpen} forms={forms} rows={rows} />
    </div>
  );
}
