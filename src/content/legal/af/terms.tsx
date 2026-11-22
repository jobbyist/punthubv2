/**
 * Afrikaans translation of /terms. The English route file is the version that applies; keep this in step with it
 * (Admin > Translations marks the review stale when either file changes). Version shown: 2026-11-22-r23.
 */
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";
import { Separator } from "@/components/ui/separator";

const P = "mb-3 leading-relaxed text-muted-foreground";
const PL = "leading-relaxed text-muted-foreground";
const UL = "mb-3 ml-5 list-disc space-y-1 text-muted-foreground";
const H = "mb-3 text-xl font-semibold";

export function TermsAf() {
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Bepalings en voorwaardes"
        subtitle="Hierdie bepalings verduidelik hoe Puntr werk, wat jy van die platform kan verwag en wat ons van lede verwag."
      />
      <LegalTranslationNotice />

      <div className="card-surface p-6 sm:p-8">
        <div className="prose prose-sm max-w-none">
          <p className="text-sm text-muted-foreground">
            <strong>Laas bygewerk:</strong> 22 November 2026 (weergawe 2026-11-22-r23). Konsep wat
            op hersiening deur 'n prokureur wag.
          </p>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className={H}>1. Inleiding</h2>
            <p className={P}>
              Welkom by Puntr South Africa ("Puntr"), 'n platform w¶»§q«^