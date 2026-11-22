/**
 * Afrikaans translation of /privacy. The English route file is the version that applies; keep this in step with
 * it (Admin > Translations marks the review stale when either file changes). Version shown: 2026-11-22-r21.
 */
import { Link } from "@tanstack/react-router";

import { AppShell, PageHeading } from "@/components/layout/app-shell";
import { LegalTranslationNotice } from "@/components/legal-translation-notice";

const PURPOSES: [string, string, string, string][] = [
  [
    "VroeÃ«-toegangslys",
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
    "Jou rekening se e-posadres, rekening-ID en registrasi¶»§q«^