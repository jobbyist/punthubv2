import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command as CommandPrimitive } from "cmdk";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  CornerDownLeft,
  FileText,
  Loader2,
  Search,
  Trophy,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { TeamLogo } from "@/components/team-logo";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/components/session";
import { trackEvent } from "@/lib/analytics";
import { fetchUpcomingFixtures, type UpcomingFixture } from "@/lib/fixtures";
import { formatDate, formatTime } from "@/lib/format";
import { fetchTableKeys } from "@/lib/hub-data";
import {
  clearRecent,
  normalise,
  pushRecent,
  readRecent,
  searchItems,
  type SearchGroup,
  type SearchItem,
  type SearchKind,
} from "@/lib/search-index";
import { competitions } from "@/lib/sports/competitions";
import { fetchStandings, type StandingRow } from "@/lib/standings-data";

/** Well-known South African nicknames, so "Bucs" or "Amakhosi" finds the club. */
const NICKNAMES: Record<string, string[]> = {
  "kaizer chiefs": ["amakhosi", "chiefs", "glamour boys"],
  "orlando pirates": ["bucs", "buccaneers", "pirates", "sea robbers"],
  "mamelodi sundowns": ["masandawana", "downs", "brazilians", "sundowns"],
  "supersport united": ["matsatsantsa", "united"],
  amazulu: ["usuthu"],
  "cape town city": ["citizens", "city"],
  stellenbosch: ["stellies"],
  "golden arrows": ["abafana bes'thende", "arrows"],
  "sekhukhune united": ["babina noko"],
  "polokwane city": ["rise and shine"],
  "chippa united": ["chilli boys"],
  "richards bay": ["natal rich boyz"],
  "ts galaxy": ["rockets", "galaxy"],
  magesi: ["dikwena tša meetse"],
  "marumo gallants": ["bahlabane ba ntwa"],
  "durban city": ["the citizens"],
  siwelele: ["siwelele"],
  "orbit college": ["orbit"],
  "manchester united": ["man utd", "man united", "red devils"],
  "manchester city": ["man city", "citizens"],
  "tottenham hotspur": ["spurs"],
  arsenal: ["gunners"],
  liverpool: ["reds"],
  chelsea: ["blues"],
};

/** Pages members look for most. Titles come from nav.search.pages.<key>; keywords stay English synonyms. */
const PAGES: {
  key: string;
  to: string;
  keywords: string[];
  signedIn?: boolean;
  guest?: boolean;
}[] = [
  { key: "discover", to: "/discover", keywords: ["home", "hub", "start", "matches"] },
  {
    key: "fixtures",
    to: "/fixtures",
    keywords: ["matches", "games", "schedule", "kick-off", "upcoming"],
  },
  { key: "results", to: "/results", keywords: ["scores", "graded", "settled", "full time"] },
  { key: "tables", to: "/tables", keywords: ["standings", "log", "league table", "position"] },
  { key: "liveScores", to: "/live-scores", keywords: ["live", "in play", "scores"] },
  {
    key: "soccer",
    to: "/sports/soccer",
    keywords: ["football", "leagues", "coverage", "psl", "epl"],
  },
  {
    key: "leaderboards",
    to: "/leaderboards",
    keywords: ["rankings", "top tipsters", "best", "leaders"],
  },
  { key: "duels", to: "/duels", keywords: ["head to head", "h2h", "challenge", "versus"] },
  { key: "practice", to: "/practice", keywords: ["practice mode", "demo", "virtual", "arena"] },
  { key: "slips", to: "/slips", keywords: ["betting slip", "upload", "convert", "bet slip"] },
  { key: "community", to: "/forum", keywords: ["forum", "discuss", "chat", "community"] },
  { key: "newsroom", to: "/newsroom", keywords: ["news", "articles", "previews", "blog"] },
  { key: "rewards", to: "/rewards", keywords: ["puntpoints", "vouchers", "perks", "points"] },
  { key: "puntpoints", to: "/puntpoints", keywords: ["points", "loyalty", "how points work"] },
  { key: "tools", to: "/tools", keywords: ["odds converter", "calculator", "tools"] },
  {
    key: "howItWorks",
    to: "/how-it-works",
    keywords: ["guide", "help", "explained", "what is puntr"],
  },
  {
    key: "roadmap",
    to: "/roadmap",
    keywords: ["coming soon", "rugby", "basketball", "tennis", "cricket"],
  },
  {
    key: "founding",
    to: "/founding",
    keywords: ["founding member", "early access", "annual pass"],
    guest: true,
  },
  {
    key: "join",
    to: "/join",
    keywords: ["sign up", "register", "sign in", "log in", "account"],
    guest: true,
  },
  {
    key: "profile",
    to: "/account",
    keywords: ["account", "settings", "favourites", "profile"],
    signedIn: true,
  },
  {
    key: "wallet",
    to: "/wallet",
    keywords: ["credits", "balance", "pro", "billing"],
    signedIn: true,
  },
  { key: "referrals", to: "/referrals", keywords: ["invite", "refer a friend"] },
  { key: "support", to: "/support", keywords: ["help", "contact", "faq", "problem"] },
  {
    key: "responsiblePlay",
    to: "/responsible-play",
    keywords: ["take a break", "limits", "helpline", "gambling"],
  },
  { key: "bookmakers", to: "/bookmakers", keywords: ["licensed", "betting sites", "operators"] },
  { key: "about", to: "/about", keywords: ["who we are", "company"] },
];

