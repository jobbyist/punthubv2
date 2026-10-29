import type { i18n as I18n } from "i18next";

import { createI18n } from "@/lib/i18n";
import { DEFAULT_LOCALE, type LocaleCode, type Namespace } from "@/locales/config";

const cache = new Map<string, I18n>();

/** Translator for route head() metadata, which renders outside React. */
export function headT(locale: LocaleCode | undefined, ns: Namespace) {
  const code = locale ?? DEFAULT_LOCALE;
  let instance = cache.get(code);
  if (!instance) {
    instance = createI18n(code);
    cache.set(code, instance);
  }
  return instance.getFixedT(code, ns);
}
