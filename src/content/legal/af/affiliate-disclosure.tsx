/**
 * Afrikaans translation of /affiliate-disclosure. The English route file is the version that applies; keep this
 * in step with it (Admin > Translations marks the review stale when either file changes).
 */
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";

export function AffiliateDisclosureAf() {
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Openbaarmaking oor geaffilieerde skakels"
        subtitle="Hoe advertensies en geaffilieerde skakels werk, en hoe kommersiële verhoudings apart van voorspellings en ranglyste gehou word."
      />
      <LegalTranslationNotice />
      <div className="card-surface space-y-4 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
        <p>
          Puntr kan 'n kommissie verdien as jy op 'n vennootskakel klik en by daardie vennoot
          registreer. Elke sulke skakel is gemerk &quot;Advertensie&quot;. 'n Vennoot verskyn eers
          nadat ons nagegaan het dat dit die lisensie het wat dit nodig het.
        </p>
        <p>
          Vennootskakels bevat nooit jou naam, e-pos of enige ander persoonlike inligting nie.
          Klik-opsporing word slegs aangeskakel as jy dit in{" "}
          <a className="underline" href="/cookies">
            Privaatheidskeuses
          </a>{" "}
          aanvaar. Advertensies word nie gewys aan iemand wat nie bevestig het dat hulle 18+ is nie,
          of wat op 'n blaaskans is nie.
        </p>
        <p>
          Sommige belonings wat jy met PuntPoints kan inruil, word deur vennote befonds. Geborgde
          belonings sê wie dit borg. Wedkoopbewyse, as ons dit aanbied, is vennootpromosies: dit is
          gemerk &quot;Advertensie&quot;, word slegs gewys aan lede wat 18+ is en nie op 'n
          blaaskans is nie, en dra die boodskap oor verantwoordelike dobbelary. Vennote ontvang nie
          jou persoonlike inligting nie.
        </p>
        <p>
          Kommersiële vennote beheer of beïnvloed nie Puntr se keuses, uitslae,
          voorspellingsbeoordelings, redaksionele inhoud of ranglyste nie.
        </p>
        <p className="text-xs">
          Slegs 18+. Bepalings en voorwaardes geld. Dobbel kan verslawend wees. Hulplyn: 0800 006
          008.
        </p>
      </div>
    </AppShell>
  );
}
