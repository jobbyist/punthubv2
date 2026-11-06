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
          "Refunds for the Founding Annual Pass (R299 once-off, paid through PayFast). Refund and cancellation terms for Pay-As-You-Go credits and Puntr Pro will be published before either goes on sale.",
      },
      { property: "og:title", content: "Refunds | Puntr" },
      {
        property: "og:description",
        content: "How refunds work for the Founding Annual Pass.",
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
      <PageHeading title="Refunds" subtitle="A short policy while Puntr prepares for launch." />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        <section className="card-surface p-6">
          <h2 className="text-xl">Founding Annual Pass</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Founding Membership is free. The only thing we sell before launch is the Founding Annual
            Pass: 12 months of Puntr Pro for R299 once-off, paid through PayFast, starting on 1
            December 2026 and not renewing automatically. It is offered to the first 20 Founding
            Members who claim it before 16 November 2026. To ask for a refund, email
            support@puntr.co.za from the address on your account. Your rights under the Consumer
            Protection Act and the Electronic Communications and Transactions Act, including any
            cooling-off period, are not affected. [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Pay-As-You-Go and Puntr Pro come later</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            If we put Pay-As-You-Go credits or the Puntr Pro subscription on sale, we will publish
            the refund and cancellation terms first and show them before you pay. Nothing on this
            page applies to either until then. [attorney review]
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
