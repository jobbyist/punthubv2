import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldCheck, ExternalLink } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { PartnerLogo } from "@/components/partner-logo";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import { platforms } from "@/lib/mock-data";
import { bookmakerDirectory, NGB_REGISTER_URL } from "@/lib/bookmaker-directory";

export const Route = createFileRoute("/bookmakers")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/bookmakers" }],
    meta: [
      { title: "South African Bookmaker Directory | Puntr" },
      { name: "description", content: "Browse bookmaker licence-holder records published by South Africa's National Gambling Board. Check the regulator, province and licence reference before using any operator." },
    ],
  }),
  component: BookmakersPage,
});

function BookmakersPage() {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All provinces");
  const uploaded = useBrandLogos("bookmakers");
  const localLogos = platforms.reduce<Record<string, string>>((acc, item) => {
    acc[item.name.toLowerCase()] = item.logo;
    return acc;
  }, {});
  const provinces = ["All provinces", ...Array.from(new Set(bookmakerDirectory.map((item) => item.province))).sort()];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bookmakerDirectory.filter((item) => {
      const matchesTerm = !term || [item.name, item.licenceHolder, item.regulator, item.licenceReference].some((v) => v.toLowerCase().includes(term));
      const matchesProvince = province === "All provinces" || item.province === province;
      return matchesTerm && matchesProvince;
    });
  }, [query, province]);

  return (
    <AppShell>
      <PageHeading art="shield" title="South African Bookmaker Directory" subtitle="A searchable reference to bookmaker licence-holder records published by the National Gambling Board." />
      <div className="space-y-6">
        <section className="card-surface border-primary/30 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-6 shrink-0 text-primary" />
            <div>
              <h2 className="font-bold">Check the licence. Make your own decision.</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Puntr is an independent sports prediction and community platform, not a bookmaker. This is an informational licence reference, not advertising or an endorsement. The National Gambling Board publishes its register to help the public identify illegal gambling environments; Puntr does not rank operators or provide direct betting links. A register entry does not prove that a particular website is authorised for online betting in every province. Confirm the current licence and online betting authorisation with the relevant regulator.
              </p>
              <a href={NGB_REGISTER_URL} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4">
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search bookmaker, licence holder or number…" className="h-12 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
            </label>
            <label className="block">
              <span className="sr-only">Filter by province</span>
              <select value={province} onChange={(event) => setProvince(event.target.value)} className="h-12 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                {provinces.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">Showing {filtered.length} of {bookmakerDirectory.length} bookmaker records. Search results are drawn from the register snapshot linked above.</p>
        </section>

        <section aria-label="Bookmaker directory">
          {filtered.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <h2 className="font-semibold">No matching bookmaker records</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try another name, licence holder or province.</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => {
                const logo =
                  uploaded.find((entry) => entry.active && entry.imageUrl && entry.name.toLowerCase() === item.name.toLowerCase())?.imageUrl ??
                  localLogos[item.name.toLowerCase()];
                return (
                  <li key={item.name} className="card-surface min-w-0 p-4">
                    <div className="flex items-center gap-3">
                      {logo ? (
                        <PartnerLogo src={logo} alt={item.name} loading="lazy" className="h-10 w-20 shrink-0" />
                      ) : (
                        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-muted text-xs font-black text-foreground">
                          {item.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate font-bold">{item.name}</h2>
                        <p className="text-xs text-muted-foreground">{item.province}</p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2 border-t border-border pt-3 text-xs">
                      <div><dt className="text-muted-foreground">Licence holder</dt><dd className="mt-0.5 font-medium text-foreground">{item.licenceHolder}</dd></div>
                      <div><dt className="text-muted-foreground">Regulator</dt><dd className="mt-0.5 font-medium text-foreground">{item.regulator}</dd></div>
                      <div><dt className="text-muted-foreground">Licence reference</dt><dd className="mt-0.5 font-semibold text-foreground">{item.licenceReference}</dd></div>
                    </dl>
                    {item.verificationNote && (
                      <p className="mt-3 border-l-2 border-amber-500 pl-2 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                        {item.verificationNote}
                      </p>
                    )}
                    <a href={NGB_REGISTER_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-4">
                      Verify on NGB register <ExternalLink className="size-3" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Source: National Gambling Board Verified Operators register, accessed 22 November 2026. Register entries and licence conditions can change. This curated directory is not a real-time licence validation service and does not establish that a specific operator website or product has online betting approval. Puntr may have commercial relationships with selected operators; any paid links or placements will be clearly labelled. 18+ only. Gamble responsibly.
        </p>
      </div>
    </AppShell>
  );
}
