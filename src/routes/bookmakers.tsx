import { createFileRoute, Link } from "@tanstack/react-router";
import { PartnerLogo } from "@/components/partner-logo";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { useBrandLogos } from "@/hooks/use-brand-logos";
import { platforms } from "@/lib/mock-data";

export const Route = createFileRoute("/bookmakers")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/bookmakers" }],
    meta: [
      { title: "Bookmakers | Puntr" },
      {
        name: "description",
        content:
          "Explore bookmaker brands relevant to South African sports fans. Compare providers independently and check their terms before signing up.",
      },
    ],
  }),
  component: BookmakersPage,
});

function BookmakersPage() {
  const uploaded = new Map(
    useBrandLogos("bookmakers")
      .filter((l) => l.active && l.imageUrl)
      .map((l) => [l.name.toLowerCase(), l.imageUrl as string]),
  );
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Bookmakers"
        subtitle="A directory of betting brands South African sports fans may come across."
      />
      <section className="card-surface p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Choose independently</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Puntr is an independent sports discussion and prediction-record platform. Listings are
              informational only; they are not endorsements, odds comparisons or recommendations to
              place a bet. Always check licensing, terms, age restrictions and safer-gambling tools
              directly with each provider.
            </p>
          </div>
        </div>
      </section>
      <section className="mt-6" aria-labelledby="bookmaker-directory-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 id="bookmaker-directory-title" className="text-lg font-bold">
            Provider directory
          </h2>
          <span className="text-xs text-muted-foreground">Brand names only</span>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {platforms.map((platform) => (
            <li
              key={platform.name}
              className="card-surface group flex min-h-20 items-center gap-4 p-4"
            >
              <PartnerLogo
                src={uploaded.get(platform.name.toLowerCase()) ?? platform.logo}
                alt={platform.name}
                loading="lazy"
                className="max-w-20"
              />
              <span className="flex-1 text-sm font-semibold">{platform.name}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Directory
              </span>
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Puntr may receive compensation from some partners in future. Any paid relationship will be
        clearly disclosed. 18+ only. Gamble responsibly.
      </p>
      <Button asChild variant="outline" className="mt-5">
        <Link to="/predictions">Explore predictions</Link>
      </Button>
    </AppShell>
  );
}
