import { Fragment, useMemo, type MouseEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import { AdSlot } from "@/components/ads/ad-units";
import { useAds } from "@/components/ads/ads-provider";
import { AppShell } from "@/components/layout/app-shell";
import { BookmakerDetail } from "@/components/bookmakers/bookmaker-detail";
import { BookmakerLogo } from "@/components/bookmakers/bookmaker-logo";
import { FilterChips, type FilterChip } from "@/components/match/filter-chips";
import { HeroBackdrop } from "@/components/motion/hero-backdrop";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { withAdBreaks } from "@/lib/ads";
import {
  bookmakerBySlug,
  bookmakerDirectory,
  NGB_REGISTER_URL,
  type BookmakerListing,
} from "@/lib/bookmaker-directory";
import { bookmakerProfile } from "@/lib/bookmaker-profiles";
import { pageWindow, paginate } from "@/lib/pagination";

type Sort = "popular" | "az";
type Licence = "sa" | "offshore";

interface BookmakersSearch {
  bookmaker?: string;
  q?: string;
  prov?: string;
  licence?: Licence;
  sort?: Sort;
  page?: number;
}

/** Bookmakers per page; an ad card sits after every AD_EVERY listings. */
const PER_PAGE = 12;
const AD_EVERY = 6;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const licenceOf = (b: BookmakerListing): Licence => b.licenceType ?? "sa";
const popularityRank = (b: BookmakerListing) => bookmakerProfile(b.slug).popularity?.rank ?? 999;

export const Route = createFileRoute("/bookmakers")({
  validateSearch: (s: Record<string, unknown>): BookmakersSearch => {
    const out: BookmakersSearch = {};
    if (typeof s["bookmaker"] === "string" && /^[a-z0-9-]{1,60}$/.test(s["bookmaker"]))
      out.bookmaker = s["bookmaker"];
    if (typeof s["q"] === "string" && s["q"].trim()) out.q = s["q"].slice(0, 60);
    if (typeof s["prov"] === "string" && /^[a-z0-9-]{2,40}$/.test(s["prov"])) out.prov = s["prov"];
    if (s["licence"] === "sa" || s["licence"] === "offshore") out.licence = s["licence"];
    if (s["sort"] === "az") out.sort = "az";
    const page = Number(s["page"]);
    if (Number.isInteger(page) && page > 1 && page < 100) out.page = page;
    return out;
  },
  head: ({ match }) => ({
    links: [
      {
        rel: "canonical",
        href:
          match.search.bookmaker && bookmakerBySlug(match.search.bookmaker)
            ? `https://puntr.co.za/bookmakers/${match.search.bookmaker}`
            : "https://puntr.co.za/bookmakers",
      },
    ],
    meta: [
      { title: "South African Bookmaker Directory | Puntr" },
      {
        name: "description",
        content:
          "Browse bookmaker licence-holder records published by South Africa's National Gambling Board. Check the regulator, province and licence reference before using any operator.",
      },
    ],
  }),
  component: BookmakersPage,
});

function BookmakersPage() {
  const { t } = useTranslation("bookmakers");
  const reduce = useReducedMotion();
  const ads = useAds();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/bookmakers" });
  const selected = search.bookmaker ? bookmakerBySlug(search.bookmaker) : undefined;
  const q = search.q ?? "";
  const prov = search.prov ?? "all";
  const licence = search.licence ?? "all";
  const sort: Sort = search.sort ?? "popular";

  const open = (item: BookmakerListing) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void navigate({ search: (prev) => ({ ...prev, bookmaker: item.slug }), resetScroll: false });
  };

  const setSearch = (
    patch: { [K in keyof BookmakersSearch]?: BookmakersSearch[K] | undefined },
    resetPage = true,
  ) =>
    void navigate({
      search: (prev) => {
        const next = { ...prev, ...patch } as BookmakersSearch;
        if (resetPage && !("page" in patch)) delete next.page;
        for (const k of Object.keys(next) as (keyof BookmakersSearch)[])
          if (next[k] === undefined || next[k] === "") delete next[k];
        return next;
      },
      replace: true,
      resetScroll: false,
    });

  const partnerSlugs = useMemo(
    () => new Set(ads.partners.map((p) => p.slug ?? slugify(p.name))),
    [ads.partners],
  );
  const isPartner = (b: BookmakerListing) => partnerSlugs.has(b.slug);

  const provinceChips: FilterChip[] = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const b of bookmakerDirectory) {
      const key = slugify(b.province);
      const v = counts.get(key) ?? { label: b.province, count: 0 };
      v.count += 1;
      counts.set(key, v);
    }
    return [
      { key: "all", label: t("list.filters.all"), count: bookmakerDirectory.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
        .map(([key, v]) => ({ key, label: v.label, count: v.count })),
    ];
  }, [t]);

  const licenceChips: FilterChip[] = useMemo(() => {
    const sa = bookmakerDirectory.filter((b) => licenceOf(b) === "sa").length;
    return [
      { key: "all", label: t("list.licence.all"), count: bookmakerDirectory.length },
      { key: "sa", label: t("list.licence.sa"), count: sa },
      { key: "offshore", label: t("list.licence.offshore"), count: bookmakerDirectory.length - sa },
    ];
  }, [t]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = bookmakerDirectory.filter((item) => {
      if (prov !== "all" && slugify(item.province) !== prov) return false;
      if (licence !== "all" && licenceOf(item) !== licence) return false;
      return (
        !term ||
        [item.name, item.licenceHolder, item.regulator, item.licenceReference].some((v) =>
          v.toLowerCase().includes(term),
        )
      );
    });
    return [...list].sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : popularityRank(a) - popularityRank(b) || a.name.localeCompare(b.name),
    );
  }, [q, prov, licence, sort]);

  const { pages, current, items } = paginate(filtered, search.page, PER_PAGE);
  const stats = useMemo(
    () => ({
      total: bookmakerDirectory.length,
      sa: bookmakerDirectory.filter((b) => licenceOf(b) === "sa").length,
      provinces: new Set(bookmakerDirectory.map((b) => b.province)).size,
      profiles: bookmakerDirectory.filter((b) => {
        const p = bookmakerProfile(b.slug);
        return Boolean(p.payments || p.popularity || p.externalRatings?.length);
      }).length,
    }),
    [],
  );
  const logoStack = useMemo(
    () =>
      [...bookmakerDirectory]
        .filter((b) => b.domain)
        .sort((a, b) => popularityRank(a) - popularityRank(b))
        .slice(0, 8),
    [],
  );
  const first = filtered.length ? (current - 1) * PER_PAGE + 1 : 0;
  const last = Math.min(current * PER_PAGE, filtered.length);

  return (
    <AppShell>
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:underline">
          Puntr
        </Link>{" "}
        / <span aria-current="page">{t("breadcrumb.directory")}</span>
      </nav>

      <header className="relative isolate -mx-4 overflow-hidden border-b border-border px-4 pb-8 pt-4 sm:-mx-6 sm:px-6">
        <HeroBackdrop variant="grid" />
        <p className="inline-flex items-center gap-2 border border-primary/30 bg-primary-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
          <Building2 className="size-3.5" aria-hidden="true" />
          {t("list.eyebrow")}
        </p>
        <h1 className="mt-4 text-[clamp(2.2rem,5.5vw,3.4rem)] leading-[1.02]">{t("list.title")}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{t("list.lead")}</p>
        <ul className="mt-5 flex" aria-hidden="true">
          {logoStack.map((b, i) => (
            <motion.li
              key={b.slug}
              className="-ml-2 first:ml-0"
              initial={reduce ? false : { opacity: 0, x: -24, rotate: -12 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 20, delay: 0.1 + i * 0.05 }}
            >
              <span className="block bg-background shadow-sm ring-2 ring-background">
                <BookmakerLogo item={b} />
              </span>
            </motion.li>
          ))}
        </ul>
        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:flex sm:flex-wrap sm:gap-8">
          <div>
            <dt className="text-xs text-muted-foreground">{t("list.stats.listed")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{stats.total}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("list.stats.sa")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{stats.sa}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("list.stats.provinces")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{stats.provinces}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("list.stats.profiles")}</dt>
            <dd className="font-display text-2xl font-extrabold tnum">{stats.profiles}</dd>
          </div>
        </dl>
      </header>

      <div className="sticky top-14 z-20 -mx-4 space-y-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-2">
          <label className="relative block flex-1">
            <span className="sr-only">{t("list.search.label")}</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
              placeholder={t("list.search.placeholder")}
              className="h-11 pl-9 pr-9"
              enterKeyHint="search"
              autoComplete="off"
            />
            {q && (
              <button
                type="button"
                onClick={() => setSearch({ q: "" })}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-muted-foreground hover:text-foreground"
                aria-label={t("list.search.clear")}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </label>
          <label className="block w-36 shrink-0 sm:w-44">
            <span className="sr-only">{t("list.sort.label")}</span>
            <select
              value={sort}
              onChange={(e) => setSearch({ sort: e.target.value === "az" ? "az" : undefined })}
              className="h-11 w-full border border-input bg-background px-2 text-sm"
            >
              <option value="popular">{t("list.sort.popular")}</option>
              <option value="az">{t("list.sort.az")}</option>
            </select>
          </label>
        </div>
        <FilterChips
          id="bookmaker-licence"
          chips={licenceChips}
          active={licence}
          onSelect={(k) => setSearch({ licence: k === "sa" || k === "offshore" ? k : undefined })}
          label={t("list.licence.label")}
        />
        <FilterChips
          id="bookmaker-province"
          chips={provinceChips}
          active={prov}
          onSelect={(k) => setSearch({ prov: k === "all" ? undefined : k })}
          label={t("list.filters.label")}
        />
      </div>

      <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
        {filtered.length
          ? t("list.showing", { first, last, total: filtered.length })
          : t("list.none")}
      </p>

      <AdSlot placement="bookmakers-list" format="text_link" className="mt-3" />

      <section aria-label={t("list.aria")} className="mt-3">
        {filtered.length === 0 ? (
          <div className="card-surface p-8 text-center">
            <h2 className="font-semibold">{t("list.empty.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("list.empty.body")}</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {withAdBreaks(items, AD_EVERY).map((entry) => {
              if (entry.kind === "ad") {
                return (
                  <AdSlot
                    key={`ad-${entry.index}`}
                    listItem
                    placement="bookmakers-list"
                    format="card"
                    seed={current * 10 + entry.index}
                  />
                );
              }
              const item = entry.item;
              const pop = bookmakerProfile(item.slug).popularity;
              return (
                <li
                  key={item.slug}
                  className="card-surface group relative min-w-0 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="flex items-center gap-3">
                    <BookmakerLogo item={item} />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-bold">
                        <a
                          href={`/bookmakers/${item.slug}`}
                          onClick={open(item)}
                          className="after:absolute after:inset-0 focus-visible:outline-none"
                        >
                          {item.name}
                        </a>
                      </h2>
                      <p className="text-xs text-muted-foreground">{item.province}</p>
                    </div>
                    {isPartner(item) && (
                      <span className="shrink-0 border border-primary/40 bg-primary-soft px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">
                        {t("card.affiliate")}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                    <span
                      className={`border px-1.5 py-0.5 ${
                        licenceOf(item) === "sa"
                          ? "border-primary/30 text-primary"
                          : "border-amber-500/50 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {t(
                        licenceOf(item) === "sa"
                          ? "detail.licence.saBadge"
                          : "detail.licence.offshoreBadge",
                      )}
                    </span>
                    {pop && (
                      <span className="border border-border px-1.5 py-0.5 text-muted-foreground tnum">
                        {t("list.popularBadge", { rank: pop.rank })}
                      </span>
                    )}
                  </div>
                  <dl className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">{t("detail.licence.holder")}</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{item.licenceHolder}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t("detail.licence.reference")}</dt>
                      <dd className="mt-0.5 font-semibold text-foreground">
                        {item.licenceReference}
                      </dd>
                    </div>
                  </dl>
                  {item.verificationNote && (
                    <p className="mt-3 border-l-2 border-amber-500 pl-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      {item.verificationNote}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    {t("card.viewProfile")} <ChevronRight className="size-3" aria-hidden="true" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pages > 1 && (
        <nav
          aria-label={t("list.pagination.label")}
          className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
        >
          <button
            type="button"
            disabled={current === 1}
            onClick={() => setSearch({ page: current - 1 > 1 ? current - 1 : undefined }, false)}
            className="grid size-9 place-items-center border border-border disabled:opacity-40 enabled:hover:border-primary enabled:hover:text-primary"
            aria-label={t("list.pagination.prev")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          {pageWindow(current, pages).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Fragment key={n}>
                <button
                  type="button"
                  onClick={() => setSearch({ page: n > 1 ? n : undefined }, false)}
                  aria-current={n === current ? "page" : undefined}
                  className={`size-9 border text-sm font-semibold tnum ${
                    n === current
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {n}
                </button>
              </Fragment>
            ),
          )}
          <button
            type="button"
            disabled={current === pages}
            onClick={() => setSearch({ page: current + 1 }, false)}
            className="grid size-9 place-items-center border border-border disabled:opacity-40 enabled:hover:border-primary enabled:hover:text-primary"
            aria-label={t("list.pagination.next")}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      <section className="card-surface mt-8 border-primary/30 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-bold">{t("list.checkTitle")}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("listCopy")}</p>
            <a
              href={NGB_REGISTER_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
            >
              {t("list.openRegister")} <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{t("list.source")}</p>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(o) => {
          if (!o)
            void navigate({
              search: ({ bookmaker: _drop, ...rest }) => rest,
              resetScroll: false,
            });
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto p-5 max-sm:bottom-0 max-sm:top-auto max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 sm:max-w-xl">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.name}</DialogTitle>
              <BookmakerDetail item={selected} showPageLink />
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
