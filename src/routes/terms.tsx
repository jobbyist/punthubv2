import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { Separator } from "@/components/ui/separator";
import { TermsAf } from "@/content/legal/af/terms";
import { useLocale } from "@/lib/i18n/provider";

export const Route = createFileRoute("/terms")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://puntr.co.za/terms" }],
    meta: [
      { title: "Terms & Conditions | Puntr" },
      {
        name: "description",
        content:
          "Read the terms governing your use of Puntr, including account responsibilities, predictions, rewards and third-party links.",
      },
      { property: "og:title", content: "Terms & Conditions | Puntr" },
      { property: "og:description", content: "Puntr Terms & Conditions and user agreement." },
    ],
  }),
  component: Terms,
});

function Terms() {
  const { locale } = useLocale();
  if (locale === "af") return <TermsAf />;
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Terms & Conditions"
        subtitle="These terms explain how Puntr works, what you can expect from the platform and what we expect from members."
      />

      <div className="card-surface p-6 sm:p-8">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Last Updated:</strong> 22 November 2026 (version 2026-11-22-r23). Draft pending
            attorney revi¶»§q«^