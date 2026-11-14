# Multi-language plan

## Status (14 Nov 2026)
- **Afrikaans: translated, in review.** Every public section (36 namespaces plus `pages`) and all six legal pages have an Afrikaans draft (`src/locales/af/`, `src/content/legal/af/`). Admin text stays English. Translation was done in-session, using none of the Gemini quota.
- **Review happens in Admin > Translations**: English and Afrikaans side by side, approve or suggest wording per string, approve a whole section, legal pages page by page (open English / open translated), then a named sign-off. Decisions live in `translation_reviews` and `translation_signoffs` (migration `20261114050000_translation_reviews.sql`); a review goes stale automatically if either the English or the translated text changes afterwards.
- **Who sees it:** admins can pick "Afrikaans · In review" in the language selector (sets the `puntr_lang_preview` cookie); everyone else stays on English. After the sign-off, copy any suggested wording into the repo and set `enabled: true`, `reviewed`, `reviewedBy`, `reviewedAt` for `af` in `src/locales/config.ts` in one commit.
- **Legal pages are translated (owner decision, 14 Nov 2026)** with a notice that the English version applies if the two differ. `[attorney review]`: counsel should confirm the translated legal pages and the precedence notice.
- **isiZulu:** listed in the selector with a "Coming soon" badge. Revisit scheduled for Fri 20 Nov 2026, 11:00 SAST.
- **isiXhosa:** removed from the plan (owner, 14 Nov 2026).

## Before Afrikaans goes live for everyone
1. Native-speaker review and sign-off in Admin > Translations.
2. Translate weekday and month names in dates. `src/lib/format.ts` formats dates in English for every language and is called from 37 files without the visitor's language; it needs a locale-aware hook (`useFormat()`) so server and browser render the same text. Until then dates read "Sat 21 Nov 2026" on Afrikaans pages.
3. Emails stay English (auth, founding, outbox templates). Say so next to the picker, or translate them.
4. `hreflang` alternates and `<html lang>` (already set from the resolved language); canonical URLs stay without a locale prefix.

## Translating future copy
- Any new English key needs its Afrikaans twin: `src/lib/translations.test.ts` fails if a key or placeholder is missing.
- Options that do not use the content engine's Gemini quota (checked 14 Nov 2026): translate in a Claude session (no API cost, used for the first draft); Microsoft Translator (free tier of 2 million characters a month); Google Cloud Translation (first 500,000 characters a month free, as a monthly credit); DeepL API Free (Afrikaans and isiZulu are listed among its languages). All cover Afrikaans and isiZulu. Machine output is always a draft for the native-speaker review.

## Legal
Any translated string that changes what is promised needs the same legal-changelog entry as English. Translated legal pages are `[attorney review]`.
