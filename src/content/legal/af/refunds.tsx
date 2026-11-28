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
        subtitle="Hoe terugbetalings en kansellasies werk vir aankope wat deur PayFast by Network verwerk word. Ozow is nog nie beskikbaar nie."
      />
      <LegalTranslationNotice />

      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-16 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Puntr South Africa word deur Gravitas Industries (Pty) Ltd (CK No.: 2024/596436/07), 'n
          maatskappy wat in Suid-Afrika geregistreer is, bedryf.
        </p>
        <section className="card-surface p-6">
          <h2 className="text-xl">Stigters-jaarpas</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Die Stigters-jaarpas bied 12 maande se Puntr Pro vir 'n eenmalige R299-betaling wat deur
            PayFast by Network verwerk word. Dit begin op 1 Desember 2026 en hernu nie outomaties
            nie. Die aanbod is vir die eerste 20 stigterslede wat dit voor 30 November 2026 opeis.
            Om 'n terugbetaling te vra, e-pos support@puntr.co.za vanaf die e-posadres op jou
            rekening en sluit jou PayFast-betalingsverwysing in. Jou regte ingevolge die Wet op
            Verbruikersbeskerming en die Wet op Elektroniese Kommunikasie en Transaksies, insluitend
            enige toepaslike afkoeltydperk, word nie geraak nie. [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Betaal-soos-jy-gebruik-krediete en Puntr Pro</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Kredietpakpryse en die ingeslote krediete word voor betaling gewys. Aangekoopte krediete
            verskyn in jou Beursie, kan nie oorgedra of vir kontant omgeruil word nie. As 'n
            betaling gedupliseer word, 'n voltooide betaling nie in jou Beursie verskyn nie, of die
            bedrag verkeerd lyk, kontak support@puntr.co.za vanaf jou rekening-e-posadres en sluit
            die PayFast-transaksieverwysing in. Ons ondersoek die betaling en korrigeer of betaal
            dit terug waar toepaslik ingevolge die voorwaardes by betaalpunt en toepaslike
            wetgewing.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Puntr Pro is 'n maandelikse intekening teen die prys wat by betaalpunt gewys word. Jy
            kan toekomstige hernuwings in jou Beursie kanselleer. Kansellasie stop die volgende
            hernuwing; jou Pro-toegang duur tot die einde van die betaalde tydperk. Kansellasie skep
            nie vanself 'n outomatiese terugbetaling vir 'n tydperk wat reeds betaal is nie. Enige
            terugbetalingsversoek word ingevolge die voorwaardes by betaalpunt en toepaslike
            wetgewing beoordeel. Jou statutêre regte word nie geraak nie. [attorney review]
          </p>
        </section>

        <section className="card-surface p-6">
          <h2 className="text-xl">Betalingsverskaffer</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Puntr gebruik tans PayFast by Network om betalings te verwerk. PayFast ontvang
            betalingsbesonderhede direk; Puntr ontvang die transaksieverwysing, bedrag en
            betalingstatus wat nodig is om die diens te lewer en jou aankoop te ondersteun. Ozow
            word beplan, maar is nog nie geïntegreer of by betaalpunt beskikbaar nie. Ons sal
            hierdie bladsy bywerk voordat 'n ander betalingsverskaffer geaktiveer word.
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
