/**
 * Language registry.
 * - `enabled`: offered to everyone. Switch one on only after a native-speaker reviewer has approved it in
 *   Admin > Translations: fill reviewed, reviewedBy and reviewedAt in the same commit.
 * - `preview`: translated and waiting for review. Admins (and anyone holding the preview cookie an admin's
 *   switcher sets) can view the site in it; everyone else keeps English.
 * - `comingSoon`: listed in the switcher with a "Coming soon" badge, not selectable.
 * isiXhosa was removed from the plan (owner, 14 Nov 2026).
 */
export type LocaleCode = "en-ZA" | "af" | "zu";

export type LocaleConfig = {
  code: LocaleCode;
  name: string;
  nativeName: string;
  enabled: boolean;
  preview?: boolean;
  comingSoon?: boolean;
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
    preview: true,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  },
  {
    code: "zu",
    name: "isiZulu",
    nativeName: "isiZulu",
    enabled: false,
    comingSoon: true,
    reviewed: false,
    reviewedBy: null,
    reviewedAt: null,
  },
] as const;

/** Namespaces, one JSON file per language per namespace under src/locales/<code>/. */
export const NAMESPACES = [
  "common",
  "sports",
  "intel",
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
  "founding",
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
  "feedback",
  "newsroom",
  "practice",
  "wallet",
  "quests",
  "pages",
  "matchcard",
  "fixtures",
  "duels",
  "favourites",
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const LANGUAGE_COOKIE = "puntr_lang";
/** Set by an admin's switcher when they pick a language that is still in review. */
export const LANGUAGE_PREVIEW_COOKIE = "puntr_lang_preview";

/** Languages still in review, selectable by admins only. */
export function previewLocales(): LocaleConfig[] {
  return locales.filter((l) => !l.enabled && l.preview);
}

/** Languages shown greyed out with a "Coming soon" badge. */
export function comingSoonLocales(): LocaleConfig[] {
  return locales.filter((l) => !l.enabled && !l.preview && l.comingSoon);
}

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

export function isEnabledLocale(
  code: string | null | undefined,
  allowPreview = false,
): code is LocaleCode {
  if (!code) return false;
  if (enabledLocales().some((l) => l.code === code)) return true;
  return allowPreview && previewLocales().some((l) => l.code === code);
}

/** Map "af-ZA", "zu", "en-GB" etc. onto an enabled locale code, or null. */
export function matchLocale(tag: string, allowPreview = false): LocaleCode | null {
  const lower = tag.toLowerCase();
  if (lower === PSEUDO_LOCALE.toLowerCase())
    return isEnabledLocale(PSEUDO_LOCALE) ? (PSEUDO_LOCALE as LocaleCode) : null;
  // Exact match first, then match on the base language, so "en-GB" and "en" resolve to en-ZA.
  const baseOf = (tag: string) => tag.toLowerCase().split("-")[0];
  const found =
    locales.find((l) => l.code.toLowerCase() === lower) ??
    locales.find((l) => baseOf(l.code) === baseOf(lower));
  return found && isEnabledLocale(found.code, allowPreview) ? found.code : null;
}

/** Profile language, then cookie, then Accept-Language, then the default. */
export function resolveLocale(opts: {
  profile?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
  /** True when the preview cookie is present: an explicit choice of a language still in review. */
  preview?: boolean;
}): LocaleCode {
  // A language in review is honoured only as an explicit choice (cookie), never from Accept-Language.
  const explicit = opts.cookie ? matchLocale(opts.cookie, !!opts.preview) : null;
  const profileHit = opts.profile ? matchLocale(opts.profile) : null;
  if (profileHit) return profileHit;
  if (explicit) return explicit;
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
