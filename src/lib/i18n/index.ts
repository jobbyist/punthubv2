import i18next, { type i18n as I18n } from "i18next";
import { initReactI18next } from "react-i18next";

import {
  DEFAULT_LOCALE,
  NAMESPACES,
  PSEUDO_LOCALE,
  locales,
  type LocaleCode,
} from "@/locales/config";
import { pseudolocalise } from "./pseudo";

type Bundle = Record<string, unknown>;

// Every locale bundle is imported eagerly so server and client render the same text on first paint.
// Missing keys in af/zu/xh fall back to en-ZA key by key.
const files = import.meta.glob("../../locales/*/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Bundle>;

function bundlesFor(code: string): Record<string, Bundle> {
  const out: Record<string, Bundle> = {};
  for (const [path, json] of Object.entries(files)) {
    const m = path.match(/locales\/([^/]+)\/([^/]+)\.json$/);
    if (m && m[1] === code && m[2]) out[m[2]] = json;
  }
  return out;
}

export function buildResources() {
  const resources: Record<string, Record<string, Bundle>> = {};
  for (const l of locales) resources[l.code] = bundlesFor(l.code);
  if (import.meta.env.DEV) {
    const base = resources[DEFAULT_LOCALE] ?? {};
    resources[PSEUDO_LOCALE] = Object.fromEntries(
      Object.entries(base).map(([ns, json]) => [ns, pseudolocalise(json) as Bundle]),
    );
  }
  return resources;
}

/** A fresh instance per request on the server so concurrent requests never share a language. */
export function createI18n(lng: LocaleCode): I18n {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng,
    fallbackLng: DEFAULT_LOCALE,
    ns: [...NAMESPACES],
    defaultNS: "common",
    resources: buildResources(),
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
    react: { useSuspense: false },
  });
  return instance;
}
