import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { LANGUAGE_COOKIE, resolveLocale, type LocaleCode } from "@/locales/config";

function readCookie(header: string | null | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Server-side language: cookie, then Accept-Language, then en-ZA.
 * The profile language (signed-in users) is applied on top of this by the session provider in P6.
 */
export const detectLocale = createServerFn({ method: "GET" }).handler(
  async (): Promise<LocaleCode> => {
    const req = getRequest();
    return resolveLocale({
      cookie: readCookie(req.headers.get("cookie"), LANGUAGE_COOKIE),
      acceptLanguage: req.headers.get("accept-language"),
    });
  },
);

/** Runs in the browser: the cookie is the only source there (an explicit user choice). */
export function detectLocaleOnClient(): LocaleCode {
  return resolveLocale({
    cookie: readCookie(typeof document === "undefined" ? null : document.cookie, LANGUAGE_COOKIE),
    acceptLanguage: typeof navigator === "undefined" ? null : navigator.language,
  });
}

/** Persist an explicit choice. A language preference is a functional cookie the visitor asked for. */
export function writeLanguageCookie(code: LocaleCode) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}
