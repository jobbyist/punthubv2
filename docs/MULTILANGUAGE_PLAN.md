# Multi-language plan (next session)

## Already in place
- Registry `src/locales/config.ts`: en-ZA enabled; af, zu, xh present but `enabled: false, reviewed: false`.
- `LanguageSwitcher` is already rendered in the footer, the account page and the mobile menu. It shows only when two or more languages are enabled and saves the choice to `profiles.language` for signed-in members.
- 37 en-ZA namespaces (about 150 KB of JSON), `scripts/i18n-check.ts`, a dev pseudo-locale, `src/lib/i18n/head.ts` for SEO titles.

## Work for the session
1. Decide the first language(s): Afrikaans, isiZulu, isiXhosa (owner). Recommend one at a time, starting with the namespaces members see first: `common`, `nav`, `home`, `auth`, `account`, `founding`, `rg` (responsible gambling), `consent`.
2. Machine-translate drafts (Gemini free tier, router already in `src/lib/content`; no personal data, only UI strings) into `src/locales/<code>/`, keeping `{{placeholders}}` and ICU plurals; run `scripts/i18n-check.ts` for missing keys and placeholder mismatches.
3. Legal pages (`terms`, `privacy`, `cookies`, `refunds`, `affiliate-disclosure`) stay English-only with a notice until counsel approves a translation. The responsible-gambling notice and the 0800 006 008 helpline must be present and correct in every language.
4. A native-speaker reviewer approves each language: fill `reviewed`, `reviewedBy`, `reviewedAt` and set `enabled: true` in the same commit (existing rule).
5. Account: the picker exists; add a "language of emails" choice only if emails are translated (auth, founding, outbox templates are English today). Until then say so next to the picker.
6. SEO: `hreflang` alternates and `<html lang>`; keep canonical URLs unchanged (no locale prefix) unless the owner wants `/af/...` routes.
7. Admin and newsroom stay English. Money via `money()`, odds via `odds()`, dates via `src/lib/format.ts` in every locale.
8. QA: pseudo-locale pass for overflow (mobile cards, nav, footer shuffler), then each language on a phone.

## Legal
Any translated string that changes what is promised needs the same legal-changelog entry as English. Mark translated legal summaries `[attorney review]`.
