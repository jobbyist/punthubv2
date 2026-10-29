import { headT } from "@/lib/i18n/head";
import { DEFAULT_LOCALE, matchLocale, type LocaleCode } from "@/locales/config";

/**
 * Emails (OTP, waitlist notice, invite) take a locale and fall back to English for any language that is
 * not enabled or any key that is not translated yet.
 */
export function emailLocale(locale?: string | null): LocaleCode {
  return (locale && matchLocale(locale)) || DEFAULT_LOCALE;
}

export function emailT(locale?: string | null) {
  return headT(emailLocale(locale), "email");
}