/** Shown before the member types: quick jumps that match what most people open next. */
const POPULAR_GUEST = ["discover", "fixtures", "howItWorks", "leaderboards", "join"];
const POPULAR_MEMBER = ["discover", "fixtures", "duels", "practice", "leaderboards"];

const KIND_ICON: Record<SearchKind, typeof Search> = {
  team: Trophy,
  fixture: CalendarDays,
  competition: Trophy,
  page: FileText,
};

export function SiteSearch() {
  const { t } = useTranslation("nav");
  const navigate = useNavigate();
  const { isSignedIn } = useSession();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>([]);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on ⌘K / Ctrl+K, on "/" outside text fields, and from openSiteSearch() anywhere in the app.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === "/" && !typing) {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = (event: Event) => {
      const initial = (event as CustomEvent<{ initial?: string }>).detail?.initial;
      if (initial) setQuery(initial);
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("puntr:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("puntr:open-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    trackEvent("search_opened", { authenticated: isSignedIn });
  }, [open, isSignedIn]);

  // Fixtures and tables load once, the first time search opens, so the header costs nothing on page load.
  // A ref (not state) guards the fetch: with state in the deps, the effect's own setLoading(true) re-ran it and
  // its cleanup discarded the result, leaving search stuck on "loading".
  const fetchStarted = useRef(false);
  useEffect(() => {
    if (!open || fetchStarted.current) return;
    fetchStarted.current = true;
    setLoading(true);
    Promise.all([
      fetchUpcomingFixtures({ days: 45, limit: 400 }).catch(() => [] as UpcomingFixture[]),
      fetchTableKeys()
        .then((keys) =>
          Promise.all(keys.map((key) => fetchStandings(key).catch(() => [] as StandingRow[]))),
        )
        .then((rows) => rows.flat())
        .catch(() => [] as StandingRow[]),
    ])
      .then(([nextFixtures, nextStandings]) => {
        setFixtures(nextFixtures);
        setStandings(nextStandings);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const items = useMemo<SearchItem[]>(() => {
    const pages: SearchItem[] = PAGES.filter((p) =>
      p.signedIn ? isSignedIn : p.guest ? !isSignedIn : true,
    ).map((p) => ({
      id: p.key,
      kind: "page",
      title: t(`search.pages.${p.key}.title`),
      subtitle: t(`search.pages.${p.key}.sub`),
      to: p.to,
      keywords: p.keywords,
    }));
    const leagues: SearchItem[] = competitions
      .filter((c) => c.sport === "soccer")
      .map((c) => ({
        id: c.key,
        kind: "competition",
        title: c.name,
        subtitle: t("search.competitionSub"),
        to: "/fixtures",
        search: { competition: c.name },
        keywords: [c.key, ...c.searches],
      }));
    const nextByTeam = new Map<string, UpcomingFixture>();
    for (const f of fixtures) {
      if (!nextByTeam.has(f.home)) nextByTeam.set(f.home, f);
      if (!nextByTeam.has(f.away)) nextByTeam.set(f.away, f);
    }
    const positionByTeam = new Map(standings.map((row) => [row.team, row.position]));
    const teams: SearchItem[] = [...nextByTeam.entries()].map(([team, f]) => {
      const position = positionByTeam.get(team);
      return {
        id: team,
        kind: "team",
        title: team,
        subtitle: [
          t("search.nextMatch", { home: f.home, away: f.away, date: formatDate(f.kickoff_at) }),
          position ? t("search.position", { position }) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        to: "/match/$fixtureId",
        params: { fixtureId: f.id },
        keywords: NICKNAMES[team.toLowerCase()] ?? [],
      };
    });
    const matches: SearchItem[] = fixtures.map((f) => ({
      id: f.id,
      kind: "fixture",
      title: `${f.home} vs ${f.away}`,
      subtitle: `${f.competition} · ${formatDate(f.kickoff_at)}, ${formatTime(f.kickoff_at)}`,
      to: "/match/$fixtureId",
      params: { fixtureId: f.id },
      keywords: [
        ...(NICKNAMES[f.home.toLowerCase()] ?? []),
        ...(NICKNAMES[f.away.toLowerCase()] ?? []),
      ],
    }));
    return [...teams, ...matches, ...leagues, ...pages];
  }, [fixtures, standings, isSignedIn, t]);

  const groups: SearchGroup[] = useMemo(
    () => searchItems(items, query, { team: 5, fixture: 4, competition: 3, page: 4 }),
    [items, query],
  );

  const popular = useMemo(() => {
    const keys = isSignedIn ? POPULAR_MEMBER : POPULAR_GUEST;
    return keys
      .map((key) => items.find((item) => item.kind === "page" && item.id === key))
      .filter(Boolean) as SearchItem[];
  }, [items, isSignedIn]);

  const upcoming = useMemo(() => fixtures.slice(0, 3), [fixtures]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const go = (item: SearchItem) => {
    if (query.trim()) setRecent(pushRecent(query));
    trackEvent("search_result_selected", { kind: item.kind, has_query: query.trim().length > 0 });
    close();
    void navigate({
      to: item.to as never,
      params: item.params as never,
      search: item.search as never,
    });
  };

  const term = query.trim();

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
        className="left-0 top-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:left-[50%] sm:top-[12vh] sm:h-auto sm:max-h-[76vh] sm:max-w-2xl sm:translate-x-[-50%] sm:rounded-2xl sm:border [&>button:last-child]:hidden"
      >
        <DialogTitle className="sr-only">{t("search.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search.description")}</DialogDescription>
        <CommandPrimitive shouldFilter={false} loop className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 pt-[env(safe-area-inset-top)] sm:px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder={t("search.placeholder")}
              aria-label={t("search.title")}
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:h-16"
            />
            {loading && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
            )}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label={t("search.clear")}
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-primary hover:bg-muted sm:hidden"
            >
              {t("search.cancel")}
            </button>
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline">
              Esc
            </kbd>
          </div>

          <CommandPrimitive.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:max-h-[60vh]">
            {term.length === 0 && (
              <>
                {recent.length > 0 && (
                  <CommandPrimitive.Group
                    heading={
                      <span className="flex items-center justify-between">
                        {t("search.recent")}
                        <button
                          type="button"
                          onClick={() => {
                            clearRecent();
                            setRecent([]);
                          }}
                          className="text-[11px] font-semibold normal-case tracking-normal text-primary hover:underline"
                        >
                          {t("search.clearRecent")}
                        </button>
                      </span>
                    }
                    className={GROUP_CLASS}
                  >
                    {recent.map((value) => (
                      <CommandPrimitive.Item
                        key={value}
                        value={`recent:${value}`}
                        onSelect={() => setQuery(value)}
                        className={ITEM_CLASS}
                      >
                        <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate">{value}</span>
                      </CommandPrimitive.Item>
                    ))}
                  </CommandPrimitive.Group>
                )}
                <CommandPrimitive.Group heading={t("search.popular")} className={GROUP_CLASS}>
                  {popular.map((item) => (
                    <ResultRow key={item.id} item={item} onSelect={go} />
                  ))}
                </CommandPrimitive.Group>
                {upcoming.length > 0 && (
                  <CommandPrimitive.Group heading={t("search.upNext")} className={GROUP_CLASS}>
                    {upcoming.map((f) => (
                      <ResultRow
                        key={f.id}
                        item={{
                          id: f.id,
                          kind: "fixture",
                          title: `${f.home} vs ${f.away}`,
                          subtitle: `${f.competition} · ${formatDate(f.kickoff_at)}, ${formatTime(f.kickoff_at)}`,
                          to: "/match/$fixtureId",
                          params: { fixtureId: f.id },
                        }}
                        onSelect={go}
                      />
                    ))}
                  </CommandPrimitive.Group>
                )}
                <p className="px-3 pb-2 pt-3 text-xs text-muted-foreground">{t("search.hint")}</p>
              </>
            )}

            {term.length > 0 &&
              groups.map((group) => (
                <CommandPrimitive.Group
                  key={group.kind}
                  heading={t(`search.kind.${group.kind}`)}
                  className={GROUP_CLASS}
                >
                  {group.items.map((item) => (
                    <ResultRow
                      key={`${item.kind}:${item.id}`}
                      item={item}
                      query={term}
                      onSelect={go}
                    />
                  ))}
                </CommandPrimitive.Group>
              ))}

            {term.length > 0 && groups.length === 0 && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold">
                  {loading ? t("search.loading") : t("search.empty", { query: term })}
                </p>
                {!loading && (
                  <p className="mt-1 text-xs text-muted-foreground">{t("search.emptyHint")}</p>
                )}
              </div>
            )}
          </CommandPrimitive.List>

          <div className="hidden items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground sm:flex">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border px-1">↑</kbd>
              <kbd className="rounded border border-border px-1">↓</kbd> {t("search.keys.move")}
            </span>
            <span className="inline-flex items-center gap-1">
              <CornerDownLeft className="size-3" /> {t("search.keys.open")}
            </span>
            <span className="ml-auto">{t("search.keys.shortcut")}</span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}

const GROUP_CLASS =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground";

const ITEM_CLASS =
  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[selected=true]:bg-primary-soft data-[selected=true]:text-foreground";

/** Bolds the part of the title that matches what the member typed. */
function Highlight({ text, query }: { text: string; query?: string | undefined }) {
  if (!query) return <>{text}</>;
  // Match accent-insensitively, like the ranking does ("atletico" highlights "Atlético"). Normalise one character
  // at a time so offsets in the normalised string map straight back onto the original text.
  const needle = normalise(query);
  if (!needle) return <>{text}</>;
  const chars = Array.from(text);
  const starts: number[] = [];
  let folded = "";
  chars.forEach((ch, i) => {
    const n = normalise(ch);
    for (let k = 0; k < n.length; k++) starts.push(i);
    folded += n;
  });
  const at = folded.indexOf(needle);
  if (at < 0) return <>{text}</>;
  const from = starts[at]!;
  const to = (starts[at + needle.length - 1] ?? chars.length - 1) + 1;
  return (
    <>
      {chars.slice(0, from).join("")}
      <mark className="bg-transparent font-bold text-primary">
        {chars.slice(from, to).join("")}
      </mark>
      {chars.slice(to).join("")}
    </>
  );
}

function ResultRow({
  item,
  query,
  onSelect,
}: {
  item: SearchItem;
  query?: string | undefined;
  onSelect: (item: SearchItem) => void;
}) {
  const Icon = KIND_ICON[item.kind];
  return (
    <CommandPrimitive.Item
      value={`${item.kind}:${item.id}`}
      onSelect={() => onSelect(item)}
      className={`group ${ITEM_CLASS}`}
    >
      {item.kind === "team" ? (
        <TeamLogo team={item.title} sport="soccer" size="sm" className="shrink-0" />
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground group-data-[selected=true]:bg-background group-data-[selected=true]:text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          <Highlight text={item.title} query={query} />
        </span>
        {item.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
        )}
      </span>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100"
        aria-hidden
      />
    </CommandPrimitive.Item>
  );
}
