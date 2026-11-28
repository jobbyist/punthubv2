import { useMemo, useState, type MouseEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, ShieldCheck, ExternalLink, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { BookmakerDetail } from "@/components/bookmakers/bookmaker-detail";
import { BookmakerLogo } from "@/components/bookmakers/bookmaker-logo";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  bookmakerBySlug,
  bookmakerDirectory,
  NGB_REGISTER_URL,
  type BookmakerListing,
} from "@/lib/bookmaker-directory";

interface BookmakersSearch {
  bookmaker?: string;
}

export const Route = createFileRoute("/bookmakers")({
  validateSearch: (s: Record<string, unknown>): BookmakersSearch =>
    typeof s["bookmaker"] === "string" && /^[a-z0-9-]{1,60}$/.test(s["bookmaker"])
      ? { bookmaker: s["bookmaker"] }
      : {},
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
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All provinces");
  const { t } = useTranslation("bookmakers");
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/bookmakers" });
  const selected = search.bookmaker ? bookmakerBySlug(search.bookmaker) : undefined;
  const open = (item: BookmakerListing) => (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    void navigate({ search: (prev) => ({ ...prev, bookmaker: item.slug }), resetScroll: false });
  };
  const provinces = [
    "All provinces",
    ...Array.from(new Set(bookmakerDirectory.map((item) => item.province))).sort(),
  ];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bookmakerDirectory.filter((item) => {
      const matchesTerm =
        !term ||
        [item.name, item.licenceHolder, item.regulator, item.licenceReference].some((v) =>
          v.toLowerCase().includes(term),
        );
      const matchesProvince = province === "All provinces" || item.province === province;
      return matchesTerm && matchesProvince;
    });
  }, [query, province]);

  return (
    <AppShell>
      <PageHeading
        art="directory"
        title="South African Bookmaker Directory"
        subtitle="A searchable reference to bookmaker licence-holder records published by the National Gambling Board."
      />
      <div className="space-y-6">
        <section className="card-surface border-primary/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-bold">Check the licence. Make your own decision.</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("listCopy")}</p>
              <a
                href={NGB_REGISTER_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4"
              >
                Open the National Gambling Board register <ExternalLink className="size-3.5" />
              </a>
            </div>
          </div>
        </section>

        <section aria-label="Search bookmaker listings">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <span className="sr-only">Search by bookmaker, licence holder or licence number</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search bookmaker, licence holder or number…"
                className="h-12 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter by province</span>
              <select
                value={province}
                onChange={(event) => setProvince(event.target.value)}
                className="h-12 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {provinces.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
            Showing {filtered.length} of {bookmakerDirectory.length} bookmaker records. Search
            results are drawn from the register snapshot linked above.
          </p>
        </section>

        <section aria-label="Bookmaker directory">
          {filtered.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <h2 className="font-semibold">No matching bookmaker records</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Try another name, licence holder or province.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <li
                  key={item.slug}
                  className="card-surface group relative min-w-0 p-4 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-glow"
                >
                  <div className="flex items-center gap-3">
                    <BookmakerLogo item={item} />
                    <div className="min-w-0">
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
                  </div>
                  <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Licence holder</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{item.licenceHolder}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Regulator</dt>
                      <dd className="mt-0.5 font-medium text-foreground">{item.regulator}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Licence reference</dt>
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
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Source: National Gambling Board Verified Operators register, accessed 22 November 2026.
          Register entries and licence conditions can change. This curated directory is not a
          real-time licence validation service and does not establish that a specific operator
          website or product has online betting approval. Puntr may have commercial relationships
          with selected operators; any paid links or placements will be clearly labelled. 18+ only.
          Gamble responsibly.
        </p>
      </div>

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
