/**
 * Language registry. A language appears in the switcher only when `enabled` is true.
 * Switch one on once a native-speaker reviewer has approved it: fill reviewed, reviewedBy
 * and reviewedAt in the same commit.
 */
export type LocaleCode = "en-ZA" | "af" | "zu" | "xh";

export type LocaleConfig = {
  code: LocaleCode;
  name: string;
  nativeName: string;
  enabled: boolean;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

export const DEFAULT_LOCALE: LocaleCode = "en-ZA";

/** Dev-only pseudo-locale: accented and about 30% longer. Never shipped, never selectable in production. */
export const PSEUDO_LOCALE = "en-XA";

export const locales: readonly LocaleConfig[] = [
  {
    code: "en-ZA",
    name: "English (South Africa)",
    nativeName: "English (South Africa)",
    enabled: true,
    reviewed: true,
    reviewedBy: "Puntr",
    reviewedAt: "2026-10-30",
  },
  {
    code: "af",
    name: "Afrikaans",
    nativeName: "Afrikaans",
    enabled: false,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    code: "zu",
    name: "isiZulu",
    nativeName: "isiZulu",
    enabled: false,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    code: "xh",
    name: "isiXhosa",
    nativeName: "isiXhosa",
    enabled: false,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  },
] as const;

/** Namespaces, one JSON file per language per namespace under src/locales/<code>/. */
export const NAMESPACES = [
  "common",
  "nav",
  "home",
  "predictions",
  "match",
  "rg",
  "auth",
  "security",
  "rewards",
  "consent",
  "privacy-summary",
  "legal-summary",
  "roadmap",
  "support",
  "affiliate",
  "payments",
  "errors",
  "howitworks",
  "pricing",
  "community",
  "leaderboards",
  "results",
  "insights",
  "about",
  "comingsoon",
  "email",
  "account",
  "admin",
  "verify",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const LANGUAGE_COOKIE = "puntr_lang";

export function enabledLocales(dev = import.meta.env?.DEV ?? false): LocaleConfig[] {
  const list = locales.filter((l) => l.enabled);
  return dev
    ? [
        ...list,
        {
          code: PSEUDO_LOCALE as LocaleCode,
          name: "Pseudo (dev)",
          nativeName: "Pseudo (dev)",
          enabled: true,
          reviewed: false,
          reviewedBy: null,
          reviewedAt: null,
        },
      ]
    : list;
}

export function isEnabledLocale(code: string | null | undefined): code is LocaleCode {
  return !!code && enabledLocales().some((l) => l.code === code);
}

/** Map "af-ZA", "zu", "en-GB" etc. onto an enabled locale code, or null. */
export function matchLocale(tag: string): LocaleCode | null {
  const lower = tag.toLowerCase();
  if (lower === PSEUDO_LOCALE.toLowerCase())
    return isEnabledLocale(PSEUDO_LOCALE) ? (PSEUDO_LOCALE as LocaleCode) : null;
  // Exact match first, then match on the base language, so "en-GB" and "en" resolve to en-ZA.
  const baseOf = (tag: string) => tag.toLowerCase().split("-")[0];
  const found =
    locales.find((l) => l.code.toLowerCase() === lower) ??
    locales.find((l) => baseOf(l.code) === baseOf(lower));
  return found && isEnabledLocale(found.code) ? found.code : null;
}

/** Profile language, then cookie, then Accept-Language, then the default. */
export function resolveLocale(opts: {
  profile?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): LocaleCode {
  for (const candidate of [opts.profile, opts.cookie]) {
    const hit = candidate ? matchLocale(candidate) : null;
    if (hit) return hit;
  }
  if (opts.acceptLanguage) {
    const tags = opts.acceptLanguage
      .split(",")
      .map((part) => {
        const [tag = "", q] = part.trim().split(";q=");
        return { tag: tag.trim(), q: q ? Number(q) : 1 };
      })
      .filter((t) => t.tag && Number.isFinite(t.q))
      .sort((a, b) => b.q - a.q);
    for (const { tag } of tags) {
      const hit = matchLocale(tag);
      if (hit) return hit;
    }
  }
  return DEFAULT_LOCALE;
}
