import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/refunds" }],
    meta: [
      { title: "Refunds | Puntr" },
      {
        name: "description",
        content:
          "Puntr has no paid products at launch. Refund terms for credits will be published before credits go on sale.",
      },
      { property: "og:title", content: "Refunds | Puntr" },
      {
        property: "og:description",
        content: "No paid products at launch, so there is nothing to refund yet.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <AppShell>
      <PageHeading title="Refunds" subtitle="A short holding policy while Puntr is free." />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        <section className="card-surface p-6">
          <h2 className="text-xl">No paid products at launch</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr is free for Founding Members. We do not charge for anything, so there is nothing
            to refund.
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Credits come later</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If we put credits on sale, we will publish the refund terms first and show them before
            you pay. Nothing on this page applies to credits until then.
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Betting money</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr never holds your betting funds. Deposits, wagers and losses with a bookmaker are
            between you and that bookmaker.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Questions? Visit our{" "}
          <Link
            to="/support"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            support page
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
