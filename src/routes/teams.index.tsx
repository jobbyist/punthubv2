import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Search, Users, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { AdSlot } from "@/components/ads/ad-units";
import { AppShell } from "@/components/layout/app-shell";
import { FilterChips, type FilterChip } from "@/components/match/filter-chips";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { FollowButton } from "@/components/teams/follow-button";
import { ordinal, TeamCrest, TeamDetail } from "@/components/teams/team-detail";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { withAdBreaks } from "@/lib/ads";
import { headT } from "@/lib/i18n/head";
import { soccerCoverage } from "@/lib/sports/coverage";
import { fetchDirectory, fetchFollowerCounts, type DirectoryTeam } from "@/lib/teams/directory";
import { useTeamFollows } from "@/lib/teams/follows";

interface Search {
  q?: string;
  comp?: string;
  team?: string;
}

const URL = "https://puntr.co.za/teams";
const PAGE = 60;

export const Route = createFileRoute("/teams/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    if (typeof s["q"] === "string" && s["q"].trim()) out.q = s["q"].slice(0, 60);
    if (typeof s["comp"] === "string" && /^[a-z0-9-]{2,30}$/.test(s["comp"])) out.comp = s["comp"];
    if (typeof s["team"] === "string" && /^[a-z0-9-]{1,90}$/.test(s["team"])) out.team = s["team"];
    return out;
  },
  loader: async () => {
    const [teams, followers] = await Promise.all([fetchDirectory(), fetchFollowerCounts()]);
    return { teams, followers };
  },
  head: ({ match, loaderData }) => {
    const t = headT(match.context.locale, "teams");
    const teams = loaderData?.teams ?? [];
    const selected = match.search.team
      ? teams.find((x) => x.slug === match.search.team)
      : undefined;
    const canonical = selected ? `${URL}/${selected.slug}` : URL;
    return {
      links: [{ rel: "canonical", href: canonical }],
      meta: [
        { title: t("meta.title") },
        { name: "description", content: t("meta.description") },
        { property: "og:title", content: t("meta.title") },
        { property: "og:description", content: t("meta.description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: URL },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "CollectionPage",
                name: t("meta.title"),
                description: t("meta.description"),
                url: URL,
                inLanguage: "en-ZA",
                isPartOf: { "@type": "WebSite", name: "Puntr", url: "https://puntr.co.za/" },
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: teams.length,
                  itemListElement: teams.slice(0, 200).map((x, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    url: `${URL}/${x.slug}`,
                    item: {
                      "@type": "SportsTeam",
                      name: x.name,
                      sport: "Football",
                      url: `${URL}/${x.slug}`,
                      ...(x.badge?.startsWith("https://") ? { logo: x.badge } : {}),
                    },
                  })),
                },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Puntr", item: "https://puntr.co.za/" },
                  { "@type": "ListItem", position: 2, name: t("breadcrumb"), item: URL },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: TeamsDirectory,
});

function TeamsDirectory() {
  const { t } = useTranslation("teams");
  const reduce = useReducedMotion();
  const { teams, followers } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/teams/" });
  const follows = useTeamFollows();
  const [limit, setLimit] = useState(PAGE);
  const q = search.q ?? "";
  const comp = search.comp ?? "all";

  const coverage = useMemo(() => soccerCoverage(), []);
  const chips: FilterChip[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const team of teams)
      for (const c of team.competitions) counts.set(c.key, (counts.get(c.key) ?? 0) + 1);
    const list: FilterChip[] = [{ key: "all", label: t("filters.all"), count: teams.length }];
    if (follows.isSignedIn && follows.available)
      list.push({ key: "following", label: t("filters.following"), count: follows.follows.length });
    for (const c of coverage)
      if (counts.get(c.key)) list.push({ key: c.key, label: c.name, count: counts.get(c.key)! });
    return list;
  }, [teams, coverage, follows.isSignedIn, follows.available, follows.follows.length, t]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return teams.filter((team) => {
      if (comp === "following" && !follows.isFollowing(team.key)) return false;
      if (comp !== "all" && comp !== "following" && !team.competitions.some((c) => c.key === comp))
        return false;
      if (n && !team.name.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [teams, q, comp, follows]);

  const selected = search.team ? teams.find((x) => x.slug === search.team) : undefined;
  const competitionsCovered = new Set(teams.flatMap((x) => x.competitions.map((c) => c.key))).size;

  const setSearch = (patch: Partial<Search>) =>
    void navigate({
      search: (prev) => {
        const next = { ...prev, ...patch };
        for (const k of Object.keys(next) as (keyof Search)[]) if (!next[k]) delete next[k];
        return next;
      },
      replace: true,
      resetScroll: false,
    });

  const open = (team: DirectoryTeam) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void navigate({ search: (prev) => ({ ...prev, team: team.slug }), resetScroll: false });
  };

  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Puntr
        </Link>{" "}
        / <span aria-current="page">{t("breadcrumb")}</span>
      </nav>

      <header className="relative isolate -mx-4 overflow-hidden border-b border-border px-4 pb-8 pt-4 sm:-mx-6 sm:px-6">
        <HeroBackdrop variant="grid" />
        <p className="inline-flex items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          <Users className="size-3.5" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.5vw,3.4rem)] leading-[1.02]">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("lead")}</p>
        <TeamStack teams={teams} />
        <dl className="mt-6 flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("stats.teams")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{teams.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("stats.competitions")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{competitionsCovered}</dd>
          </div>
          {follows.isSignedIn && follows.available && (
            <div>
              <dt className="text-xs text-muted-foreground">{t("stats.following")}</dt>
              <dd className="font-display text-2xl font-extrabold tnum">
                {follows.follows.length}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <label className="relative block">
          <span className="sr-only">{t("search.label")}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => {
              setLimit(PAGE);
              setSearch({ q: e.target.value });
            }}
            placeholder={t("search.placeholder")}
            className="h-11 pl-9 pr-9"
            enterKeyHint="search"
            autoComplete="off"
          />
          {q && (
            <button
              type="button"
              onClick={() => setSearch({ q: "" })}
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground"
              aria-label={t("search.clear")}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </label>
        <FilterChips
          id="team-comp"
          chips={chips}
          active={comp}
          onSelect={(k) => {
            setLimit(PAGE);
            setSearch({ comp: k === "all" ? "" : k });
          }}
          label={t("filters.label")}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
        {t("count", { count: shown.length })}
      </p>

      {shown.length === 0 ? (
        <div className="mt-6 card-surface p-6 text-center">
          <p className="font-semibold">{t("empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {comp === "following" ? t("empty.following") : t("empty.body")}
          </p>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false}>
            {withAdBreaks(shown.slice(0, limit), 12).map((entry, i) =>
              entry.kind === "ad" ? (
                <li key={`ad-${entry.index}`}>
                  <AdSlot placement="teams-grid" format="card" seed={entry.index} />
                </li>
              ) : (
                <motion.li
                  key={entry.item.key}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : Math.min(i, 12) * 0.025 }}
                >
                  <TeamCard team={entry.item} onOpen={open(entry.item)} follows={follows} />
                </motion.li>
              ),
            )}
          </AnimatePresence>
        </ul>
      )}
      {shown.length > limit && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="border border-border px-5 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
          >
            {t("count", { count: shown.length - limit })} +
          </button>
        </div>
      )}

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o)
            void navigate({
              search: ({ team: _drop, ...rest }) => rest,
              resetScroll: false,
            });
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-5 max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 sm:max-w-lg">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.name}</DialogTitle>
              <TeamDetail
                team={selected}
                follows={follows}
                followers={followers[selected.key]}
                source="directory_modal"
                showPageLink
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function TeamCard({
  team,
  onOpen,
  follows,
}: {
  team: DirectoryTeam;
  onOpen: (e: MouseEvent) => void;
  follows: ReturnType<typeof useTeamFollows>;
}) {
  const { t } = useTranslation("teams");
  const s = team.standing;
  return (
    <div className="card-surface group relative flex h-full items-center gap-3 p-3 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow">
      <TeamCrest
        team={team}
        size={48}
        className="transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-110"
      />
      <span className="min-w-0 flex-1">
        <a
          href={`/teams/${team.slug}`}
          onClick={onOpen}
          className="block truncate font-display text-sm font-bold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {team.name}
        </a>
        <span className="block truncate text-[11px] text-muted-foreground">
          {s
            ? t("card.position", { pos: ordinal(s.position), competition: s.competition })
            : (team.competitions[0]?.name ?? "")}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {team.nextFixture
            ? t("card.next", {
                venue: team.nextFixture.venue === "H" ? t("card.vs") : t("card.at"),
                opponent: team.nextFixture.opponent,
              })
            : t("card.noFixture")}
        </span>
      </span>
      <FollowButton
        team={team}
        follows={follows}
        source="directory_card"
        className="relative z-10"
      />
    </div>
  );
}

/** Overlapping crests that fan out on load: a quick visual of who is in the directory. */
function TeamStack({ teams }: { teams: DirectoryTeam[] }) {
  const reduce = useReducedMotion();
  const crests = teams
    .filter((x) => x.badge && x.standing && x.standing.position <= 2)
    .slice(0, 10);
  if (crests.length < 4) return null;
  return (
    <ul className="mt-5 flex" aria-hidden="true">
      {crests.map((team, i) => (
        <motion.li
          key={team.key}
          className="-ml-3 first:ml-0"
          initial={reduce ? false : { opacity: 0, x: -24, rotate: -20 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.1 + i * 0.05 }}
        >
          <TeamCrest team={team} size={40} className="shadow-sm" />
        </motion.li>
      ))}
    </ul>
  );
}
