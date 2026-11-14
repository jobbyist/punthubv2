/** Shared by Admin > Translations (browser) and its server functions. */

/** Languages that go through review. isiZulu joins when its translation starts. */
export const REVIEW_LOCALES = ["af"] as const;
export type ReviewLocale = (typeof REVIEW_LOCALES)[number];

/**
 * Full legal pages are reviewed page by page. The English page is the route file; the translated page is a
 * separate component so the English wording is never touched. A review is tied to a fingerprint of both files,
 * so editing either one marks the review stale.
 */
export const LEGAL_PAGES = [
  { slug: "terms", path: "/terms", en: "routes/terms.tsx", af: "content/legal/af/terms.tsx" },
  {
    slug: "privacy",
    path: "/privacy",
    en: "routes/privacy.tsx",
    af: "content/legal/af/privacy.tsx",
  },
  {
    slug: "cookies",
    path: "/cookies",
    en: "routes/cookies.tsx",
    af: "content/legal/af/cookies.tsx",
  },
  {
    slug: "refunds",
    path: "/refunds",
    en: "routes/refunds.tsx",
    af: "content/legal/af/refunds.tsx",
  },
  {
    slug: "affiliate-disclosure",
    path: "/affiliate-disclosure",
    en: "routes/affiliate-disclosure.tsx",
    af: "content/legal/af/affiliate-disclosure.tsx",
  },
  {
    slug: "privacy-request",
    path: "/privacy/request",
    en: "routes/privacy_.request.tsx",
    af: "content/legal/af/privacy-request.tsx",
  },
] as const;

export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];

/** Nested locale JSON to dotted keys. Plural forms (key_one, key_other) stay separate keys. */
export function flattenStrings(obj: unknown, prefix = "", out: Record<string, string> = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flattenStrings(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => flattenStrings(v, `${prefix}.${i}`, out));
  } else if (typeof obj === "string") {
    out[prefix] = obj;
  }
  return out;
}

/** Placeholders ({{name}}) and numbered tags (<1>…</1>) a translation must keep. */
export function tokensOf(s: string): string[] {
  return [...(s.match(/\{\{\s*[\w.]+\s*\}\}|<\/?\d+>/g) ?? [])].sort();
}

export function sameTokens(en: string, tr: string): boolean {
  const a = tokensOf(en);
  const b = tokensOf(tr);
  return a.length === b.length && a.every((t, i) => t === b[i]);
}
