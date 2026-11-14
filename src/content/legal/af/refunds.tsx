/**
 * Afrikaans translation of /refunds. The English route file is the version that applies; keep this in step with
 * it (Admin > Translations marks the review stale when either file changes).
 */
import { Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";

export function RefundsAf() {
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Terugbetalings"
        subtitle="Ons huidige standpunt oor terugbetalings en kansellasies, insluitend wat geld voordat betaalde funksies te koop is."
      />
      <LegalTranslationNotice />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        <section className="card-surface p-6">
          <h2 className="text-xl">Stigters-jaarpas</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Stigterslidmaatskap is gratis. Die enigste ding wat ons voor die bekendstelling verkoop,
            is die Stigters-jaarpas: 12 maande se Puntr Pro vir 'n eenmalige R299, betaal deur
            PayFast, wat op 1 Desember 2026 begin en nie outomaties hernu nie. Dit word aangebied
            aan die eerste 20 stigterslede wat dit voor 16 November 2026 opeis. Om 'n terugbetaling
            te vra, e-pos support@puntr.co.za vanaf die adres op jou rekening. Jou regte ingevolge
            die Wet op Verbruikersbeskerming en die Wet op Elektroniese Kommunikasie en Transaksies,
            insluitend enige afkoelperiode, word nie geraak nie. [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Betaal-soos-jy-gebruik en Puntr Pro kom later</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            As ons betaal-soos-jy-gebruik-krediete of die Puntr Pro-intekening te koop aanbied, sal
            ons eers die terugbetalings- en kansellasievoorwaardes publiseer en dit wys voordat jy
            betaal. Niks op hierdie bladsy geld vir enigeen van die twee tot dan nie. [attorney
            review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Weddenskapsgeld</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr hou nooit jou weddenskapsgeld nie. Deposito's, weddenskappe en verliese by 'n
            boekmaker is tussen jou en daardie boekmaker.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Vrae? Besoek ons{" "}
          <Link
            to="/support"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            hulpbladsy
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
