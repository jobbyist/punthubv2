/**
 * Afrikaans translation of /terms. The English route file is the version that applies; keep this in step with it
 * (Admin > Translations marks the review stale when either file changes). Version shown: 2026-11-13-r15.
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
            <strong>Laas bygewerk:</strong> 13 November 2026 (weergawe 2026-11-13-r15). Konsep wat
            op hersiening deur 'n prokureur wag.
          </p>

          <Separator className="my-6" />

          <section className="mb-8">
            <h2 className={H}>1. Inleiding</h2>
            <p className={P}>
              Welkom by Puntr (Edms.) Bpk. ("Puntr", "ons" of "ons s'n"). Hierdie bepalings en
              voorwaardes ("Bepalings") beheer jou toegang tot en gebruik van die Puntr-platform,
              -webwerf, -mobiele toepassings en verwante dienste (gesamentlik die "Diens").
            </p>
            <p className={PL}>
              Deur ons Diens te gebruik of toegang daartoe te verkry, stem jy in om deur hierdie
              Bepalings gebind te word. As jy nie met enige deel van hierdie Bepalings saamstem nie,
              mag jy nie ons Diens gebruik nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>2. Geskiktheid en ouderdomsbeperkings</h2>
            <p className={P}>
              Jy moet ten minste 18 jaar oud wees om Puntr te gebruik. Deur ons Diens te gebruik,
              verklaar en waarborg jy dat jy wettig oud genoeg is om 'n bindende kontrak met Puntr
              aan te gaan en aan alle geskiktheidsvereistes voldoen.
            </p>
            <p className={PL}>
              <strong>Niemand onder 18 nie:</strong> Puntr verbied dobbelary deur persone onder die
              ouderdom van 18 streng. Ons bevorder verantwoordelike dobbelary en voldoen aan alle
              Suid-Afrikaanse dobbelregulasies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>3. Rekeningregistrasie</h2>
            <p className={P}>
              Om toegang tot sekere funksies van die Diens te kry, moet jy 'n rekening skep. Wanneer
              jy 'n rekening skep, stem jy in om:
            </p>
            <ul className={UL}>
              <li>Akkurate, huidige en volledige inligting te verskaf</li>
              <li>Jou rekeninginligting by te hou en dit dadelik by te werk</li>
              <li>
                'n Gebruikersnaam te kies (dit is openbaar) en jou aantekenmetode, soos jou wagwoord
                of e-pos, veilig te hou. Ons beveel aan dat jy jou e-pos bevestig en
                tweefaktor-aantekening aanskakel
              </li>
              <li>Die sekuriteit van jou rekeningbewyse te handhaaf</li>
              <li>
                Ons onmiddellik in kennis te stel van enige ongemagtigde toegang of sekuriteitsbreuk
              </li>
              <li>
                Verantwoordelikheid te aanvaar vir alle bedrywighede wat onder jou rekening
                plaasvind
              </li>
            </ul>
            <p className={PL}>
              Jy mag nie 'n ander persoon se rekening sonder toestemming gebruik of meer as een
              rekening skep nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>4. Platformdienste</h2>
            <p className={P}>
              Puntr is 'n gemeenskapsplatform waar lede voorspellings oor sokkerwedstryde plaas.
              Basketbal, rugby, perdewedrenne, gevegsport (boks en MMA), atletiek, krieket en tennis
              word vir ná die bekendstelling beplan en is nie beskikbaar totdat dit op die webwerf
              verskyn nie. Die teikendatums op ons padkaart (/roadmap) is planne, nie verbintenisse
              nie, en kan verander. Dit bied:
            </p>
            <ul className={UL}>
              <li>
                Voorspellings wat met die afskop sluit en op 'n openbare rekord gehou word. Om te
                plaas, is 'n bevestigde e-posadres nodig
              </li>
              <li>Outomatiese gradering van afgehandelde voorspellings en 'n weeklikse ranglys</li>
              <li>'n Bladsy om na te gaan dat 'n voorspelling nie verander is nie (/verify)</li>
              <li>Gratis stigterslidmaatskap vir die eerste 100 lede</li>
              <li>
                'n Beperkte aanbod vir die Stigters-jaarpas: die eerste 20 stigterslede wat dit voor
                16 November 2026 bespreek, kry 12 maande se Puntr Pro vir 'n eenmalige R299, vanaf 1
                Desember 2026, sonder outomatiese hernuwing. Bespreking is gratis op Puntr. Ons
                e-pos 'n veilige PayFast-betaalskakel; betaling moet binne 48 uur voltooi word,
                anders verval die bespreking en word die plek vrygestel. Die jaarpas word eers
                bevestig nadat betaling ontvang is. Terugbetalings word op die Terugbetalings-bladsy
                gedek. Verwysingsbelonings, beplan as tot 30% in bonus-PuntPoints op kwalifiserende
                aankope deur mense wat jy uitnooi (nooit kontant nie), is nie beskikbaar totdat ons
                hul voorwaardes publiseer nie [attorney review]
              </li>
              <li>Opvoedkundige inhoud en hulpbronne oor wed</li>
              <li>Skakels na gelisensieerde vennote, gemerk &quot;Advertensie&quot;</li>
            </ul>
            <p className={PL}>
              <strong>Belangrik:</strong> Puntr is nie 'n boekmaker nie. Ons aanvaar nie
              weddenskappe direk nie. Alle weddenskapstransaksies vind deur gelisensieerde
              derdeparty-wedoperateurs plaas. Wanneer jy 'n weddenskap deur 'n gekoppelde platform
              plaas, is jy onderhewig aan daardie platform se bepalings en voorwaardes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>5. Betalings en derdeparty-dienste</h2>
            <p className={P}>
              <strong>Betalings vir die jaarpas:</strong> Om 'n jaarpas te bespreek, is gratis op
              Puntr. Ons e-pos 'n veilige PayFast-betaalskakel, en PayFast verwerk die betaling van
              R299 direk. Puntr hou nie betalingsgeld nie, aanvaar nie weddenskappe nie, stel nie
              pryse vas nie en hanteer nie wengeld nie.
            </p>
            <p className={P}>
              <strong>Derdeparty-voorwaardes:</strong> As jy 'n skakel na 'n gelisensieerde
              operateur of kleinhandelaar volg, is jy onderhewig aan daardie maatskappy se
              bepalings, privaatheidsbeleid en betalingsvoorwaardes. Puntr is nie verantwoordelik
              vir hul praktyke, beleide of dienste nie.
            </p>
            <p className={PL}>
              <strong>Geaffilieerde verhoudings:</strong> Puntr kan 'n kommissie verdien wanneer jy
              'n skakel gemerk &quot;Advertensie&quot; gebruik. Skakels is gemerk, en dit verander
              nie wat jy in die rekords sien nie. Slegs gelisensieerde vennote verskyn.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>6. PuntPoints en belonings</h2>
            <p className={P}>
              PuntPoints is 'n lojaliteitskema vir aktiewe lede. Jy verdien dit vir bedrywigheid,
              soos om jou e-pos te bevestig, voorspellings te plaas, 'n voorspelling wat afgehandel
              word en om vriende uit te nooi, nooit vir wen nie en nooit vir die spandeer van geld
              nie. Wat punte verdien, hoeveel en enige daaglikse of maandelikse limiete word op die
              Belonings-bladsy gewys en kan verander. [attorney review]
            </p>
            <p className={P}>
              Begin-take op jou rekeningbladsy gee eenmalige PuntPoints vir stappe soos om jou e-pos
              te bevestig, tweestap-verifikasie aan te skakel, jou profiel te voltooi, jou
              identiteit te verifieer, by Puntr se WhatsApp- of Telegram-gemeenskap aan te sluit,
              opdaterings aan te skakel, die toep te installeer en 'n vriend uit te nooi. Elke taak
              betaal een keer per rekening en eers nadat dit nagegaan is: deur ons stelsels, deur
              jou toestel, of (vir gemeenskapsgroepe) deur ons span wat die naam opsoek wat jy vir
              ons gee. Om Puntr se sosialemediabladsye te volg of daarvan te hou, verdien nooit
              punte nie. Punte vir die aanskakel van opdaterings bly as jy dit later afskakel; jy
              hoef nooit bemarking aan te hou om jou punte te behou nie. Ons kan taakpunte wat met
              vals gebruikersname, meer as een rekening of ander misbruik verkry is, weier of
              terugtrek, en ons kan die take en punte verander. [attorney review]
            </p>
            <p className={P}>
              Oefenmodus, wat voor die bekendstelling vir stigterslede oop is, gebruik 'n fiktiewe
              liga met versinde spanne, uitslae en pryse. Oefenpunte en demo-belonings het geen
              waarde nie, is apart van jou PuntPoints en kan nie omgeskakel, vir iets werkliks
              ingeruil of vir geld omgeruil word nie. Oefenkeuses tel nooit vir jou openbare rekord
              nie. [attorney review]
            </p>
            <p className={P}>
              PuntPoints het geen kontantwaarde nie. Dit kan nie gekoop, verkoop of vir geld
              omgeruil word nie, en dit verander nooit posisies, die ranglys of kwalifikasie vir
              pryse nie. Vanaf die bekendstelling kan jy PuntPoints vanuit jou Beursie aan 'n ander
              lid stuur, binne die limiete wat daar gewys word (tans 10 tot 200 punte op 'n slag,
              200 per dag en 1 000 per maand, vanaf 'n rekening wat ten minste 14 dae oud is). Punte
              wat in die afgelope 7 dae verdien is en punte uit uitnodigings kan nie gestuur word
              nie. Oordragte is finaal. Om PuntPoints te verkoop of te koop, of dit tussen jou eie
              rekeninge te skuif, word nie toegelaat nie, en ons kan oordragte terugtrek en
              rekeninge sluit wat hierdie reël oortree. [attorney review]
            </p>
            <p className={P}>
              Jy kan PuntPoints inruil vir die koopbewyse, geborgde belonings en voordele wat op die
              Belonings-bladsy gelys word, so lank as die voorraad hou. Die katalogus kan
              OTT-koopbewyse, kredietpakke vir betaal soos jy gebruik, gratis Puntr Pro-passe,
              Puntr- en sporthandelsware en wedstrydkaartjies insluit. Belonings kan vanaf die
              bekendstelling op 1 Desember 2026 ingeruil word; tot dan wys die Belonings-bladsy 'n
              voorskou. Puntekoste, voorraad en beskikbaarheid kan verander. Koopbewyse word as
              kodes ge-e-pos; krediete en Pro-tyd word by jou rekening gevoeg; Pro-passe hernu nie
              en word nooit gefaktureer nie; fisiese belonings en kaartjies word slegs na
              Suid-Afrikaanse adresse afgelewer, en ons vra per e-pos vir jou
              afleweringsbesonderhede wanneer jy inruil. Wedstrydkaartjies hang af van
              beskikbaarheid vir die wedstryd wat jy kies en sluit nie reis in nie. Jy moet jou
              identiteit op jou rekeningbladsy verifieer voordat jy enige beloning inruil. Belonings
              word deur Puntr of ons vennote verskaf en is onderhewig aan hul voorwaardes. Nie elke
              beloning is vir elke lid beskikbaar nie: 'n beloning kan 'n bevestigde e-pos vereis,
              en wedkoopbewyse, as ons dit aanbied, is slegs vir lede wat 18 of ouer is en nie op 'n
              blaaskans is nie. Ons kan punte en inruilings wat deur bedrog, misbruik, meer as een
              rekening of 'n fout verkry is, weier of terugtrek, en punte wat deur 'n uitnodiging
              verdien is, kan teruggetrek word as enige van die twee rekeninge kort daarna verwyder
              word. Ons gee 30 dae kennis voordat ons die skema beëindig. Wat op enige tyd
              beskikbaar is, word op die Belonings-bladsy gewys. [attorney review]
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>7. Uitnodigings</h2>
            <p className={P}>
              Lede kan 'n persoonlike uitnodigingskakel deel. Wanneer 'n vriend daardeur aansluit,
              18 of ouer is, hul e-pos bevestig en 'n eerste voorspelling plaas, verdien jy en jou
              vriend elk PuntPoints sodra 'n kort wagtydperk verby is (tans 7 dae). Ons kan ook
              mylpaalbonusse vir verskeie kwalifiserende uitnodigings gee. Puntr betaal geen kontant
              of kommissie vir uitnodigings nie. Uitnodigings wat deur bedrog, gemorspos of vals
              rekeninge geskep is, kan gekanselleer en die rekeninge opgeskort word.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>8. Geen pryse met die bekendstelling nie</h2>
            <p className={P}>
              Die weeklikse ranglys is slegs vir erkenning. Geen pryse of kontant word vir posisies
              op die ranglys aangebied totdat afsonderlike kompetisiereëls gepubliseer word nie.
              Daardie reëls sal sê wie kan deelneem, hoe wenners gekies word en wat toegeken word.
              Belonings wat jy met PuntPoints inruil, is 'n lojaliteitskema, nie 'n prys of
              kompetisie nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>9. Voorspellings, gradering en die openbare rekord</h2>
            <p className={P}>
              Om 'n voorspelling te plaas, moet jou e-posadres bevestig wees. 'n Voorspelling word
              met die afskop gesluit en kan nie gewysig of geskrap word nie. Dit word met jou
              gebruikersnaam gepubliseer en aan die vorige een geketting sodat 'n verandering
              opgespoor kan word; enigiemand kan dit op die verifieer-bladsy nagaan. Uitslae word
              outomaties uit sportdata ingevul. Gestaakte en gekanselleerde wedstryde, en
              uitgestelde wedstryde wat nie binne 72 uur oorgespeel word nie, is nietig. As 'n
              uitslag verkeerd is, stel ons dit reg deur 'n nuwe inskrywing met 'n rede by te voeg;
              vorige inskrywings bly op die rekord.
            </p>
            <p className={P}>
              Eenhede wys hoe 'n voorspelling teen 'n inset van een eenheid gevaar het. Dit is nie
              geld nie, en niks op Puntr sê of suggereer dat enige voorspelling 'n wins sal maak
              nie. Ons kan 'n voorspelling vir die publiek verberg (byvoorbeeld weens misbruik of
              persoonlike inligting); dit bly in die rekord wat gebruik word om die ketting na te
              gaan.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>10. Betaalde opsies (nie te koop nie)</h2>
            <p className={PL}>
              Betaal-soos-jy-gebruik-krediete en Puntr Pro, 'n maandelikse intekening vir gevorderde
              wedders en tipgewers (aanduidend R99 per maand), is nie te koop nie. Krediete, sodra
              dit verkoop word, ontsluit premiumfunksies een gebruik op 'n slag, word in jou Beursie
              gewys, en kan nie aan 'n ander lid gestuur of vir kontant omgeruil word nie. Krediete
              wat ons aan jou gee (byvoorbeeld om 'n funksie te toets) dra geen reg op 'n
              terugbetaling nie. Voordat enigiets verkoop word, sal ons die prys, fakturering,
              kansellasie- en terugbetalingsvoorwaardes publiseer en dit wys voordat jy betaal.
              Betaling sal nooit ekstra punte, 'n hoër posisie of kwalifikasie vir pryse verdien
              nie. [attorney review: subscription terms]
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>11. Gedrag van gebruikers en verbode bedrywighede</h2>
            <p className={P}>Jy stem in om nie:</p>
            <ul className={UL}>
              <li>
                Die Diens vir enige onwettige doel of in stryd met Suid-Afrikaanse wetgewing te
                gebruik nie
              </li>
              <li>
                Inhoud te deel wat aanstootlik of lasterlik is of op ander se regte inbreuk maak nie
              </li>
              <li>
                Voorspellings, pryse of PuntPoints met outomatiese middele of bots te manipuleer nie
              </li>
              <li>
                Meer as een rekening te skep om belonings- of verwysingsprogramme te misbruik nie
              </li>
              <li>Jou as iemand anders voor te doen of vals inligting te verskaf nie</li>
              <li>
                Te probeer om ongemagtigde toegang tot die Diens of ander gebruikers se rekeninge te
                kry nie
              </li>
              <li>Met die werking van die Diens in te meng of dit te ontwrig nie</li>
              <li>Data van die platform af te skraap, te ontgin of in te samel nie</li>
              <li>Dobbelary deur persone onder 18 te deel of aan te moedig nie</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={H}>12. Verantwoordelike dobbelary</h2>
            <p className={P}>
              Puntr is daartoe verbind om verantwoordelike dobbelary te bevorder. Ons moedig alle
              gebruikers aan om:
            </p>
            <ul className={UL}>
              <li>Net te wed wat jy kan bekostig om te verloor</li>
              <li>Nooit verliese na te jaag nie</li>
              <li>Gereeld 'n blaaskans van wed te neem</li>
              <li>Hulp te soek as dobbelary 'n probleem word</li>
            </ul>
            <p className={PL}>
              <strong>Hulpbronne:</strong> Nasionale Program vir Verantwoordelike Dobbelary:{" "}
              <span className="font-semibold">0800 006 008</span> (tolvry)
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>13. Intellektuele eiendom</h2>
            <p className={P}>
              Alle inhoud, funksies en funksionaliteit van die Diens, insluitend maar nie beperk nie
              tot teks, grafika, logo's, ikone, beelde, klankgrepe en sagteware, is die uitsluitlike
              eiendom van Puntr (Edms.) Bpk. en word deur Suid-Afrikaanse en internasionale
              outeursreg-, handelsmerk- en ander wette op intellektuele eiendom beskerm.
            </p>
            <p className={PL}>
              Jy mag nie enige deel van die Diens sonder ons uitdruklike skriftelike toestemming
              reproduseer, versprei, wysig, afgeleide werke daarvan skep of dit uitbuit nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>14. Inhoud deur gebruikers geskep</h2>
            <p className={P}>
              Deur voorspellings, kommentaar of ander inhoud op Puntr te plaas, gee jy ons 'n
              nie-eksklusiewe, wêreldwye, tantièmevrye lisensie om sodanige inhoud in verband met
              die Diens te gebruik, te reproduseer, te wysig en te vertoon.
            </p>
            <p className={PL}>
              Voorspellings is 'n openbare, permanente rekord. Die lisensie geld voort vir die
              geanonimiseerde rekord nadat jy jou rekening geskrap het, soos in ons
              Privaatheidsbeleid beskryf.
            </p>
            <p className={PL}>
              Jy verklaar dat jy alle inhoud wat jy indien, besit of die nodige regte daarop het en
              dat sodanige inhoud nie enige derde party se regte of toepaslike wetgewing skend nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>15. Vrywaring van waarborge</h2>
            <p className={P}>
              DIE DIENS WORD VERSKAF "SOOS DIT IS" EN "SOOS BESKIKBAAR", SONDER WAARBORGE VAN ENIGE
              AARD, HETSY UITDRUKLIK OF STILSWYEND, INSLUITEND MAAR NIE BEPERK NIE TOT WAARBORGE VAN
              VERHANDELBAARHEID, GESKIKTHEID VIR 'N BEPAALDE DOEL OF NIE-INBREUK.
            </p>
            <p className={PL}>
              Puntr waarborg nie dat die Diens ononderbroke, foutloos of veilig sal wees nie. Ons
              waarborg nie die akkuraatheid, volledigheid of betroubaarheid van voorspellings, pryse
              of ander inligting wat verskaf word nie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>16. Beperking van aanspreeklikheid</h2>
            <p className={P}>
              TOT DIE MAKSIMUM MATE WAT SUID-AFRIKAANSE WETGEWING TOELAAT, IS PUNTR (EDMS.) BPK. NIE
              AANSPREEKLIK VIR ENIGE INDIREKTE, TOEVALLIGE, SPESIALE, GEVOLGLIKE OF STRAFSKADE NIE,
              INSLUITEND MAAR NIE BEPERK NIE TOT VERLIES AAN WINS, DATA OF ANDER ONTASBARE VERLIESE
              WAT VOORTSPRUIT UIT:
            </p>
            <ul className={UL}>
              <li>Jou gebruik of onvermoë om die Diens te gebruik</li>
              <li>Weddenskapsverliese wat deur derdeparty-platforms gely word</li>
              <li>Ongemagtigde toegang tot of verandering van jou rekening of data</li>
              <li>Foute of onakkuraathede in pryse, voorspellings of ander inhoud</li>
              <li>Optrede van derdeparty-boekmakers of betalingsverskaffers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className={H}>17. Vrywaring</h2>
            <p className={PL}>
              Jy stem in om Puntr (Edms.) Bpk., sy beamptes, direkteure, werknemers en verbonde
              partye te vrywaar, te verdedig en skadeloos te hou teen enige eise, skade, verliese,
              aanspreeklikhede en uitgawes (insluitend regskoste) wat voortspruit uit jou gebruik
              van die Diens of oortreding van hierdie Bepalings.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>18. Beëindiging</h2>
            <p className={PL}>
              Ons behou die reg voor om jou rekening en toegang tot die Diens na ons uitsluitlike
              goeddunke, sonder kennisgewing, op te skort of te beëindig weens gedrag wat ons meen
              hierdie Bepalings oortree, skadelik vir ander gebruikers is of andersins aanstootlik
              is. Minder ernstig as dit, kan ons jou waarsku, funksies soos die plaas van keuses of
              die stuur van PuntPoints vir 'n tydperk onderbreek, of die rekening vir 'n tydperk
              opskort. Ons laat jou in jou kennisgewings weet, en per e-pos vir waarskuwings waar
              ons dink dit nodig is. [attorney review] Jy kan jou rekening enige tyd vanaf jou
              rekeningbladsy skrap, of deur ons hulpspan te kontak.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>19. Toepaslike reg en geskilbeslegting</h2>
            <p className={P}>
              Hierdie Bepalings word beheer deur en uitgelê volgens die wette van die Republiek van
              Suid-Afrika. Enige geskille wat uit hierdie Bepalings of jou gebruik van die Diens
              voortspruit, is onderhewig aan die uitsluitlike jurisdiksie van die howe van
              Suid-Afrika.
            </p>
          </section>

          <section className="mb-8">
            <h2 className={H}>20. Wysigings aan die Bepalings</h2>
            <p className={PL}>
              Ons kan hierdie Bepalings van tyd tot tyd bywerk. Ons sal jou van wesenlike
              veranderinge in kennis stel deur die bygewerkte Bepalings op ons webwerf te plaas en
              die datum "Laas bygewerk" by te werk. Jou voortgesette gebruik van die Diens ná
              veranderinge beteken dat jy die bygewerkte Bepalings aanvaar.
            </p>
          </section>

          <section>
            <h2 className={H}>21. Kontakbesonderhede</h2>
            <p className={PL}>
              As jy vrae oor hierdie Bepalings het, kontak ons asseblief by:{" "}
              <a href="mailto:support@puntr.co.za" className="font-semibold text-primary">
                support@puntr.co.za
              </a>
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
