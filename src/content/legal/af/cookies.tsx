/**
 * Afrikaans translation of /cookies (Privacy choices). The English route file is the version that applies and
 * owns the consent logic; this component only renders the translated page. Keep it in step with the English page.
 */
import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export function CookiesAf({
  analytics,
  affiliate,
  setAnalytics,
  setAffiliate,
  save,
}: {
  analytics: boolean;
  affiliate: boolean;
  setAnalytics: (v: boolean) => void;
  setAffiliate: (v: boolean) => void;
  save: (analytics: boolean, affiliate: boolean) => void;
}) {
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Privaatheidskeuses"
        subtitle="Koekies en opsporing op Puntr. Alles wat opsioneel is, is af tensy jy dit aanskakel."
      />
      <LegalTranslationNotice />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <section>
          <h2 className="font-display text-lg font-bold">Noodsaaklik (altyd aan)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Puntr kan nie sonder hierdie werk nie. Dit word slegs gestel om funksies te laat werk
            wat jy gebruik, nie om jou op te spoor nie.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>
              Jou aantekensessie, in jou blaaier se berging gehou terwyl jy aangeteken is (en
              uitgevee wanneer jy uitteken).
            </li>
            <li>
              Koekie <code>puntr_consent</code> (180 dae): onthou jou keuses op hierdie bladsy.
            </li>
            <li>
              Koekie <code>puntr_lang</code> (1 jaar): onthou die taal wat jy kies.
            </li>
            <li>
              Koekie <code>puntr_lang_preview</code> (30 dae): word slegs gestel wanneer 'n
              Puntr-admin 'n taal wat nog hersien word, voorskou, sodat die voorskou ná 'n herlaai
              bly.
            </li>
            <li>
              Blaaierberging <code>puntr:ref</code>: die uitnodigingskode van 'n skakel wat jy
              oopgemaak het, gehou totdat jy klaar geregistreer het.
            </li>
            <li>
              Blaaierberging <code>puntr:security-prompt</code>: onthou dat jy die herinnering oor
              rekeningsekuriteit weggewys het (3 dae).
            </li>
            <li>
              Blaaier-sessieberging <code>puntr:claim:…</code>: keer dat dieselfde eenmalige
              kontrole vir 'n stigtersplek twee keer in een besoek loop.
            </li>
          </ul>
        </section>
        <Separator />
        <section className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="analytics" className="font-display text-lg font-bold">
              Ontledings
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Tel bladsybesoeke en knoppiegebruik sodat ons Puntr kan verbeter. Word nie vir
              advertensies gebruik nie.
            </p>
          </div>
          <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
        </section>
        <section className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="affiliate" className="font-display text-lg font-bold">
              Geaffilieerde opsporing
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Laat 'n vennoot weet dat 'n besoek van Puntr af gekom het as jy op 'n gemerkte
              advertensie klik. Geen persoonlike inligting word in vennootskakels geplaas nie.
            </p>
          </div>
          <Switch id="affiliate" checked={affiliate} onCheckedChange={setAffiliate} />
        </section>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => save(false, false)}>
            Weier alles
          </Button>
          <Button variant="outline" onClick={() => save(true, true)}>
            Aanvaar alles
          </Button>
          <Button onClick={() => save(analytics, affiliate)}>Stoor keuses</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Jy moet 18+ wees om Puntr te gebruik. Dobbelhulplyn: 0800 006 008.
        </p>
      </div>
    </AppShell>
  );
}
