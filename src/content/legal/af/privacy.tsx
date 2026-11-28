/**
 * Afrikaans translation of /privacy. The English route file is the version that applies; keep this in step with
 * it (Admin > Translations marks the review stale when either file changes). Version shown: 2026-11-27-r23.
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
    "Interne registrasiekennisgewings",
    "Jou rekening se e-posadres, rekening-ID en registrasietyd, wat aan Puntr se ondersteuningsposbus gestuur word wanneer 'n nuwe rekening geskep word",
    "Ons regmatige belang om nuwe registrasies te monitor en rekeningondersteuning te verskaf",
    "Word in die ondersteuningsposbus en e-posstelsels gehou volgens die toepaslike behoudsinstellings en enige regsverpligtinge",
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
    "Gunstelinge en spanne wat jy volg (opsioneel)",
    "Die sportsoorte, kompetisies en spanne wat jy kies om te volg, insluitend spanne wat jy in die spangids volg, en 'n log van wanneer jy 'n span begin of opgehou volg het",
    "Jou toestemming (jy kies om dit te stel; vee dit uit of hou op volg enige tyd in jou rekening of die spangids)",
    "Terwyl jou rekening oop is; geskrap wanneer jy dit uitvee of jou rekening skrap. Word gebruik om jou eie Wedstryddag-kaart en kortpaaie te orden en om op jou rekeningblad te wys watter spanne jy volg. Ander sien slegs 'n anonieme aantal volgers per span; admins sien totale en die mees gevolgde spanne, nooit wie wie volg nie. Nooit gedeel nie [attorney review]",
  ],
  [
    "Wedstrokies (opsioneel)",
    "Strokies wat jy byvoeg: wedstryde, markte, pryse, en as jy dit invoer die boekmaker, inset en moontlike opbrengs; 'n opsionele foto of skermskoot van die strokie. Die boekmaker word net aan jou gewys; jou inset en opbrengs word net op 'n gepubliseerde strokie gewys as jy dit aanskakel. Gepubliseerde bene word gewone voorspellings wat met jou gebruikersnaam gewys word",
    "Jou toestemming (jy kies om 'n strokie by te voeg) en kontrak (die publisering van voorspellings wat jy vra dat ons publiseer)",
    "Strokiefoto's: 30 dae ná oplaai geskrap, of wanneer jy die strokie of jou rekening skrap. Strokiebesonderhede: solank jou rekening oop is; met skrapping word konsepte geskrap en die boekmaker, inset, opbrengs en nota uitgevee, terwyl voorspellings wat reeds gepubliseer is by die anonieme rekening bly soos elke ander voorspelling. 'n Telling van KI-gesteunde lesings (sonder strokieteks) word vir 24-uur-limiete gehou en saam met jou rekening geskrap [attorney review]",
  ],
  [
    "Gemeenskapsduelle (vanaf bekendstelling)",
    "Jou duel-uitdagings, voorspellings, insette, uitslae en stemme. Jou voorspellings word vanaf afskop openbaar saam met jou gebruikersnaam gewys; stemme word slegs getel en nooit by naam gewys nie",
    "Kontrak (om die duelfunksie te verskaf wat jy kies om te gebruik)",
    "Terwyl jou rekening oop is. Wanneer jy jou rekening skrap, word oop uitdagings gekanselleer, aktiewe duelle nietig verklaar met insette terugbetaal en jou stemme geskrap; afgehandelde duelle bly by die anonieme rekening sodat die ander lid se rekord korrek bly [attorney review]",
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
    "Betalings en intekeninge",
    "Rekening-ID, bestelling- of intekening-ID, gekose kredietpak of plan, tyd van die jaarpas-eis en besprekingverval, PayFast by Network-transaksieverwysing, bedrag, betalingstatus, aankoop- of hernuwingsdatums, toegekende krediete, intekeningstatus en einde van die betaalde tydperk",
    "Kontrak (om betaalde funksies te verskaf), rekeningkundige en regsverpligtinge, en voorkoming van bedrog",
    "Solank as wat belasting- en rekeningkundige wetgewing vereis dat betalingsrekords gehou word en soos nodig om betalingsgeskille op te los",
  ],
  [
    "Aansoeke vir handelsmerkambassadeurs",
    "Jou naam, e-pos, stad/land, bevestiging dat jy 18 of ouer is, rol, platforms, openbare profielskakels, opsionele gehoorgrootte, inhoudsvoorbeelde, sport-/inhoudbelangstellings, beskikbaarheid en aansoekantwoorde. Die aansoek word in ons vormindieningstelsel gestoor en aan partners@puntr.co.za ge-e-pos.",
    "Jou versoek om vir die program oorweeg te word en stappe wat op jou versoek geneem word voordat enige ooreenkoms bestaan",
    "Solank as wat nodig is om die aansoek te beoordeel, enige daaropvolgende ooreenkoms te administreer en regs- of geskilverpligtinge te hanteer; jy kan 'n privaatheidsversoek indien",
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
    "Drukkennisgewings (opsioneel)",
    "Jou blaaier se druk-eindpunt, geënkripteerde intekeningsleutels, toestel-/blaaierbesonderhede, rekeningkennisgewingvoorkeur en afleweringstatus. Die kennisgewingtitel, boodskap en bestemming word na jou blaaier se drukkennisgewingsdiens gestuur; Puntr sluit nie private rekening- of weddata in kennisgewings in nie.",
    "Jou uitdruklike toestemming om drukkennisgewings te ontvang. Jy kan dit enige tyd in Rekeninginstellings terugtrek of die blaaier se toestemming herroep.",
    "Toestelintekeninge word verwyder wanneer jy kennisgewings afskakel of jou rekening skrap. Beperkte veldtog- en afleweringsouditrekords kan vir platformsekuriteit, misbruikvoorkoming en bedryfsverslagdoening gehou word [prokureur se hersiening]",
  ],

  [
    "Openbare keuserekord",
    "Jou keuses, pryse, uitslae, 'n hash van elke keuse, enige regstelling van 'n uitslag met die rede, en, waar daar een was, die markverwysingsprys toe jy geplaas het en of jou pryse as ongeverifieer gemerk is (saam met die keuse gewys)",
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
          <strong>Laas bygewerk:</strong> 23 November 2026 (weergawe 2026-11-23-r22). Konsep wat op
          hersiening deur 'n prokureur wag.
        </p>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-foreground">1. Wie verantwoordelik is</h2>
          <p>
            Puntr South Africa (puntr.co.za) word deur Gravitas Industries (Pty) Ltd
            (CK No.: 2024/596436/07), 'n maatskappy wat in Suid-Afrika geregistreer is, bedryf.
            Gravitas Industries (Pty) Ltd is die verantwoordelike party ingevolge die Wet op die
            Beskerming van Persoonlike Inligting (POPIA). Ons inligtingsbeampte is die stigter,
            [naam word bevestig], geregistreer by die Inligtingsreguleerder [registrasie hangend].
            Kontak:{" "}
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
            betaalverwysing, bedrag, status en datum. PayFast by Network ontvang jou
            betaalbesonderhede direk; ons sien of stoor nie jou volle kaart- of bankbesonderhede
            nie. As jy 'n Handelsmerkambassadeur-aansoek indien, stoor ons die besonderhede en
            antwoorde wat jy verskaf sodat ons vennootskapspan dit kan beoordeel en jou kan kontak.
            Ons e-pos die aansoek aan partners@puntr.co.za deur ons e-posverskaffer. As jy 'n
            profielfoto byvoeg, stoor ons 'n saamgeperste afskrif en
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
            in Ierland, EU), Vercel (webwerfhuisvesting), Google (slegs as jy kies om met Google
            aan te teken), PayFast by Network (Suid-Afrika; dit verwerk betaalde Puntr-transaksies
            en stuur die transaksieverwysing, bedrag en status terug), en Resend (transaksionele
            e-pos, insluitend Handelsmerkambassadeur-aansoeke aan partners@puntr.co.za). Ozow is 'n
            beplande toekomstige betaalopsie; dit is nog nie geïntegreer nie en ontvang tans geen
            persoonlike of betalingsinligting deur Puntr nie. Ons sal hierdie kennisgewing bywerk
            voordat dit geaktiveer word. Ons kry ook wedstryde en uitslae van 'n
            sportdataverskaffer; geen persoonlike inligting word daarheen gestuur nie. Borge van
            belonings ontvang nie jou persoonlike inligting van ons nie: koopbewyse kom uit
            grootmaatkodes wat die borg verskaf, en 'n borg se eie webwerf samel data in wanneer jy
            'n kode gebruik. Om data buite Suid-Afrika te stuur, word ingevolge artikel 72 van POPIA
            toegelaat waar die ontvangende land of kontrak vergelykbare beskerming bied. Ons stuur
            nooit persoonlike data na KI-dienste nie. Wanneer jy 'n strokiefoto oplaai, word die
            teks op jou eie toestel gelees (die foto word nooit na 'n KI-diens gestuur nie). Voordat
            strokieteks gebruik word, verwyder ons die persoonlike besonderhede wat ons kan opspoor
            (e-posadresse, telefoonnommers, lang rekening-, ID- of kaartnommers, en reëls met 'n
            naam, gebruikersnaam, saldo, rekening of ID); as ons eie leser nie die weddenskap kan
            vind nie, kan net daardie skoongemaakte teks na Google Gemini gestuur word om die
            wedstryde, markte en pryse te lees. Bedek asseblief jou rekeningnaam en saldo voordat jy
            oplaai. [attorney review] Om nuuskamerartikels te skryf en sokkerwedstryde en -uitslae
            van openbare webblaaie te lees, gebruik ons Parallel (soektogte op die web), Firecrawl
            (lees van bladsye) en Google Gemini (opsomming van daardie bladsye): hulle ontvang slegs
            openbare webblaaie en Puntr se eie goedgekeurde projekopdaterings, nooit inligting oor
            jou nie. Ons verkoop nie jou data nie.
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
