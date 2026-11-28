import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { RefundsAf } from "@/content/legal/af/refunds";
import { useLocale } from "@/lib/i18n/provider";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/refunds" }],
    meta: [
      { title: "Refunds | Puntr" },
      {
        name: "description",
        content:
          "How refunds and cancellations work for Puntr paid features processed by PayFast by Network, including the Founding Annual Pass, credit packs and Puntr Pro.",
      },
      { property: "og:title", content: "Refunds | Puntr" },
      {
        property: "og:description",
        content: "Refunds, cancellations and payment support for Puntr purchases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Refunds,
});

function Refunds() {
  const { locale } = useLocale();
  if (locale === "af") return <RefundsAf />;
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Refunds"
        subtitle="How refunds and cancellations work for purchases processed through PayFast by Network. Ozow is not yet available."
      />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puntr South Africa is operated by Gravitas Industries (Pty) Ltd (CK No.: 2024/596436/07),
          a company registered in South Africa.
        </p>
        <section className="card-surface p-6">
          <h2 className="text-xl">Founding Annual Pass</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The Founding Annual Pass provides 12 months of Puntr Pro for a once-off R299 payment,
            processed by PayFast by Network. It starts on 1 December 2026 and does not renew
            automatically. The offer is for the first 20 Founding Members who claim it before 30
            November 2026. To request a refund, email support@puntr.co.za from the email address on
            your account and include your PayFast payment reference. Your rights under the Consumer
            Protection Act and the Electronic Communications and Transactions Act, including any
            applicable cooling-off period, are not affected. [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Pay-As-You-Go credits and Puntr Pro</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Credit-pack prices and included credits are shown before you pay. Purchased credits
            appear in your Wallet, are not transferable and cannot be exchanged for cash. If a
            payment is duplicated, a completed payment is not reflected in your Wallet, or the
            amount appears incorrect, contact support@puntr.co.za from your account email and
            include the PayFast transaction reference. We will investigate the payment and correct
            or refund it where appropriate under the terms shown at checkout and applicable law.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Puntr Pro is a monthly subscription at the price shown at checkout. You can cancel
            future renewals from Wallet. Cancellation stops the next renewal; your Pro access
            continues until the end of the paid period. A cancellation does not itself create an
            automatic refund for a period already paid. Any refund request is assessed under the
            terms shown at checkout and applicable law. Your statutory rights are not affected.
            [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Payment provider</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr currently uses PayFast by Network to process payments. PayFast receives payment
            details directly; Puntr receives the transaction reference, amount and payment status
            needed to provide the service and support your purchase. Ozow is planned but is not yet
            integrated or available at checkout. We will update this page before another payment
            provider is enabled.
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
