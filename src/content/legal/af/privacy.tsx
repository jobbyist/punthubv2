/**
 * Afrikaans translation of /privacy. The English route file is the version that applies; keep this in step with
 * it (Admin > Translations marks the review stale when either file changes). Version shown: 2026-11-13-r15.
 */
import { Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";

const PURPOSES: [string, string, string, string][] = [
  [
    "Vroeë-toegangslys",
    "Naam, e-pos, opsionele telefoonnommer, gekose plan, of jy vir bemarking ingeteken het, en 'n gehoude stigtersplek",
    "Jou versoek (toestemming)",
    "Totdat jy registreer, uitteken of ons vra om dit te skrap [attorney review]",
  ],
  [
    "Bekendstellingsboodskappe",
    "E-posadres, en telefoonnommer as jy een gegee en ingeteken het",
    "Jou versoek; bemarkingstoestemming vir herinneringe",
    "Totdat jy uitteken of ons vra om dit te skrap",
  ],
  [
    "Bestuur van jou rekening",
    "E-pos (van jou e-pos- of Google-aantekening), 'n eenrigting-hash van jou wagwoord as jy een stel, gebruikersnaam, vertoonnaam, profielfoto (opsioneel), bevestiging van 18+, geboortejaar, taal, stigtersnommer, verwysingskode",
    "Kontrak (om Puntr aan jou te verskaf)",
    "Terwyl jou rekening oop is; e-pos- en profielbesonderhede word verwyder wanneer jy dit skrap",
  ],
  [
    "Jou besonderhede (opsioneel)",
    "Voornaam, van, telefoonnommer, geboortedatum en provinsie, slegs as jy kies om dit in jou rekening te stoor. Net jy en Puntr se admins kan dit sien; dit is nooit openbaar nie",
    "Jou toestemming (jy kies om dit by te voeg)",
    "Terwyl jou rekening oop is; geskrap wanneer jy jou rekening skrap",
  ],
  [
    "Stigterslid-opname",
    "Jou antwoorde (graderings, wat jy verwag, mening oor pryse, belangstelling in die jaarpas, kommentaar in vrye teks), of jy aan die trekking wil deelneem, en of ons jou daaroor mag kontak",
    "Jou toestemming (die opname en trekking is opsioneel)",
    "Gehou nadat jy jou rekening geskrap het, slegs gekoppel aan 'n anonieme ID, sonder jou naam, e-pos of ander besonderhede; ons hou op om jou te kontak [attorney review]",
  ],
  [
    "Oefenmodus",
    "Jou oefenkeuses, oefenpunte, inruilings van demo-belonings en die gebruikersnaam op die ranglys. Dit gebruik 'n fiktiewe liga, word apart van jou regte keuses en PuntPoints gehou, en is nooit openbaar nie, behalwe jou gebruikersnaam op die oefenranglys",
    "Jou toestemming (jy kies om dit te probeer); slegs stigterslede",
    "Terwyl jou rekening oop is; geskrap wanneer jy jou rekening skrap [attorney review]",
  ],
  [
    "Beursie (vanaf bekendstelling)",
    "Jou PuntPoints- en betaal-soos-jy-gebruik-kredietsaldo's en -geskiedenis; PuntPoints wat jy stuur of ontvang (die ander lid se gebruikersnaam, die bedrag, 'n opsionele nota en die tyd)",
    "Kontrak (om die lojaliteitskema en die betaalde funksies aan jou te verskaf)",
    "Terwyl jou rekening oop is; oordragrekords word ná skrapping by die anonieme rekening gehou sodat die ander lid se geskiedenis korrek bly [attorney review]",
  ],
  [
    "Rekeningadministrasie",
    "Jou rekeningtipe (gratis, betaal soos jy gebruik, Pro), toegang wat ons verleen (soos vroeë toegang vir toetsing), waarskuwings, opskortings of onderbreekte funksies met die rede, boodskappe wat ons aan jou stuur, en 'n logboek van wat ons admins verander het en wanneer",
    "Ons regmatige belang om 'n veilige, regverdige platform te bedryf, en die kontrak met jou",
    "Terwyl jou rekening oop is; die admin-logboek word ná die skrapping van jou rekening vir ouditdoeleindes gehou, sonder jou e-pos [attorney review]",
  ],
  [
    "Stigters-jaarpas",
    "Rekening-ID, tyd van opeis, verval van die bespreking, en sodra betaal, die PayFast-betaalverwysing, bedrag en datum",
    "Kontrak (om die pas aan jou te verkoop)",
    "So lank as wat belasting- en rekeningkundige wetgewing vereis dat ons betalingsrekords hou",
  ],
  [
    "Begin-take",
    "Watter take jy begin en voltooi het, die punte wat gegee is, en vir gemeenskapstake die naam of gebruikersnaam wat jy vir ons gee (jou WhatsApp-naam of Telegram-gebruikersnaam), wat ons span in daardie groep nagaan",
    "Jou toestemming (jy kies om 'n taak te doen); ons belang om misbruik van belonings te voorkom",
    "Terwyl jou rekening oop is; hierdie name word 90 dae nadat die taak nagegaan is, geskrap [attorney review]",
  ],
  [
    "Aflewering van belonings (vanaf bekendstelling)",
    "Jou inruilings, en vir fisiese belonings en wedstrydkaartjies die naam, afleweringsadres, telefoonnommer, grootte of klubkeuse wat jy per e-pos stuur; name van kaartjiehouers waar die lokaal dit vereis",
    "Kontrak (om die beloning wat jy ingeruil het, af te lewer)",
    "Afleweringsbesonderhede: 12 maande ná aflewering, dan geskrap; inruilrekords terwyl jou rekening oop is [attorney review]",
  ],
  [
    "Verifikasie van jou identiteit (voor die inruil van belonings)",
    "'n Foto of skandering van jou ID of paspoort (geskrap sodra dit nagegaan is), en die uitslag: geverifieer, 18 of ouer, wie dit nagegaan het en wanneer",
    "Regsverpligting (om dobbelpromosies tot volwassenes te beperk) en ons belang om bedrog te voorkom [attorney review]",
    "Die dokument: totdat dit nagegaan is, hoogstens 30 dae. Die uitslag: terwyl jou rekening oop is",
  ],
  [
    "Veiligheid van rekeninge",
    "Of jou e-pos bevestig is, besonderhede van tweefaktor-aantekening met 'n verifikasie-toep, aantekensessies",
    "Kontrak en ons belang om rekeninge veilig te hou",
    "Terwyl jou rekening oop is",
  ],
  [
    "Openbare keuserekord",
    "Jou keuses, pryse, uitslae, 'n hash van elke keuse, en enige regstelling van 'n uitslag met die rede",
    "Regmatige belang: 'n verifieerbare, permanente rekord",
    "Permanent gehou, ná skrapping slegs aan 'n anonieme ID gekoppel",
  ],
  [
    "Verslae en moderering",
    "Verslae wat jy indien (jou ID, die keuse, jou rede) en stappe wat ons doen, soos om 'n keuse te verberg of 'n rekening op te skort",
    "Regmatige belang: regverdigheid en veiligheid",
    "Terwyl jou rekening oop is [attorney review]",
  ],
  [
    "PuntPoints en belonings",
    "Wat punte verdien of spandeer het en wanneer, jou inruilings, en enige koopbewyskode wat aan jou uitgereik is",
    "Kontrak (die lojaliteitskema waarby jy aangesluit het)",
    "Terwyl jou rekening oop is; sonder jou naam gehou nadat jy dit geskrap het [attorney review]",
  ],
  [
    "Uitnodigings",
    "'n Verwysingskode wat 'n nuwe lid koppel aan die lid wat hulle uitgenooi het, en of die nuwe lid 'n eerste keuse geplaas het",
    "Jou versoek (deur 'n uitnodigingskakel te gebruik)",
    "Terwyl jou rekening oop is",
  ],
  [
    "Ontledings",
    "Bladsybesoeke en knoppiegebruik, met die veldtogmerkers van die advertensie of skakel wat jou gebring het (byvoorbeeld utm_source=x). In ons eie databasis gestoor met 'n lukrake blaaier-ID, nooit met jou naam, e-pos of rekening nie",
    "Jou toestemming",
    "Tot 14 maande [attorney review]",
  ],
  [
    "Geaffilieerde opsporing",
    "Op watter advertensie jy geklik het",
    "Jou toestemming",
    "Tot 90 dae [attorney review]",
  ],
  [
    "Bemarking per e-pos, WhatsApp en SMS",
    "E-posadres en, vir WhatsApp of SMS, telefoonnommer",
    "Jou toestemming, by verstek af",
    "Totdat jy dit terugtrek",
  ],
  [
    "Privaatheidsversoeke",
    "E-pos, waarvoor jy gevra het",
    "Regsverpligting",
    "3 jaar [attorney review]",
  ],
];

export function PrivacyAf() {
  return (
    <AppShell>
      <PageHeading
        art="shield"
        title="Privaatheidsbeleid"
        subtitle="'n Duidelike verduideliking van die persoonlike inligting wat ons hanteer, waarom ons dit nodig het en die keuses en regte wat jy het."
      />
      <LegalTranslationNotice />
      <div className="card-surface space-y-8 p-6 text-sm leading-relaxed text-muted-foreground sm:p-8">
        <p>
          <strong>Laas bygewerk:</strong> 13 November 2026 (weergawe 2026-11-13-r15). Konsep wat op
          hersiening deur 'n prokureur wag.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">1. Wie verantwoordelik is</h2>
          <p>
            Puntr (puntr.co.za) is die verantwoordelike party ingevolge die Wet op die Beskerming
            van Persoonlike Inligting (POPIA). Ons inligtingsbeampte is die stigter, [naam word
            bevestig], geregistreer by die Inligtingsreguleerder [registrasie hangend]. Kontak:{" "}
            <a className="underline" href="mailto:privacy@puntr.co.za">
              privacy@puntr.co.za
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            2. Wat ons insamel en waarom
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="py-2 pr-3">Doel</th>
                  <th className="pr-3">Wat</th>
                  <th className="pr-3">Grondslag</th>
                  <th>Gehou vir</th>
                </tr>
              </thead>
              <tbody>
                {PURPOSES.map((row) => (
                  <tr key={row[0]} className="border-b border-border align-top">
                    {row.map((cell, i) => (
                      <td key={i} className="py-2 pr-3">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            Ons samel jou ID-dokument slegs in as jy kies om jou identiteit te verifieer, wat jy
            moet doen voordat jy belonings inruil. Jy laai 'n foto of skandering van jou ID of
            paspoort op; 'n Puntr-admin vergelyk dit met jou naam en geboortejaar en ons skrap die
            dokument sodra die kontrole klaar is (en binne 30 dae as dit nooit nagegaan word nie).
            Ons hou slegs die uitslag: geverifieer of nie, dat jy 18 of ouer is, wie dit nagegaan
            het en wanneer. Ons teken nooit jou ID-nommer aan nie, en ons samel nie 'n selfie of
            biometriese data in nie. [attorney review] Ons stoor nie jou IP-adres of
            toestelbesonderhede saam met jou registrasie nie. Betalings word op PayFast gedoen, dus
            hou ons geen kaart- of bankbesonderhede nie. Ons sien nooit jou wagwoord nie: ons
            aantekenverskaffer hou slegs 'n eenrigting-hash daarvan.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">3. Hoe jy aanteken</h2>
          <p>
            Jy kan met 'n e-pos en wagwoord, met 'n ge-e-posde kode of skakel, of met Google
            registreer en aanteken. As jy Google kies, vertel Google ons jou e-posadres en dat dit
            geverifieer is; ons ontvang nie jou Google-wagwoord nie, en Google se eie
            privaatheidsbeleid geld vir wat Google doen. Jy kan ook met jou gebruikersnaam en
            wagwoord aanteken: ons soek jou e-pos op ons bediener op om die aantekening te voltooi
            en wys dit nooit aan iemand nie. Jy kan tweefaktor-aantekening met 'n verifikasie-toep
            op jou rekeningbladsy aanskakel. Wanneer jy met 'n e-pos registreer, e-pos ons vir jou
            'n kode of skakel en bevestig jy jou adres voordat jy kan aanteken. Sodra tweefaktor aan
            is, het plasings en profielveranderings die kode van jou toep nodig.
          </p>
        </section>

        <section id="marketing">
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            4. Vroeë toegang, bekendstellingsboodskappe en bemarking
          </h2>
          <p>
            As jy vir vroeë toegang gevra het, hou ons jou naam, e-pos, opsionele telefoonnommer en
            of jy bemarking gemerk het. Ons stuur 'n kort reeks e-posse rondom die bekendstelling:
            een wanneer registrasie vir stigterslede oopmaak (2 November 2026) en, as jy nog nie
            geregistreer het nie, tot twee herinneringe. Elke e-pos het 'n uitteken-skakel. Die
            herinneringe gaan slegs aan mense wat bemarking gemerk het. As jy ingeteken en 'n
            telefoonnommer gegee het, kan 'n persoon by Puntr jou ook 'n eenmalige
            bekendstellingsboodskap op WhatsApp of SMS vanaf ons eie rekeninge stuur. Bemarking is
            nooit 'n voorwaarde om aan te sluit nie en is af tensy jy dit merk. Jy kan jou keuse
            enige tyd op{" "}
            <Link to="/account/privacy" className="underline">
              jou privaatheidsbladsy
            </Link>{" "}
            of met die uitteken-skakel verander.
          </p>
          <p className="mt-3">
            As jy as stigterslid aansluit en bemarking gemerk het, stuur ons jou ook kort nadat jy
            geregistreer het een verwelkomings-e-pos van die stigter, en ons teken aan dat dit
            gestuur is. As jy die beperkte Stigters-jaarpas opeis, stoor ons jou rekening-ID,
            wanneer jy dit opgeëis het, hoe lank jou plek gehou word, en sodra jy betaal, die
            betaalverwysing, bedrag en datum. Betaling word op PayFast, ons betalingsverskaffer,
            gedoen, wat jou betaalbesonderhede direk ontvang; ons sien of stoor nooit kaart- of
            bankbesonderhede nie. As jy 'n profielfoto byvoeg, stoor ons 'n saamgeperste afskrif en
            wys dit openbaar op jou profiel en langs jou gebruikersnaam; jy kan dit enige tyd op jou
            rekeningbladsy verwyder. [attorney review]
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            5. Jou keuses is 'n openbare, permanente rekord
          </h2>
          <p>
            Keuses word met jou gebruikersnaam gepubliseer sodat enigiemand 'n rekord kan nagaan, en
            elke keuse is aan die vorige een geketting sodat dit nie stilletjies verander kan word
            nie. Daarom kan keuses nie geskrap of gewysig word nie. Uitslae word outomaties uit
            sportdata ingevul. As ons 'n uitslag moet regstel, word die regstelling as 'n nuwe
            inskrywing met 'n rede bygevoeg en bly die vorige inskrywing op die rekord. Wanneer jy
            jou rekening skrap, verwyder ons jou naam, e-pos en profielbesonderhede en bly jou
            keuses onder 'n anonieme ID. Moenie persoonlike inligting in die redenasie by 'n keuse
            plaas nie.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            6. Wie data namens ons verwerk
          </h2>
          <p>
            Supabase (databasis, aantekening en regstreekse kennisgewings aan ons admins, gehuisves
            in Ierland, EU), Vercel (webwerfhuisvesting), Resend (stuur van e-pos, deur 'n
            e-poskanaal) en Google (slegs as jy kies om met Google aan te teken), en PayFast
            (Suid-Afrika, slegs as jy die Stigters-jaarpas koop: dit neem die betaling en laat ons
            die verwysing en bedrag weet). Ons kry ook wedstryde en uitslae van 'n
            sportdataverskaffer; geen persoonlike inligting word daarheen gestuur nie. Borge van
            belonings ontvang nie jou persoonlike inligting van ons nie: koopbewyse kom uit
            grootmaatkodes wat die borg verskaf, en 'n borg se eie webwerf samel data in wanneer jy
            'n kode gebruik. Om data buite Suid-Afrika te stuur, word ingevolge artikel 72 van POPIA
            toegelaat waar die ontvangende land of kontrak vergelykbare beskerming bied. Ons stuur
            nooit persoonlike data na KI-dienste nie. Om nuuskamerartikels te skryf en
            sokkerwedstryde en -uitslae van openbare webblaaie te lees, gebruik ons Parallel
            (soektogte op die web), Firecrawl (lees van bladsye) en Google Gemini (opsomming van
            daardie bladsye): hulle ontvang slegs openbare webblaaie en Puntr se eie goedgekeurde
            projekopdaterings, nooit inligting oor jou nie. Ons verkoop nie jou data nie.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">7. Kinders</h2>
          <p>
            Puntr is vir mense van 18 jaar en ouer. As ons uitvind dat iemand onder 18 'n rekening
            het, sal ons dit verwyder.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">8. Jou regte</h2>
          <p>
            Jy kan enige tyd vra om jou data te sien, dit reg te stel, dit te skrap, beswaar teen
            die gebruik daarvan te maak, of toestemming terug te trek. Gebruik{" "}
            <Link to="/privacy/request" className="underline">
              ons versoekvorm
            </Link>{" "}
            of die kontroles op{" "}
            <Link to="/cookies" className="underline">
              Privaatheidskeuses
            </Link>
            . Ons poog om binne 30 dae te antwoord. As jy ontevrede is, kan jy by die
            Inligtingsreguleerder kla by{" "}
            <a className="underline" href="https://inforegulator.org.za" rel="noreferrer">
              inforegulator.org.za
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">9. As iets verkeerd loop</h2>
          <p>
            As jou persoonlike inligting in gevaar gestel word, sal ons die Inligtingsreguleerder en
            die betrokke mense so gou as redelikerwys moontlik laat weet.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            10. Koekies, blaaierberging en geaffilieerde skakels
          </h2>
          <p>
            Slegs wat nodig is om Puntr te laat werk, word gebruik totdat jy tot meer instem. Sien{" "}
            <Link to="/cookies" className="underline">
              Privaatheidskeuses
            </Link>{" "}
            en die{" "}
            <Link to="/affiliate-disclosure" className="underline">
              openbaarmaking oor geaffilieerde skakels
            </Link>
            .
          </p>
        </section>

        <p className="text-xs">Slegs 18+. Dobbel kan verslawend wees. Hulplyn: 0800 006 008.</p>
      </div>
    </AppShell>
  );
}
